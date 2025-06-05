import assert from 'assert'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import indexModule from '../src/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Testing main module functionality...')

// Create a temp directory for testing
const tempDir = join(tmpdir(), `index-test-${Date.now()}`)
mkdirSync(tempDir, { recursive: true })
mkdirSync(join(tempDir, 'node_modules', 'test-dep1'), { recursive: true })
mkdirSync(join(tempDir, 'node_modules', 'test-dep2'), { recursive: true })
mkdirSync(join(tempDir, 'node_modules', 'test-dev-dep'), { recursive: true })

// Create test package.json files
const rootPkg = {
  name: 'test-project',
  dependencies: {
    'test-dep1': '1.0.0',
    'test-dep2': '2.0.0'
  },
  devDependencies: {
    'test-dev-dep': '3.0.0'
  },
  engines: {
    node: '>=14.0.0'
  }
}

// Mock package.json content for a dependency with a specific engines constraint
const dep1Pkg = {
  name: 'test-dep1',
  version: '1.0.0',
  engines: {
    node: '>=14.0.0 <16.0.0'
  }
}

// Mock package.json content for another dependency with a different engines constraint
const dep2Pkg = {
  name: 'test-dep2',
  version: '2.0.0',
  engines: {
    node: '>=12.0.0'
  }
}

// Mock package.json content for a dev dependency with a higher engines constraint
const devDepPkg = {
  name: 'test-dev-dep',
  version: '3.0.0',
  engines: {
    node: '>=16.0.0'
  }
}

// Write the mock package.json files to the temporary directory structure
writeFileSync(join(tempDir, 'package.json'), JSON.stringify(rootPkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dep1', 'package.json'), JSON.stringify(dep1Pkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dep2', 'package.json'), JSON.stringify(dep2Pkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dev-dep', 'package.json'), JSON.stringify(devDepPkg, null, 2))

// Mock console.log for capturing JSON output
const originalConsoleLog = console.log
let capturedOutput = []

// Setup function to mock console.log and capture output
function setupMocks() {
  capturedOutput = []
  console.log = (message) => { capturedOutput.push(message) }
}

function restoreMocks() {
  console.log = originalConsoleLog
}

console.log('Testing main function with various parameters...')

// Test case 1: Default behavior (including dev dependencies) with JSON output.
// Verifies that the script correctly identifies the minimum Node.js version,
// which should be dictated by the dev dependency's requirement (>=16.0.0).
// Test with default parameters (include dev deps)
await (async () => {
  setupMocks()
  await indexModule.calculateCompatibility({ // Added await
    projectPath: tempDir,
    json: true,
    verbose: false,
    noExit: true, // Added noExit for tests not checking exit behavior
    maxRetries: 0
  })

  let result1Json
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    result1Json = JSON.parse(capturedOutput[i])
    break;
  } catch (e) { /* Not JSON, try previous */ }
}
assert(result1Json, 'Should output result in JSON format')
const result1 = result1Json;
  // root: >=14 (14.0.0)
  // dep1: >=14 <16 (14.0.0, 16.0.0-0)
  // dep2: >=12 (12.0.0)
  // devDep: >=16 (16.0.0)
  // Combined: min from (14, 14, 12, 16) = 16.0.0. Max from (null, 16.0.0-0, null, null) = 16.0.0-0
  // Result: globalMin = 16.0.0, globalMax = 16.0.0-0. This IS a conflict.
  assert.strictEqual(result1.globalMin, '16.0.0', 'Test Case 1: globalMin should be 16.0.0')
  assert.strictEqual(result1.globalMax, '16.0.0-0', 'Test Case 1: globalMax should be 16.0.0-0')
  assert.strictEqual(result1.conflict, true, 'Test Case 1: Should detect conflict for >=16 and <16')
  restoreMocks()
})();

// Test case 2: Excluding dev dependencies (`noDev=true`) with JSON output.
await (async () => {
  setupMocks()
  await indexModule.calculateCompatibility({ // Added await
    projectPath: tempDir,
    json: true,
    noDev: true,
    noExit: true, // Added noExit
    maxRetries: 0
  })
  let result2Json
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    result2Json = JSON.parse(capturedOutput[i])
    break;
  } catch (e) { /* Not JSON, try previous */ }
}
  assert(result2Json, 'Should output result in JSON format for noDev=true')
  const result2 = result2Json
  // Excluding devDeps: root (>=14), dep1 (>=14 <16), dep2 (>=12)
  // Combined: min from (14,14,12) = 14.0.0. Max from (null, 16.0.0-0, null) = 16.0.0-0
  // Result: globalMin = 14.0.0, globalMax = 16.0.0-0. No conflict.
  assert.strictEqual(result2.globalMin, '14.0.0', 'Test Case 2: globalMin should be 14.0.0')
  assert.strictEqual(result2.globalMax, '16.0.0-0', 'Test Case 2: globalMax should be 16.0.0-0')
  assert.strictEqual(result2.conflict, false, 'Test Case 2: Should not detect conflict')
  restoreMocks()
})();

// Test case 3: Using the `no-dev` alias instead of `noDev` with JSON output.
await (async () => {
  setupMocks()
  await indexModule.calculateCompatibility({ // Added await
    projectPath: tempDir,
    json: true,
    'no-dev': true,
    noExit: true, // Added noExit
    maxRetries: 0
  })
  let result3Json
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    result3Json = JSON.parse(capturedOutput[i])
    break;
  } catch (e) { /* Not JSON, try previous */ }
}
assert(result3Json, 'Should output result in JSON format for no-dev alias')
const result3 = result3Json
assert.strictEqual(result3.globalMin, '14.0.0', 'Should handle no-dev alias correctly')
restoreMocks()

// Test case 4: Handling a version conflict.
// Sets up a root project requiring <14.0.0 and a dependency requiring >=14.0.0.
// Test with version conflict
const conflictDir = join(tempDir, 'conflict-test')
mkdirSync(conflictDir, { recursive: true })
mkdirSync(join(conflictDir, 'node_modules', 'conflict-dep'), { recursive: true })

const conflictRootPkg = {
  name: 'conflict-project',
  dependencies: {
    'conflict-dep': '1.0.0'
  },
  engines: {
    node: '<14.0.0'
  }
}

const conflictDepPkg = {
  name: 'conflict-dep',
  version: '1.0.0',
  engines: {
    node: '>=14.0.0'
  }
}

writeFileSync(join(conflictDir, 'package.json'), JSON.stringify(conflictRootPkg, null, 2))
writeFileSync(join(conflictDir, 'node_modules', 'conflict-dep', 'package.json'), JSON.stringify(conflictDepPkg, null, 2))

// Mock process.exit to prevent the test runner from exiting
// Create a special mock for conflict test
setupMocks()
const originalExit = process.exit
let exitCalled = false
let exitCode = null
// @ts-ignore - Ignore type checking for the mock
process.exit = function(code) {
  console.log(`MOCK: process.exit(${code}) called`)
  exitCalled = true
  exitCode = code
  // Don't throw, just return
}

// Call the function with `noExit: true` to prevent the script from calling process.exit on conflict
const result = await indexModule.calculateCompatibility({ // Added await
  projectPath: conflictDir,
  json: true,
  noExit: true, // Use noExit to prevent process.exit
  verbose: false, // Ensure verbose is false so the output is just the JSON
  maxRetries: 0
});

// Assertions on the returned object when noExit: true
assert.ok(result, 'Should return a result object when noExit is true');
assert.strictEqual(result.conflict, true, 'Returned object should indicate conflict');
assert.strictEqual(result.globalMin, '14.0.0', 'Returned object should have correct globalMin for conflict');
assert.strictEqual(result.globalMax, '14.0.0-0', 'Returned object should have correct globalMax for conflict (exclusive bound)');

// Also check the JSON output
let loggedJsonOutput
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    loggedJsonOutput = JSON.parse(capturedOutput[i])
    break // Found valid JSON
  } catch (e) { /* Not JSON, try previous */ }
}
  assert.ok(loggedJsonOutput, 'Should have logged valid JSON output');
  assert.strictEqual(loggedJsonOutput.conflict, true, 'Logged JSON should detect version conflict');
  assert.strictEqual(loggedJsonOutput.globalMin, '14.0.0', 'Logged JSON should determine correct min in conflict');
  assert.strictEqual(loggedJsonOutput.globalMax, '14.0.0-0', 'Logged JSON should determine correct max in conflict (exclusive bound)');
  assert(loggedJsonOutput.message.includes('Version conflict'), 'Logged JSON should include conflict message');

  // Restore mocks
  process.exit = originalExit;
  restoreMocks();
})(); // End of async IIFE for conflict test

// Test case 5: Running with verbose logging.
await (async () => {
  setupMocks();
  await indexModule.calculateCompatibility({ // Added await
    projectPath: tempDir,
    verbose: true,
    noExit: true, // Added noExit
    maxRetries: 0
  });
  // Basic assertion that some output was logged, more detailed checks could verify specific verbose messages
  assert(capturedOutput.length > 0, 'Should produce output when verbose is true');
  restoreMocks();
})();

// Test missing package.json
await (async () => {
  const missingPkgPath = join(tempDir, 'nonexistent');
  mkdirSync(missingPkgPath, { recursive: true });

  setupMocks();
  try {
    await indexModule.calculateCompatibility({ // Added await
      projectPath: missingPkgPath,
      noExit: true, // Prevent exit to catch error
      maxRetries: 0
    });
    // If noExit is true, and pkg is not found, it returns a specific object
    // The main function's if(!pkg) block handles this.
    const resultJson = JSON.parse(capturedOutput[capturedOutput.length -1]); // Assuming error outputs JSON via logger
    assert.strictEqual(resultJson.globalMin, null, "Missing pkg shoud result in null globalMin");
    assert.strictEqual(resultJson.globalMax, null, "Missing pkg shoud result in null globalMax");

  } catch (error) {
    // This path might be taken if noExit:false, then error propagates
    // For now, with noExit:true, the if(!pkg) path in main is tested by checking logger output.
    // The logger.error for 'errors.readParseRootPackageJson' is expected.
    assert.ok(capturedOutput.some(line => line.includes("errors.readParseRootPackageJson")), "Error log for missing package.json expected");
  } finally {
    restoreMocks();
  }
})();

// Test case 7: Project without an `engines` field in the root package.json.
await (async () => {
  const noEnginesDir = join(tempDir, 'no-engines');
  mkdirSync(noEnginesDir, { recursive: true });
  mkdirSync(join(noEnginesDir, 'node_modules', 'test-dep'), { recursive: true });

  const noEnginesPkg = {
  name: 'no-engines-project',
  dependencies: {
    'test-dep': '1.0.0'
  }
}

const noEnginesDepPkg = {
  name: 'test-dep',
  version: '1.0.0',
  engines: {
    node: '>=14.0.0'
  }
}

  writeFileSync(join(noEnginesDir, 'package.json'), JSON.stringify(noEnginesPkg, null, 2));
  writeFileSync(join(noEnginesDir, 'node_modules', 'test-dep', 'package.json'), JSON.stringify(noEnginesDepPkg, null, 2));

  setupMocks();
  await indexModule.calculateCompatibility({ // Added await
    projectPath: noEnginesDir,
    json: true,
    noExit: true, // Added noExit
    maxRetries: 0
  });
  let noEnginesResultJson;
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    noEnginesResultJson = JSON.parse(capturedOutput[i])
    break;
  } catch (e) { /* Not JSON, try previous */ }
}
  assert(noEnginesResultJson, 'Should output result in JSON format for noEngines project');
  const noEnginesResult = noEnginesResultJson;
  assert.strictEqual(noEnginesResult.globalMin, '14.0.0', 'Should determine min from dependencies if root has no engines');
  assert.strictEqual(noEnginesResult.globalMax, null, 'Should have null max if only min constraints exist');
  restoreMocks();
})();

// Test case 8: Verifying that key utility functions are exported by the main module.
// This part is synchronous and does not need async/await.
// Test export of utility functions
assert.strictEqual(typeof indexModule.compareVersions, 'function', 'Should export semverUtils.compareVersions')
assert.strictEqual(typeof indexModule.minVer, 'function', 'Should export semverUtils.minVer')
assert.strictEqual(typeof indexModule.maxVer, 'function', 'Should export semverUtils.maxVer')
assert.strictEqual(typeof indexModule.parseNodeRange, 'function', 'Should export semverUtils.parseNodeRange')
assert.strictEqual(typeof indexModule.getDeps, 'function', 'Should export packageUtils.getDeps')
assert.strictEqual(typeof indexModule.getDepPkgJson, 'function', 'Should export packageUtils.getDepPkgJson')
assert.strictEqual(typeof indexModule.getRootPkgJson, 'function', 'Should export packageUtils.getRootPkgJson')

console.log('All main module tests passed!')

// --- Tests for --max-retries ---
import packageUtils from '../src/utils/package.util.js';
import loggerService from '../src/utils/logger.service.js';

const originalGetRootPkgJson = packageUtils.getRootPkgJson;
const originalLoggerWarn = loggerService.warn;
const originalLoggerError = loggerService.error;

console.log('Testing --max-retries functionality...');

await (async () => {
  console.log('Test Case: --max-retries, root package fetch succeeds after one retry');
  setupMocks(); // Captures console.log, not loggerService methods directly

  let getRootAttempts = 0;
  packageUtils.getRootPkgJson = (pkgPath) => {
    getRootAttempts++;
    if (getRootAttempts === 1) {
      console.log(`[MOCK getRootPkgJson] Attempt ${getRootAttempts}: Simulating failure for ${pkgPath}`);
      throw new Error('Simulated root package.json fetch failure');
    }
    console.log(`[MOCK getRootPkgJson] Attempt ${getRootAttempts}: Simulating success for ${pkgPath}`);
    return originalGetRootPkgJson(pkgPath); // Call original on success (uses tempDir's package.json)
  };

  let loggerWarnCalledWith = null;
  loggerService.warn = (key, context) => {
    loggerWarnCalledWith = { key, context };
    originalLoggerWarn(key, context); // Call original to see output if needed
  };

  const result = await indexModule.calculateCompatibility({
    projectPath: tempDir, // Uses the existing tempDir with valid package.json
    json: true,
    noExit: true,
    maxRetries: 1
  });

  assert.strictEqual(getRootAttempts, 2, 'getRootPkgJson should have been called twice');
  assert.ok(loggerWarnCalledWith, 'loggerService.warn should have been called');
  if (loggerWarnCalledWith) { // Type guard
    assert.strictEqual(loggerWarnCalledWith.key, 'warn.retryAttempt', 'logger.warn called with correct key');
    assert.strictEqual(loggerWarnCalledWith.context.failureCount, 1, 'Warning shows 1 failure');
    assert.strictEqual(loggerWarnCalledWith.context.maxConfiguredRetries, 1, 'Warning shows 1 max retry');
  }

  // Check if the final result is correct (dev dep included by default)
  assert.strictEqual(result.globalMin, '16.0.0', 'Final globalMin should be correct after retry success');
  assert.strictEqual(result.globalMax, '16.0.0-0', 'Final globalMax should be correct after retry success');
  assert.strictEqual(result.conflict, true, 'Conflict status should be correct after retry success');

  // Restore mocks
  packageUtils.getRootPkgJson = originalGetRootPkgJson;
  loggerService.warn = originalLoggerWarn;
  restoreMocks(); // Restores console.log
  console.log('Test Case for successful retry: Done');
})();

await (async () => {
  console.log('Test Case: --max-retries, root package fetch fails all retries');
  setupMocks();

  let getRootAttemptsFail = 0;
  packageUtils.getRootPkgJson = (pkgPath) => {
    getRootAttemptsFail++;
    console.log(`[MOCK getRootPkgJson FAIL] Attempt ${getRootAttemptsFail}: Simulating failure for ${pkgPath}`);
    throw new Error(`Simulated persistent failure ${getRootAttemptsFail}`);
  };

  let loggerWarnArgsRetryFail = [];
  let loggerErrorRetryFailedArgs = null;
  loggerService.warn = (key, context) => {
    loggerWarnArgsRetryFail.push({ key, context });
    originalLoggerWarn(key, context);
  };
  loggerService.error = (key, context, exit) => { // Added exit param
    if (key === 'errors.retryFailed') {
      loggerErrorRetryFailedArgs = { key, context };
    }
    // originalLoggerError(key, context, exit); // Avoid actual exit
    console.log(`MOCK logger.error: key=${key}, exit=${exit}, message=${context.errorMessage || context.title}`);
  };

  // Variable to store the result or error from calculateCompatibility
  let operationResult = null;
  let operationError = null;

  try {
    operationResult = await indexModule.calculateCompatibility({
      projectPath: tempDir,
      json: true, // Keep json true to ensure JSON output path is taken in main
      noExit: true, // IMPORTANT: Must be true to catch the error here instead of process exiting
      maxRetries: 1
    });
  } catch (e) {
    operationError = e;
  }

  // Assertions
  assert.strictEqual(getRootAttemptsFail, 2, 'getRootPkgJson (persistent fail) should have been called twice (1 initial + 1 retry)');
  assert.strictEqual(loggerWarnArgsRetryFail.length, 1, 'logger.warn should be called once for the retry attempt');
  if (loggerWarnArgsRetryFail.length > 0) {
    assert.strictEqual(loggerWarnArgsRetryFail[0].key, 'warn.retryAttempt', 'Correct key for logger.warn');
  }

  assert.ok(loggerErrorRetryFailedArgs, 'logger.error for errors.retryFailed should have been called');
  if (loggerErrorRetryFailedArgs) {
    assert.strictEqual(loggerErrorRetryFailedArgs.key, 'errors.retryFailed', 'Correct key for logger.error (retryFailed)');
    assert.strictEqual(loggerErrorRetryFailedArgs.context.totalAttemptsMade, 2, 'Error shows 2 total attempts');
    assert.ok(loggerErrorRetryFailedArgs.context.errorMessage.includes('Simulated persistent failure 2'), 'Error message from last attempt');
  }

  // When noExit is true, and retries fail for getRootPkgJson, main should log 'errors.readParseRootPackageJson'
  // and return { globalMin: null, globalMax: null, conflict: false }
  // The 'errors.unexpectedError' is for errors *after* the initial pkg loading, or if noExit was false and error propagated.
  // The error from retryUtil (Simulated persistent failure 2) is caught by main's try-catch for withRetries.
  // Then, pkg is null, so it hits the if(!pkg) block.
  assert.ok(operationResult, "calculateCompatibility should return a result object even if root pkg fails with noExit:true");
  if (operationResult) {
    assert.strictEqual(operationResult.globalMin, null, "globalMin should be null when root pkg fails");
    assert.strictEqual(operationResult.globalMax, null, "globalMax should be null when root pkg fails");
    assert.strictEqual(operationResult.conflict, false, "conflict should be false when root pkg fails");
  }

  // Check consoleOutput for the specific log from if(!pkg) block
  const loggedErrorForMissingRoot = capturedOutput.some(line => {
    try {
      const json = JSON.parse(line);
      return json.message && json.message.includes("Failed to obtain root package.json");
    } catch(e) { return false; }
  });
  assert.ok(loggedErrorForMissingRoot, "Should log 'errors.readParseRootPackageJson' when root pkg fetch fails with noExit:true");


  // Restore mocks
  packageUtils.getRootPkgJson = originalGetRootPkgJson;
  loggerService.warn = originalLoggerWarn;
  loggerService.error = originalLoggerError;
  restoreMocks();
  console.log('Test Case for failed retry: Done');
})();
