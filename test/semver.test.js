import assert from 'assert'
import semverUtils from '../src/utils/semver.util.js'

console.log('Testing semver utilities...')

// Test the compareVersions function
console.log('Testing compareVersions...')

// Test equal versions
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.3'), 0, 'Equal versions should return 0')
assert.strictEqual(semverUtils.compareVersions('0.0.0', '0.0.0'), 0, 'Equal zero versions should return 0')
assert.strictEqual(semverUtils.compareVersions(null, null), 0, 'Equal null versions should return 0')
assert.strictEqual(semverUtils.compareVersions(undefined, undefined), 0, 'Equal undefined versions should return 0')
assert.strictEqual(semverUtils.compareVersions(null, undefined), 0, 'null and undefined should be considered equal')

// Test different versions
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.4') < 0, true, '1.2.3 should be less than 1.2.4')
assert.strictEqual(semverUtils.compareVersions('1.2.4', '1.2.3') > 0, true, '1.2.4 should be greater than 1.2.3')
assert.strictEqual(semverUtils.compareVersions('1.10.0', '1.2.0') > 0, true, '1.10.0 should be greater than 1.2.0')
assert.strictEqual(semverUtils.compareVersions('2.0.0', '1.9.9') > 0, true, '2.0.0 should be greater than 1.9.9')
assert.strictEqual(semverUtils.compareVersions('0.1.0', '0.0.9') > 0, true, '0.1.0 should be greater than 0.0.9')

// Test with different length versions
assert.strictEqual(semverUtils.compareVersions('1.2', '1.2.0'), 0, '1.2 should equal 1.2.0')
assert.strictEqual(semverUtils.compareVersions('1.2.0.0', '1.2.0'), 0, '1.2.0.0 should equal 1.2.0')
assert.strictEqual(semverUtils.compareVersions('1.2', '1.2.1') < 0, true, '1.2 should be less than 1.2.1')
assert.strictEqual(semverUtils.compareVersions('1.3', '1.2.9') > 0, true, '1.3 should be greater than 1.2.9')

// Test with invalid version components
assert.strictEqual(semverUtils.compareVersions('1.a.3', '1.2.3') < 0, true, 'Invalid component should be less than valid number')
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.a.3') > 0, true, 'Valid number should be greater than invalid component')

// Test with null/undefined
assert.strictEqual(semverUtils.compareVersions(null, '1.0.0') < 0, true, 'null should be less than any version')
assert.strictEqual(semverUtils.compareVersions('1.0.0', null) > 0, true, 'any version should be greater than null')
assert.strictEqual(semverUtils.compareVersions(undefined, '1.0.0') < 0, true, 'undefined should be less than any version')
assert.strictEqual(semverUtils.compareVersions('1.0.0', undefined) > 0, true, 'any version should be greater than undefined')

// Test with pre-release tags
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.3-beta') > 0, true, 'release should be greater than pre-release')
assert.strictEqual(semverUtils.compareVersions('1.2.3-alpha', '1.2.3-beta') < 0, true, 'alpha should be less than beta')
assert.strictEqual(semverUtils.compareVersions('1.2.3-beta', '1.2.3-beta'), 0, 'same pre-release should be equal')
assert.strictEqual(semverUtils.compareVersions('1.2.3-beta.1', '1.2.3-beta.2') < 0, true, 'beta.1 should be less than beta.2')
assert.strictEqual(semverUtils.compareVersions('1.2.3-rc', '1.2.3-beta') > 0, true, 'rc should be greater than beta alphabetically')

// Test minVer and maxVer
console.log('Testing minVer and maxVer...')

// Test minVer
assert.strictEqual(semverUtils.minVer('1.2.3', '1.2.4'), '1.2.3', 'minVer should return the smaller version')
assert.strictEqual(semverUtils.minVer('2.0.0', '1.9.9'), '1.9.9', 'minVer should correctly compare major versions')
assert.strictEqual(semverUtils.minVer('1.0.0', '1.0.0'), '1.0.0', 'minVer should handle equal versions')
assert.strictEqual(semverUtils.minVer('1.2.3', null), '1.2.3', 'minVer with null should return the non-null version')
assert.strictEqual(semverUtils.minVer(null, '1.2.3'), '1.2.3', 'minVer with null should return the non-null version')
assert.strictEqual(semverUtils.minVer(null, null), null, 'minVer with both null should return null')

// Test maxVer
assert.strictEqual(semverUtils.maxVer('1.2.3', '1.2.4'), '1.2.4', 'maxVer should return the larger version')
assert.strictEqual(semverUtils.maxVer('2.0.0', '1.9.9'), '2.0.0', 'maxVer should correctly compare major versions')
assert.strictEqual(semverUtils.maxVer('1.0.0', '1.0.0'), '1.0.0', 'maxVer should handle equal versions')
assert.strictEqual(semverUtils.maxVer('1.2.3', null), '1.2.3', 'maxVer with null should return the non-null version')
assert.strictEqual(semverUtils.maxVer(null, '1.2.3'), '1.2.3', 'maxVer with null should return the non-null version')
assert.strictEqual(semverUtils.maxVer(null, null), null, 'maxVer with both null should return null')

// Test getImpliedBoundsFromOperator
console.log('Testing getImpliedBoundsFromOperator...')

// Test caret (^) operator
const caretMajor = semverUtils.getImpliedBoundsFromOperator('^', '1.2.3')
assert.strictEqual(caretMajor.min, '1.2.3', 'Caret min for major>0 should be exact version')
assert.strictEqual(caretMajor.maxExclusive, '2.0.0', 'Caret max for major>0 should be next major version')

const caretMinor = semverUtils.getImpliedBoundsFromOperator('^', '0.2.3')
assert.strictEqual(caretMinor.min, '0.2.3', 'Caret min for major=0,minor>0 should be exact version')
assert.strictEqual(caretMinor.maxExclusive, '0.3.0', 'Caret max for major=0,minor>0 should be next minor version')

const caretPatch = semverUtils.getImpliedBoundsFromOperator('^', '0.0.3')
assert.strictEqual(caretPatch.min, '0.0.3', 'Caret min for major=0,minor=0 should be exact version')
assert.strictEqual(caretPatch.maxExclusive, '0.0.4', 'Caret max for major=0,minor=0 should be next patch version')

// Test tilde (~) operator
const tildeMajorMinor = semverUtils.getImpliedBoundsFromOperator('~', '1.2.3')
assert.strictEqual(tildeMajorMinor.min, '1.2.3', 'Tilde min should be exact version')
assert.strictEqual(tildeMajorMinor.maxExclusive, '1.3.0', 'Tilde max should be next minor version')

const tildeZeroPatch = semverUtils.getImpliedBoundsFromOperator('~', '0.0.3')
assert.strictEqual(tildeZeroPatch.min, '0.0.3', 'Tilde min for major=0,minor=0 should be exact version')
assert.strictEqual(tildeZeroPatch.maxExclusive, '0.0.4', 'Tilde max for major=0,minor=0 should be next patch version')

// Test different version formats
const shortVersion = semverUtils.getImpliedBoundsFromOperator('^', '1.2')
assert.strictEqual(shortVersion.min, '1.2', 'Should handle versions without patch number')
assert.strictEqual(shortVersion.maxExclusive, '2.0.0', 'Should correctly calculate max for short versions')

// Test parseNodeRange
console.log('Testing parseNodeRange...')

// Test simple ranges
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0'), ['14.0.0', null], 'Should parse >=14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('<16.0.0'), [null, '16.0.0'], 'Should parse <16.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0'), ['14.0.0', '16.0.0'], 'Should parse range correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14'), ['14', null], 'Should parse >=14 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('14.0.0'), ['14.0.0', '14.0.0'], 'Should parse exact version correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('*'), [null, null], 'Should parse wildcard correctly')

// Test with operators
assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0'), ['14.0.0', '15.0.0'], 'Should parse ^14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('~14.0.0'), ['14.0.0', '14.1.0'], 'Should parse ~14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('^0.0.3'), ['0.0.3', '0.0.4'], 'Should parse ^0.0.3 correctly according to SemVer spec')
assert.deepStrictEqual(semverUtils.parseNodeRange('^0.1.0'), ['0.1.0', '0.2.0'], 'Should parse ^0.1.0 correctly')

// Test with OR conditions
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || >=18.0.0'), ['14.0.0', null], 'Should parse OR conditions correctly (min)')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || <=12.0.0'), [null, '16.0.0'], 'Should parse OR conditions correctly (max)')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || >=16.0.0 <18.0.0'), ['14.0.0', '18.0.0'], 'Should merge adjacent ranges')
assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0 || ^16.0.0'), ['14.0.0', null], 'Should parse multiple caret ranges correctly')

// Edge cases
assert.deepStrictEqual(semverUtils.parseNodeRange(''), [null, null], 'Should handle empty string')
assert.deepStrictEqual(semverUtils.parseNodeRange('invalid'), [null, null], 'Should handle invalid input')

console.log('All semver utility tests passed!')
