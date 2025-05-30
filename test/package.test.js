import assert from 'assert'
import packageUtils from '../src/utils/package.util.js'

// Mock objects for testing
const mockPkg = {
  dependencies: {
    'dep1': '1.0.0',
    'dep2': '2.0.0'
  },
  devDependencies: {
    'dev-dep1': '3.0.0',
    'dev-dep2': '4.0.0'
  }
}

// Test getDeps
console.log('Testing getDeps...')

// Test with both dependencies and devDependencies
const allDeps = packageUtils.getDeps(mockPkg)
assert.deepStrictEqual(Object.keys(allDeps).sort(), ['dep1', 'dep2', 'dev-dep1', 'dev-dep2'].sort(),
  'Should include both dependencies and devDependencies')

// Test with excludeDevDeps=true
const prodDeps = packageUtils.getDeps(mockPkg, true)
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

console.log('All package utility tests passed!')
