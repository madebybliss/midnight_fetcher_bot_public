#!/usr/bin/env node

/**
 * HashEngine Performance Comparison Tool
 * Compares two benchmark results and shows improvement/regression
 */

const fs = require('fs');
const path = require('path');

function loadBenchmarkResults(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error loading ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

function calculateImprovement(before, after) {
  if (before === 0) return 0;
  return ((after - before) / before) * 100;
}

function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatNumber(num) {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function main() {
  if (process.argv.length < 4) {
    console.log('Usage: node compare-performance.js <baseline.json> <optimized.json>');
    console.log('');
    console.log('Example:');
    console.log('  node compare-performance.js baseline.json optimized.json');
    process.exit(1);
  }

  const baselineFile = process.argv[2];
  const optimizedFile = process.argv[3];

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('         HashEngine Performance Comparison');
  console.log('════════════════════════════════════════════════════════════\n');

  const baseline = loadBenchmarkResults(baselineFile);
  const optimized = loadBenchmarkResults(optimizedFile);

  console.log(`📊 Baseline:  ${path.basename(baselineFile)}`);
  console.log(`   Timestamp: ${baseline.timestamp}`);
  console.log('');
  console.log(`🚀 Optimized: ${path.basename(optimizedFile)}`);
  console.log(`   Timestamp: ${optimized.timestamp}`);
  console.log('');

  // ROM Initialization Comparison
  console.log('════════════════════════════════════════════════════════════');
  console.log('ROM Initialization Time');
  console.log('════════════════════════════════════════════════════════════');
  const romImprovement = calculateImprovement(baseline.romInitTime, optimized.romInitTime);
  const romIndicator = romImprovement < 0 ? '🚀' : '⚠️';
  console.log(`Baseline:  ${baseline.romInitTime}ms`);
  console.log(`Optimized: ${optimized.romInitTime}ms`);
  console.log(`Change:    ${romIndicator} ${formatPercent(romImprovement)}`);
  console.log('');

  // Single Hash Comparison
  console.log('════════════════════════════════════════════════════════════');
  console.log('Single Hash Performance');
  console.log('════════════════════════════════════════════════════════════');
  const singleHashImprovement = calculateImprovement(
    baseline.singleHash.hashesPerSecond,
    optimized.singleHash.hashesPerSecond
  );
  const singleHashIndicator = singleHashImprovement > 0 ? '🚀' : '⚠️';
  console.log(`Baseline:  ${formatNumber(baseline.singleHash.hashesPerSecond)} H/s`);
  console.log(`Optimized: ${formatNumber(optimized.singleHash.hashesPerSecond)} H/s`);
  console.log(`Change:    ${singleHashIndicator} ${formatPercent(singleHashImprovement)}`);
  console.log('');

  // Batch Performance Comparison
  console.log('════════════════════════════════════════════════════════════');
  console.log('Batch Processing Performance');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  console.log('╔═════════╦═══════════════════╦═══════════════════╦═══════════════════════════╗');
  console.log('║  Batch  ║  Baseline (H/s)   ║  Optimized (H/s)  ║      Improvement          ║');
  console.log('║  Size   ║                   ║                   ║                           ║');
  console.log('╠═════════╬═══════════════════╬═══════════════════╬═══════════════════════════╣');

  let totalImprovement = 0;
  let maxImprovement = -Infinity;
  let minImprovement = Infinity;

  baseline.batches.forEach((baselineBatch, index) => {
    const optimizedBatch = optimized.batches[index];
    if (!optimizedBatch || baselineBatch.batchSize !== optimizedBatch.batchSize) {
      console.error(`Batch size mismatch at index ${index}`);
      return;
    }

    const improvement = calculateImprovement(
      baselineBatch.hashesPerSecond,
      optimizedBatch.hashesPerSecond
    );

    totalImprovement += improvement;
    maxImprovement = Math.max(maxImprovement, improvement);
    minImprovement = Math.min(minImprovement, improvement);

    const indicator = improvement > 0 ? '🚀' : improvement < 0 ? '⚠️' : '➖';
    const improvementStr = formatPercent(improvement);

    console.log(
      `║ ${String(baselineBatch.batchSize).padStart(7)} ║ ` +
      `${formatNumber(baselineBatch.hashesPerSecond).padStart(17)} ║ ` +
      `${formatNumber(optimizedBatch.hashesPerSecond).padStart(17)} ║ ` +
      `${indicator} ${improvementStr.padStart(20)} ║`
    );
  });

  console.log('╚═════════╩═══════════════════╩═══════════════════╩═══════════════════════════╝');
  console.log('');

  // Summary Statistics
  const avgImprovement = totalImprovement / baseline.batches.length;
  console.log('════════════════════════════════════════════════════════════');
  console.log('Summary');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Average batch improvement: ${formatPercent(avgImprovement)}`);
  console.log(`Peak improvement:          ${formatPercent(maxImprovement)}`);
  console.log(`Minimum improvement:       ${formatPercent(minImprovement)}`);
  console.log('');

  // Overall Assessment
  if (avgImprovement > 10) {
    console.log('✅ EXCELLENT: Significant performance improvement detected!');
    console.log('   Recommended to deploy optimizations to production.');
  } else if (avgImprovement > 5) {
    console.log('✅ GOOD: Moderate performance improvement detected.');
    console.log('   Consider deploying after validation testing.');
  } else if (avgImprovement > 0) {
    console.log('⚠️  MARGINAL: Minor performance improvement.');
    console.log('   Benefits may not justify the complexity of optimizations.');
  } else if (avgImprovement > -5) {
    console.log('⚠️  WARNING: Performance regression detected!');
    console.log('   Review optimization settings and system state.');
  } else {
    console.log('❌ CRITICAL: Significant performance regression!');
    console.log('   DO NOT deploy. Investigate optimization issues.');
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(avgImprovement >= 0 ? 0 : 1);
}

main();
