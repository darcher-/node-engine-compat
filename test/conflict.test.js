import assert from 'assert'
import { mkdirSync, writeFileSync } from 'fs'
import test from 'node:test'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import indexModule from '../src/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let capturedOutput = [] // Declare globally
const originalConsoleLog = console.log // Make originalConsoleLog global as restoreMocks is global

test('Testing conflict detection functionality', (t) => {
  // This test verifies that the script correctly identifies version conflicts
  // Create a temp directory for testing
  const tempDir = join(tmpdir(), `conflict-test-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })
  mkdirSync(join(tempDir, 'node_modules', 'conflict-dep'), { recursive: true })

  // Create test package.json files with a conflict
  const rootPkg = {
    name: 'conflict-project',
    dependencies: {
      'conflict-dep': '1.0.0'
    },
    engines: {
      node: '<14.0.0' // Requires Node.js less than 14.0.0
    }
  }

  const depPkg = {
    name: 'conflict-dep',
    version: '1.0.0',
    engines: {
      node: '>=14.0.0' // Requires Node.js 14.0.0 or greater
    }
  }

  writeFileSync(join(tempDir, 'package.json'), JSON.stringify(rootPkg, null, 2))
  writeFileSync(join(tempDir, 'node_modules', 'conflict-dep', 'package.json'), JSON.stringify(depPkg, null, 2))

  // Test conflict detection
  console.log('Testing conflict detection...')

  // Mock process.exit to prevent test from exiting
  const originalExit = process.exit
  let exitCalled = false
  let exitCode = null

  // Setup mocks before the first call
  setupMocks() // capturedOutput is global and reset here

  // Override process.exit to prevent the test runner from stopping
  // @ts-ignore
  process.exit = function (code) {
    exitCalled = true // Track that exit was called
    exitCode = code
    // Don't actually exit
  }

  // First run with noExit: true to check the return value
  let functionResult
  try {
    functionResult = indexModule.calculateCompatibility({
      projectPath: tempDir,
      json: true,
      verbose: false,
      noExit: true
    })

    // Assert that the function returns an object when `noExit` is true
    assert(functionResult, 'Should return a result object')
    // Assert that the returned object indicates a conflict and provides the calculated min version.
    assert.strictEqual(functionResult.conflict, true, 'Should detect conflict in the returned result')
    assert.strictEqual(functionResult.globalMin, '14.0.0', 'Should determine correct min in returned result')
    // Assuming that in a conflict like <14 vs >=14, the effective min is 14.0.0
    // The original test didn't assert functionResult.globalMax, let's ensure this aligns.
  } catch (error) {
    console.error('Error running calculateCompatibility:', error)
    throw error // Re-throw to fail the test
  }

  // Reset exit tracking
  exitCalled = false
  exitCode = null

  // Run without the `noExit` option to confirm that `process.exit` is called on conflict
  indexModule.calculateCompatibility({
    projectPath: tempDir,
    json: true,
    verbose: false
    // Not using noExit option, so it should exit
  })

  // Assert that `process.exit` was called with the correct conflict exit code (1)
  assert(exitCalled, 'Should call process.exit on conflict when in JSON mode')
  assert.strictEqual(exitCode, 1, 'Should exit with code 1 on conflict')

  // Check the console output
  assert(capturedOutput.length > 0, 'Should output result in JSON format')

  // Attempt to parse the captured output as JSON
  let jsonOutput
  for (let i = capturedOutput.length - 1; i >= 0; i--) {
    try {
      jsonOutput = JSON.parse(capturedOutput[i])
      break;
    } catch (e) { /* Not JSON, try previous */ }
  }

  // Assert that the parsed JSON output reflects the conflict and calculated min/max
  assert(jsonOutput, 'Should have parsed valid JSON output from console')
  assert.strictEqual(jsonOutput.conflict, true, 'Should detect version conflict')
  assert.strictEqual(jsonOutput.globalMin, '14.0.0', 'Should determine correct min in conflict')
  assert(jsonOutput.message.includes('Version conflict'), 'Should include conflict message')
  if (functionResult) { // If the first part passed, check consistency for globalMax
    assert.strictEqual(jsonOutput.globalMax, functionResult.globalMax, 'Returned globalMax and JSON globalMax should match for conflict')
  }

  // Restore mocks
  process.exit = originalExit
  restoreMocks() // restoreMocks uses the global originalConsoleLog
  console.log('All conflict detection tests passed!')
})

// Helper function to set up mocks before each test scenario within this test block
function setupMocks() {
  capturedOutput = [] // Reset global capturedOutput for each call
  console.log = (message) => { capturedOutput.push(message) }
}

// Helper function to restore original functions after test scenarios
function restoreMocks() {
  console.log = originalConsoleLog
}
