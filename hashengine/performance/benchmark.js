/**
 * HashEngine Performance Benchmark
 * Tests various batch sizes and measures throughput
 */

const http = require('http');

const HASH_SERVER_URL = 'http://127.0.0.1:9001';

// Test configuration
const TEST_CONFIG = {
  no_pre_mine: '0'.repeat(64), // Test challenge
  ashConfig: {
    nbLoops: 8,
    nbInstrs: 256,
    pre_size: 16384,
    rom_size: 131072,
    mixing_numbers: 16,
  },
  batchSizes: [1, 10, 50, 100, 200, 500, 1000],
  iterationsPerBatch: 5,
};

// Generate test preimages
function generatePreimages(count) {
  const preimages = [];
  for (let i = 0; i < count; i++) {
    const nonce = i.toString(16).padStart(16, '0');
    const address = 'addr1qyy57f9p0d5c8gzgw4nlyppggy6v5qjhl2lhjnfwgt7t9nvngsz9hwd7pgsa03dqk3pfnmcqfp4lz76w9mxxxc3ueehsu2gt4f';
    const challenge = TEST_CONFIG.no_pre_mine;
    const preimage = `${nonce}${address}${challenge}`;
    preimages.push(preimage);
  }
  return preimages;
}

// Make HTTP POST request
function httpPost(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: '127.0.0.1',
      port: 9001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Initialize ROM
async function initializeROM() {
  console.log('Initializing ROM...');
  const start = Date.now();

  await httpPost('/init', TEST_CONFIG);

  const elapsed = Date.now() - start;
  console.log(`✓ ROM initialized in ${elapsed}ms\n`);
  return elapsed;
}

// Benchmark batch hash operation
async function benchmarkBatch(batchSize, iterations) {
  const preimages = generatePreimages(batchSize);
  const timings = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await httpPost('/hash-batch', { preimages });

    const elapsed = Date.now() - start;
    timings.push(elapsed);
  }

  // Calculate statistics
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const min = Math.min(...timings);
  const max = Math.max(...timings);
  const median = timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)];

  const hashesPerSecond = (batchSize / avg) * 1000;

  return { avg, min, max, median, hashesPerSecond, timings };
}

// Run single-hash benchmark
async function benchmarkSingleHash(iterations) {
  const preimage = generatePreimages(1)[0];
  const timings = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await httpPost('/hash', { preimage });

    const elapsed = Date.now() - start;
    timings.push(elapsed);
  }

  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const min = Math.min(...timings);
  const max = Math.max(...timings);

  return { avg, min, max, hashesPerSecond: 1000 / avg };
}

// Format number with commas
function formatNumber(num) {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Print results table
function printResults(results) {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        HASHENGINE PERFORMANCE BENCHMARK                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('ROM Initialization:');
  console.log(`  Time: ${results.romInitTime}ms\n`);

  console.log('Single Hash Performance:');
  console.log(`  Average: ${results.singleHash.avg.toFixed(2)}ms`);
  console.log(`  Min: ${results.singleHash.min}ms | Max: ${results.singleHash.max}ms`);
  console.log(`  Throughput: ${formatNumber(results.singleHash.hashesPerSecond)} H/s\n`);

  console.log('╔═════════╦═══════════╦═══════════╦═══════════╦═══════════╦═══════════════════╗');
  console.log('║  Batch  ║    Avg    ║    Min    ║    Max    ║  Median   ║    Throughput     ║');
  console.log('║  Size   ║   (ms)    ║   (ms)    ║   (ms)    ║   (ms)    ║      (H/s)        ║');
  console.log('╠═════════╬═══════════╬═══════════╬═══════════╬═══════════╬═══════════════════╣');

  results.batches.forEach(result => {
    console.log(
      `║ ${result.batchSize.toString().padStart(7)} ║ ` +
      `${result.avg.toFixed(2).padStart(9)} ║ ` +
      `${result.min.toString().padStart(9)} ║ ` +
      `${result.max.toString().padStart(9)} ║ ` +
      `${result.median.toString().padStart(9)} ║ ` +
      `${formatNumber(result.hashesPerSecond).padStart(17)} ║`
    );
  });

  console.log('╚═════════╩═══════════╩═══════════╩═══════════╩═══════════╩═══════════════════╝\n');

  // Find best throughput
  const bestBatch = results.batches.reduce((best, current) =>
    current.hashesPerSecond > best.hashesPerSecond ? current : best
  );

  console.log('Summary:');
  console.log(`  Best throughput: ${formatNumber(bestBatch.hashesPerSecond)} H/s (batch size: ${bestBatch.batchSize})`);
  console.log(`  ROM init time: ${results.romInitTime}ms`);
  console.log(`  Total benchmark time: ${((Date.now() - results.startTime) / 1000).toFixed(2)}s\n`);
}

// Save results to file
function saveResults(results, filename) {
  const fs = require('fs');
  const timestamp = new Date().toISOString();

  const data = {
    timestamp,
    ...results,
    systemInfo: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpus: require('os').cpus().length,
    }
  };

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Results saved to: ${filename}`);
}

// Main benchmark function
async function runBenchmark() {
  console.clear();
  console.log('Starting HashEngine Performance Benchmark...\n');

  const results = {
    startTime: Date.now(),
    romInitTime: 0,
    singleHash: null,
    batches: [],
  };

  try {
    // Initialize ROM
    results.romInitTime = await initializeROM();

    // Benchmark single hash
    console.log('Benchmarking single hash operations...');
    results.singleHash = await benchmarkSingleHash(10);
    console.log(`✓ Single hash: ${results.singleHash.avg.toFixed(2)}ms avg\n`);

    // Benchmark batch operations
    for (const batchSize of TEST_CONFIG.batchSizes) {
      console.log(`Benchmarking batch size ${batchSize}... (${TEST_CONFIG.iterationsPerBatch} iterations)`);

      const batchResult = await benchmarkBatch(batchSize, TEST_CONFIG.iterationsPerBatch);

      results.batches.push({
        batchSize,
        ...batchResult,
      });

      console.log(`  Avg: ${batchResult.avg.toFixed(2)}ms | Throughput: ${formatNumber(batchResult.hashesPerSecond)} H/s`);
    }

    // Print and save results
    printResults(results);

    const filename = `benchmark-results-${Date.now()}.json`;
    saveResults(results, filename);

  } catch (error) {
    console.error('Benchmark failed:', error.message);
    console.error('\nMake sure the hash server is running on http://127.0.0.1:9001');
    console.error('Start it with: cd hashengine && cargo run --release --bin hash-server');
    process.exit(1);
  }
}

// Run benchmark
if (require.main === module) {
  runBenchmark().then(() => {
    console.log('Benchmark complete!');
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runBenchmark, benchmarkBatch, initializeROM };
