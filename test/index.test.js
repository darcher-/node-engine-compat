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

const dep1Pkg = {
  name: 'test-dep1',
  version: '1.0.0',
  engines: {
    node: '>=14.0.0 <16.0.0'
  }
}

const dep2Pkg = {
  name: 'test-dep2',
  version: '2.0.0',
  engines: {
    node: '>=12.0.0'
  }
}

const devDepPkg = {
  name: 'test-dev-dep',
  version: '3.0.0',
  engines: {
    node: '>=16.0.0'
  }
}

writeFileSync(join(tempDir, 'package.json'), JSON.stringify(rootPkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dep1', 'package.json'), JSON.stringify(dep1Pkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dep2', 'package.json'), JSON.stringify(dep2Pkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dev-dep', 'package.json'), JSON.stringify(devDepPkg, null, 2))

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

// Test main function with different parameters
console.log('Testing main function with various parameters...')

// Test with default parameters (include dev deps)
setupMocks()
indexModule.calculateCompatibility({
  projectPath: tempDir,
  json: true,
  verbose: false
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

assert.strictEqual(result1.globalMin, '16.0.0', 'Should include dev deps by default and determine correct min version')
assert.strictEqual(result1.globalMax, '16.0.0', 'Should include dev deps by default and determine correct max version')
assert.strictEqual(result1.conflict, false, 'Should not detect conflict when valid range exists')
restoreMocks()

// Test with noDev=true (exclude dev deps)
setupMocks()
indexModule.calculateCompatibility({
  projectPath: tempDir,
  json: true,
  noDev: true
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
assert.strictEqual(result2.globalMin, '14.0.0', 'Should exclude dev deps and determine correct min version')
assert.strictEqual(result2.globalMax, '16.0.0', 'Should exclude dev deps and determine correct max version')
restoreMocks()

// Test with no-dev alias
setupMocks()
indexModule.calculateCompatibility({
  projectPath: tempDir,
  json: true,
  'no-dev': true
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

// Call the function with noExit to prevent actual exit but get the result
const result = indexModule.calculateCompatibility({
  projectPath: conflictDir,
  json: true,
  noExit: true // Use noExit to prevent process.exit
})

// Assertions on the returned object when noExit: true
assert.ok(result, 'Should return a result object when noExit is true')
assert.strictEqual(result.conflict, true, 'Returned object should indicate conflict')
assert.strictEqual(result.globalMin, '14.0.0', 'Returned object should have correct globalMin for conflict')
assert.strictEqual(result.globalMax, '<14.0.0', 'Returned object should have correct globalMax for conflict (exclusive bound)')

// Also check the JSON output
let loggedJsonOutput
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    loggedJsonOutput = JSON.parse(capturedOutput[i])
    break // Found valid JSON
  } catch (e) { /* Not JSON, try previous */ }
}
assert.ok(loggedJsonOutput, 'Should have logged valid JSON output')
assert.strictEqual(loggedJsonOutput.conflict, true, 'Logged JSON should detect version conflict')
assert.strictEqual(loggedJsonOutput.globalMin, '14.0.0', 'Logged JSON should determine correct min in conflict')
assert.ok(loggedJsonOutput.globalMax > '14.0.0', 'Logged JSON should determine correct max in conflict (exclusive bound)')
assert(loggedJsonOutput.message.includes('Version conflict'), 'Logged JSON should include conflict message');

// Restore mocks
process.exit = originalExit
restoreMocks()

// Test with verbose logging
setupMocks()
indexModule.calculateCompatibility({
  projectPath: tempDir,
  verbose: true
})
restoreMocks()

// Test missing package.json
const missingPkgPath = join(tempDir, 'nonexistent')
mkdirSync(missingPkgPath, { recursive: true })

setupMocks()
const missingPkgResult = indexModule.calculateCompatibility({
  projectPath: missingPkgPath
})
assert.strictEqual(missingPkgResult, undefined, 'Should return undefined if package.json cannot be found')
restoreMocks()

// Test project without engines field
const noEnginesDir = join(tempDir, 'no-engines')
mkdirSync(noEnginesDir, { recursive: true })
mkdirSync(join(noEnginesDir, 'node_modules', 'test-dep'), { recursive: true })

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

writeFileSync(join(noEnginesDir, 'package.json'), JSON.stringify(noEnginesPkg, null, 2))
writeFileSync(join(noEnginesDir, 'node_modules', 'test-dep', 'package.json'), JSON.stringify(noEnginesDepPkg, null, 2))

setupMocks()
indexModule.calculateCompatibility({
  projectPath: noEnginesDir,
  json: true
})
let noEnginesResultJson
for (let i = capturedOutput.length - 1; i >= 0; i--) {
  try {
    noEnginesResultJson = JSON.parse(capturedOutput[i])
    break;
  } catch (e) { /* Not JSON, try previous */ }
}
assert(noEnginesResultJson, 'Should output result in JSON format for noEngines project')
const noEnginesResult = noEnginesResultJson
assert.strictEqual(noEnginesResult.globalMin, '14.0.0', 'Should determine min from dependencies if root has no engines')
assert.strictEqual(noEnginesResult.globalMax, null, 'Should have null max if only min constraints exist')
restoreMocks()

// Test export of utility functions
assert.strictEqual(typeof indexModule.compareVersions, 'function', 'Should export semverUtils.compareVersions')
assert.strictEqual(typeof indexModule.minVer, 'function', 'Should export semverUtils.minVer')
assert.strictEqual(typeof indexModule.maxVer, 'function', 'Should export semverUtils.maxVer')
assert.strictEqual(typeof indexModule.parseNodeRange, 'function', 'Should export semverUtils.parseNodeRange')
assert.strictEqual(typeof indexModule.getDeps, 'function', 'Should export packageUtils.getDeps')
assert.strictEqual(typeof indexModule.getDepPkgJson, 'function', 'Should export packageUtils.getDepPkgJson')
assert.strictEqual(typeof indexModule.getRootPkgJson, 'function', 'Should export packageUtils.getRootPkgJson')

console.log('All main module tests passed!')
