import assert from 'assert'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import indexModule from '../src/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Testing conflict detection functionality...')

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

// Mock console.log for capturing JSON output
const originalConsoleLog = console.log
let capturedOutput = []

function setupMocks() {
  capturedOutput = []
  console.log = (message) => { capturedOutput.push(message) }
}

function restoreMocks() {
  console.log = originalConsoleLog
}

// Test conflict detection
console.log('Testing conflict detection...')

// Mock process.exit to prevent test from exiting
const originalExit = process.exit
let exitCalled = false
let exitCode = null

setupMocks()

// Override process.exit for this test
// @ts-ignore
process.exit = function(code) {
  console.log(`Process.exit called with code: ${code}`)
  exitCalled = true
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

  // Since we're using noExit, we should be able to check the result directly
  assert(functionResult, 'Should return a result object')
  assert.strictEqual(functionResult.conflict, true, 'Should detect conflict in the returned result')
  assert.strictEqual(functionResult.globalMin, '14.0.0', 'Should determine correct min in returned result')
} catch (error) {
  console.error('Error running calculateCompatibility:', error)
  throw error // Re-throw to fail the test
}

// Reset exit tracking
exitCalled = false
exitCode = null

// Now run without noExit option to check that process.exit is called
indexModule.calculateCompatibility({
  projectPath: tempDir,
  json: true,
  verbose: false
  // Not using noExit option, so it should exit
})

// Check expectations
assert(exitCalled, 'Should call process.exit on conflict when in JSON mode')
assert.strictEqual(exitCode, 1, 'Should exit with code 1 on conflict')

// Check the output format
assert(capturedOutput.length > 0, 'Should output result in JSON format')
const jsonOutput = JSON.parse(capturedOutput[capturedOutput.length - 1])
assert.strictEqual(jsonOutput.conflict, true, 'Should detect version conflict')
assert.strictEqual(jsonOutput.globalMin, '14.0.0', 'Should determine correct min in conflict')
assert(jsonOutput.message.includes('Version conflict'), 'Should include conflict message')

// Restore mocks
process.exit = originalExit
restoreMocks()

console.log('All conflict detection tests passed!')
