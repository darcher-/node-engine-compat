import assert from 'assert'
import semverUtils from '../src/utils/semver.util.js'

// Test the compareVersions function
console.log('Testing compareVersions...')

// Test equal versions
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.3'), 0, 'Equal versions should return 0')

// Test different versions
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.4') < 0, true, '1.2.3 should be less than 1.2.4')
assert.strictEqual(semverUtils.compareVersions('1.2.4', '1.2.3') > 0, true, '1.2.4 should be greater than 1.2.3')
assert.strictEqual(semverUtils.compareVersions('1.10.0', '1.2.0') > 0, true, '1.10.0 should be greater than 1.2.0')

// Test with null/undefined
assert.strictEqual(semverUtils.compareVersions(null, '1.0.0') < 0, true, 'null should be less than any version')
assert.strictEqual(semverUtils.compareVersions('1.0.0', null) > 0, true, 'any version should be greater than null')
assert.strictEqual(semverUtils.compareVersions(null, null), 0, 'null should equal null')

// Test with pre-release tags
assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.3-beta') > 0, true, 'release should be greater than pre-release')
assert.strictEqual(semverUtils.compareVersions('1.2.3-alpha', '1.2.3-beta') < 0, true, 'alpha should be less than beta')
assert.strictEqual(semverUtils.compareVersions('1.2.3-beta', '1.2.3-beta'), 0, 'same pre-release should be equal')

// Test minVer and maxVer
console.log('Testing minVer and maxVer...')
assert.strictEqual(semverUtils.minVer('1.2.3', '1.2.4'), '1.2.3', 'minVer should return the smaller version')
assert.strictEqual(semverUtils.maxVer('1.2.3', '1.2.4'), '1.2.4', 'maxVer should return the larger version')
assert.strictEqual(semverUtils.minVer('1.2.3', null), '1.2.3', 'minVer with null should return the non-null version')
assert.strictEqual(semverUtils.maxVer(null, '1.2.3'), '1.2.3', 'maxVer with null should return the non-null version')

// Test parseNodeRange
console.log('Testing parseNodeRange...')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0'), ['14.0.0', null], 'Should parse >=14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('<16.0.0'), [null, '16.0.0'], 'Should parse <16.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0'), ['14.0.0', '16.0.0'], 'Should parse range correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0'), ['14.0.0', '15.0.0'], 'Should parse ^14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('~14.0.0'), ['14.0.0', '14.1.0'], 'Should parse ~14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('^0.0.3'), ['0.0.3', '0.0.4'], 'Should parse ^0.0.3 correctly according to SemVer spec')

// Test getImpliedBoundsFromOperator
console.log('Testing getImpliedBoundsFromOperator...')
const caretResult = semverUtils.getImpliedBoundsFromOperator('^', '1.2.3')
assert.strictEqual(caretResult.min, '1.2.3', 'Caret min should be correct')
assert.strictEqual(caretResult.maxExclusive, '2.0.0', 'Caret max should be correct')

const tildeResult = semverUtils.getImpliedBoundsFromOperator('~', '1.2.3')
assert.strictEqual(tildeResult.min, '1.2.3', 'Tilde min should be correct')
assert.strictEqual(tildeResult.maxExclusive, '1.3.0', 'Tilde max should be correct')

const caretZeroResult = semverUtils.getImpliedBoundsFromOperator('^', '0.0.3')
assert.strictEqual(caretZeroResult.min, '0.0.3', 'Caret zero min should be correct')
assert.strictEqual(caretZeroResult.maxExclusive, '0.0.4', 'Caret zero max should be correct per SemVer spec')

console.log('All tests passed!')
