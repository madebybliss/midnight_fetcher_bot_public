/**
 * Version Information
 * Automatically extracts version from git commit hash and storage locations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export interface VersionInfo {
  version: string;      // Semantic version from package.json
  commit: string;       // Git commit hash (short)
  commitFull: string;   // Git commit hash (full)
  branch: string;       // Git branch name
  buildDate: string;    // When this build was created
  isDirty: boolean;     // Whether there are uncommitted changes
  storagePath: string;  // Where storage files are located
  securePath: string;   // Where secure files are located
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latestCommit: string;
  currentCommit: string;
  commitsBehind: number;
  error?: string;
}

let cachedVersion: VersionInfo | null = null;

/**
 * Get version information
 * Caches result for performance
 */
export function getVersionInfo(): VersionInfo {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Get package.json version
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version || '1.0.0';

    // Get git commit hash (short)
    let commit = 'unknown';
    let commitFull = 'unknown';
    let branch = 'unknown';
    let isDirty = false;

    try {
      // Get short commit hash
      commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

      // Get full commit hash
      commitFull = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

      // Get current branch
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

      // Check if there are uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      isDirty = status.length > 0;
    } catch (error) {
      // Git not available or not a git repo - use fallback
      console.warn('[Version] Git not available, using fallback version info');
    }

    // Detect storage paths (same logic as receipts-logger.ts and devfee manager.ts)
    const oldStorageDir = path.join(process.cwd(), 'storage');
    const oldSecureDir = path.join(process.cwd(), 'secure');
    const newDataDir = path.join(
      process.env.USERPROFILE || process.env.HOME || process.cwd(),
      'Documents',
      'MidnightFetcherBot'
    );

    let storagePath: string;
    let securePath: string;

    // Check if receipts exist in old location (installation folder)
    const oldReceiptsFile = path.join(oldStorageDir, 'receipts.jsonl');
    const oldDevFeeCache = path.join(oldSecureDir, '.devfee_cache.json');

    if (fs.existsSync(oldReceiptsFile)) {
      storagePath = oldStorageDir;
    } else {
      storagePath = path.join(newDataDir, 'storage');
    }

    if (fs.existsSync(oldDevFeeCache)) {
      securePath = oldSecureDir;
    } else {
      securePath = path.join(newDataDir, 'secure');
    }

    cachedVersion = {
      version,
      commit: isDirty ? `${commit}-dirty` : commit,
      commitFull,
      branch,
      buildDate: new Date().toISOString(),
      isDirty,
      storagePath,
      securePath,
    };

    return cachedVersion;
  } catch (error) {
    console.error('[Version] Failed to get version info:', error);

    // Fallback version
    return {
      version: '1.0.0',
      commit: 'unknown',
      commitFull: 'unknown',
      branch: 'unknown',
      buildDate: new Date().toISOString(),
      isDirty: false,
      storagePath: 'unknown',
      securePath: 'unknown',
    };
  }
}

/**
 * Get formatted version string for display
 * Format: v1.0.0-abc1234 (main)
 */
export function getVersionString(): string {
  const info = getVersionInfo();
  return `v${info.version}-${info.commit} (${info.branch})`;
}

/**
 * Get detailed version string with build date
 */
export function getDetailedVersionString(): string {
  const info = getVersionInfo();
  const buildDate = new Date(info.buildDate).toLocaleString();
  return `v${info.version}-${info.commit} | ${info.branch} | Built: ${buildDate}`;
}

/**
 * Check if there's a newer version available on GitHub
 * Compares current commit with latest commit on the branch
 * Low overhead - only makes API call when requested
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const versionInfo = getVersionInfo();
  const currentCommit = versionInfo.commitFull;
  const branch = versionInfo.branch;

  // If we don't have git info, can't check for updates
  if (currentCommit === 'unknown' || branch === 'unknown') {
    return {
      updateAvailable: false,
      latestCommit: 'unknown',
      currentCommit: 'unknown',
      commitsBehind: 0,
      error: 'Git information not available',
    };
  }

  try {
    // Get latest commit from GitHub API
    // Using public API endpoint - no auth required for public repos
    const apiUrl = `https://api.github.com/repos/ADA-Markets/midnight_fetcher_bot_public/commits/${branch}`;

    const response = await axios.get(apiUrl, {
      timeout: 5000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Midnight-Fetcher-Bot',
      },
    });

    const latestCommit = response.data.sha;
    const latestCommitShort = latestCommit.substring(0, 7);

    // Check if we're behind
    const updateAvailable = currentCommit !== latestCommit;

    // Try to get commit count difference (optional - may fail)
    let commitsBehind = 0;
    if (updateAvailable) {
      try {
        const compareUrl = `https://api.github.com/repos/ADA-Markets/midnight_fetcher_bot_public/compare/${currentCommit}...${latestCommit}`;
        const compareResponse = await axios.get(compareUrl, {
          timeout: 5000,
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Midnight-Fetcher-Bot',
          },
        });
        commitsBehind = compareResponse.data.ahead_by || 0;
      } catch (error) {
        // If compare fails, just show that update is available without count
        commitsBehind = -1; // -1 means "unknown"
      }
    }

    return {
      updateAvailable,
      latestCommit: latestCommitShort,
      currentCommit: versionInfo.commit,
      commitsBehind,
    };

  } catch (error: any) {
    console.error('[Version] Failed to check for updates:', error.message);
    return {
      updateAvailable: false,
      latestCommit: 'unknown',
      currentCommit: versionInfo.commit,
      commitsBehind: 0,
      error: `Failed to check GitHub: ${error.message}`,
    };
  }
}
