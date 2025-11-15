import { NextRequest, NextResponse } from 'next/server';
import { getVersionInfo, checkForUpdates } from '@/lib/version';

/**
 * Version API Endpoint
 * Returns current application version information
 *
 * Query params:
 *  - checkUpdate=true : Also check GitHub for newer version (adds ~1s latency)
 */
export async function GET(request: NextRequest) {
  try {
    const versionInfo = getVersionInfo();

    // Check if client wants to check for updates
    const searchParams = request.nextUrl.searchParams;
    const shouldCheckUpdate = searchParams.get('checkUpdate') === 'true';

    let updateInfo = null;
    if (shouldCheckUpdate) {
      updateInfo = await checkForUpdates();
    }

    return NextResponse.json({
      success: true,
      ...versionInfo,
      updateCheck: updateInfo,
    });
  } catch (error: any) {
    console.error('[API] Version error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get version information',
        version: '1.0.0',
        commit: 'unknown',
        commitFull: 'unknown',
        branch: 'unknown',
        buildDate: new Date().toISOString(),
        isDirty: false,
        storagePath: 'unknown',
        securePath: 'unknown',
      },
      { status: 500 }
    );
  }
}
