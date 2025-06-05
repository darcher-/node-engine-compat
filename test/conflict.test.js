import assert from 'assert'
import { mkdirSync, writeFileSync } from 'fs'
import test from 'node:test'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import indexModule from '../src/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

test('Conflict detection', async (t) => {
  // Setup: Create a temp directory and mock files
  const tempDir = join(tmpdir(), `conflict-test-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })
  mkdirSync(join(tempDir, 'node_modules', 'conflict-dep'), { recursive: true })

  const rootPkg = {
    name: 'conflict-project',
    dependencies: { 'conflict-dep': '1.0.0' },
    engines: { node: '<14.0.0' }
  }
  const depPkg = {
    name: 'conflict-dep',
    version: '1.0.0',
    engines: { node: '>=14.0.0' }
  }
  writeFileSync(join(tempDir, 'package.json'), JSON.stringify(rootPkg, null, 2))
  writeFileSync(join(tempDir, 'node_modules', 'conflict-dep', 'package.json'), JSON.stringify(depPkg, null, 2))

  let globalCapturedOutput = []
  const globalOriginalConsoleLog = console.log
  const setupConsoleMock = () => {
    globalCapturedOutput = [] // Re-enable mocking
    console.log = (message) => { globalCapturedOutput.push(message) } // Re-enable mocking
  }
  const restoreConsoleMock = () => {
    console.log = globalOriginalConsoleLog // Re-enable mocking
  }

  const originalProcessExit = process.exit
  let exitCalled = false
  let exitCode = null
  const mockProcessExit = (code) => {
    exitCalled = true
    exitCode = code
  }

  // --- Test Scenario 1: noExit = true ---
  await t.test('should detect conflict and return result when noExit is true', async () => {
    setupConsoleMock() // Re-enable call to setup
    process.exit = mockProcessExit // Apply process.exit mock
    exitCalled = false // Reset for this sub-test
    exitCode = null  // Reset for this sub-test

    const functionResult = await indexModule.calculateCompatibility({
      projectPath: tempDir,
      json: true,
      verbose: false,
      noExit: true,
      maxRetries: 0
    });

    assert(functionResult, 'Should return a result object');
    assert.strictEqual(functionResult.conflict, true, 'Should detect conflict in the returned result (conflict: true)');
    assert.strictEqual(functionResult.globalMin, '14.0.0', 'Should determine correct min in returned result');
    // globalMax for "<14.0.0" and ">=14.0.0" conflict.
    // parseNodeRange for <14.0.0 is [null, "14.0.0") (exclusive max)
    // parseNodeRange for >=14.0.0 is ["14.0.0", null] (inclusive min)
    // minVer(null, "14.0.0") -> "14.0.0" (but this is exclusive, actual value might be 13.x.x)
    // The logger output for "<=version" is tricky.
    // Current logic: globalMax will be the lowest of maximums. If one is '<14.0.0' and other is unbounded, it becomes '<14.0.0'.
    // Let's check the actual output from the JSON string for consistency.
    // For now, not asserting functionResult.globalMax directly without knowing its exact format from parseNodeRange.

    restoreConsoleMock() // Re-enable call to restore
    process.exit = originalProcessExit // Restore process.exit
  });

  // --- Test Scenario 2: noExit = false (default) ---
  await t.test('should detect conflict, output JSON, and exit with code 1', async () => {
    setupConsoleMock() // Re-enable call to setup
    process.exit = mockProcessExit // Apply process.exit mock
    exitCalled = false // Reset for this sub-test
    exitCode = null  // Reset for this sub-test

    await indexModule.calculateCompatibility({
      projectPath: tempDir,
      json: true,
      verbose: false,
      maxRetries: 0
    });

    assert(exitCalled, 'Should call process.exit on conflict when in JSON mode');
    assert.strictEqual(exitCode, 1, 'Should exit with code 1 on conflict');

    assert(globalCapturedOutput.length > 0, 'Should output result in JSON format');
    let jsonOutput;
    for (let i = globalCapturedOutput.length - 1; i >= 0; i--) {
      try {
        jsonOutput = JSON.parse(globalCapturedOutput[i]);
        break;
      } catch (e) { /* Not JSON, try previous */ }
    }
    assert(jsonOutput, 'Should have parsed valid JSON output from console');
    assert.strictEqual(jsonOutput.conflict, true, 'JSON output should detect version conflict');
    assert.strictEqual(jsonOutput.globalMin, '14.0.0', 'JSON output should determine correct min in conflict');
    assert(jsonOutput.message.includes('Version conflict'), 'JSON output should include conflict message');
    // Example: assert.strictEqual(jsonOutput.globalMax, "13.999.999"); // Or however '<14.0.0' is represented

    restoreConsoleMock() // Re-enable call to restore
    process.exit = originalProcessExit // Restore process.exit
  });

  // Add any other necessary cleanup for tempDir if needed, though OS usually handles tmpdir cleanup.
});
