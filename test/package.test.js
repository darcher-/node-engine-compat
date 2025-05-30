import assert from 'assert'
import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import logger from '../src/utils/logger.service.js' // Import logger for mocking
import packageUtils from '../src/utils/package.util.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Testing package utilities...')

// Create a temp directory for testing file operations
const tempDir = join(tmpdir(), `pkg-test-${Date.now()}`)
mkdirSync(tempDir, { recursive: true })
mkdirSync(join(tempDir, 'node_modules', 'test-dep'), { recursive: true })

// Create test package.json files
const rootPkg = {
  name: 'test-project',
  dependencies: {
    'dep1': '1.0.0',
    'dep2': '2.0.0'
  },
  devDependencies: {
    'dev-dep1': '3.0.0',
    'dev-dep2': '4.0.0'
  },
  engines: {
    node: '>=14.0.0'
  }
}

const depPkg = {
  name: 'test-dep',
  version: '1.0.0',
  engines: {
    node: '>=14.0.0 <16.0.0'
  }
}

writeFileSync(join(tempDir, 'package.json'), JSON.stringify(rootPkg, null, 2))
writeFileSync(join(tempDir, 'node_modules', 'test-dep', 'package.json'), JSON.stringify(depPkg, null, 2))

// Test getDeps
console.log('Testing getDeps...')

// Test with both dependencies and devDependencies
const allDeps = packageUtils.getDeps(rootPkg)
assert.deepStrictEqual(Object.keys(allDeps).sort(), ['dep1', 'dep2', 'dev-dep1', 'dev-dep2'].sort(),
  'Should include both dependencies and devDependencies')

// Test with excludeDevDeps=true
const prodDeps = packageUtils.getDeps(rootPkg, true)
assert.deepStrictEqual(Object.keys(prodDeps).sort(), ['dep1', 'dep2'].sort(),
  'Should exclude devDependencies when excludeDevDeps=true')

// Test with empty dependencies
const emptyPkg = {}
const emptyDeps = packageUtils.getDeps(emptyPkg)
assert.deepStrictEqual(Object.keys(emptyDeps).length, 0, 'Should handle empty dependencies')

// Test with null dependencies
const pkgWithNullDeps = { dependencies: null }
const nullDeps = packageUtils.getDeps(pkgWithNullDeps)
assert.deepStrictEqual(Object.keys(nullDeps).length, 0, 'Should handle null dependencies')

// Test with non-object input
try {
  // @ts-ignore
  packageUtils.getDeps(null)
  assert.fail('Should throw TypeError for null input')
} catch (error) {
  assert(error instanceof TypeError, 'Should throw TypeError for null input')
}

try {
  // @ts-ignore
  packageUtils.getDeps('not an object')
  assert.fail('Should throw TypeError for string input')
} catch (error) {
  assert(error instanceof TypeError, 'Should throw TypeError for string input')
}

// Test getRootPkgJson
console.log('Testing getRootPkgJson...')

// Valid package.json
const validPkg = packageUtils.getRootPkgJson(join(tempDir, 'package.json'))
assert.deepStrictEqual(validPkg, rootPkg, 'Should correctly parse valid package.json')

// Non-existent package.json
try {
  const originalExit = process.exit
  let exitCalled = false
  // @ts-ignore
  process.exit = (code) => { exitCalled = true }

  const invalidPath = join(tempDir, 'nonexistent.json')
  const result = packageUtils.getRootPkgJson(invalidPath)

  assert(exitCalled, 'Should call process.exit for nonexistent file')
  assert.strictEqual(result, null, 'Should return null for nonexistent file')

  process.exit = originalExit
} catch (error) {
  // This block shouldn't execute since the function should call process.exit
  assert.fail('Should not throw directly, should call process.exit instead')
}

// Invalid path type
try {
  // @ts-ignore
  packageUtils.getRootPkgJson(null)
  assert.fail('Should throw TypeError for null path')
} catch (error) {
  assert(error instanceof TypeError, 'Should throw TypeError for null path')
}

// Test getDepPkgJson
console.log('Testing getDepPkgJson...')

// Valid dependency
const validDep = packageUtils.getDepPkgJson('test-dep', tempDir)
assert.deepStrictEqual(validDep, depPkg, 'Should correctly parse valid dependency package.json')

// Non-existent dependency (should log warning but not throw)
const nonExistentDep = packageUtils.getDepPkgJson('non-existent-dep', tempDir)
assert.strictEqual(nonExistentDep, null, 'Should return null for nonexistent dependency')

// Test dependency with corrupt package.json
const corruptDepDir = join(tempDir, 'node_modules', 'corrupt-dep')
mkdirSync(corruptDepDir, { recursive: true })
writeFileSync(join(corruptDepDir, 'package.json'), 'this is not valid json {')

const originalLoggerWarn = logger.warn
let warnCalledWithCorrectKey = false
// @ts-ignore
logger.warn = (key, ...args) => {
  if (
    key === 'package.missingDepPackageJson' &&
    args[0] &&
    typeof args[0] === 'object' &&
    args[0].depName === 'corrupt-dep'
  ) {
    warnCalledWithCorrectKey = true
  }
  // Call original or a simplified mock if necessary for other parts of the test
  // if (typeof originalLoggerWarn === 'function') originalLoggerWarn(key, ...args);
}

const corruptDep = packageUtils.getDepPkgJson('corrupt-dep', tempDir)
assert.strictEqual(corruptDep, null, 'Should return null for dependency with corrupt package.json')
assert(warnCalledWithCorrectKey, 'logger.warn should have been called with package.missingDepPackageJson for corrupt-dep')
// @ts-ignore
logger.warn = originalLoggerWarn // Restore

// Invalid parameter types
try {
  // @ts-ignore
  packageUtils.getDepPkgJson(null, tempDir)
  assert.fail('Should throw TypeError for null depName')
} catch (error) {
  assert(error instanceof TypeError, 'Should throw TypeError for null depName')
}

try {
  // @ts-ignore
  packageUtils.getDepPkgJson('test-dep', null)
  assert.fail('Should throw TypeError for null projectPath')
} catch (error) {
  assert(error instanceof TypeError, 'Should throw TypeError for null projectPath')
}

console.log('All package utility tests passed!')
