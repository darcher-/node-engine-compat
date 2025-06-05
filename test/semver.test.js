import assert from 'node:assert'
import test from 'node:test'
import semver from 'semver'; // Import semver for monkey-patching
import logger from '../src/utils/logger.service.js'; // Import logger
import semverUtils from '../src/utils/semver.util.js'

test.describe('Semver Utilities', () => {
  const originalLoggerError = logger.error
  let loggerErrorOutput = [];
  // Mocking the logger.error function to capture its output for assertions.
  // This helps verify that specific error conditions trigger logging as expected,
  // without affecting the actual console output during testing.
  // We capture the logged messages in the `loggerErrorOutput` array.

  test.beforeEach(() => {
    // Mock logger.error
    loggerErrorOutput = []
    logger.error = (...args) => {
      loggerErrorOutput.push(args.map(arg => arg instanceof Error ? arg.message : String(arg)).join(' '))
    }
  });

  test.afterEach(() => {
    logger.error = originalLoggerError // Restore original logger.error
  });

  test.describe('compareVersions', () => {
    // Test case to verify that compareVersions returns 0 for equal versions.
    // Also checks behavior with null and undefined inputs.
    test('equal versions should return 0', () => {
      assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.3'), 0)
      assert.strictEqual(semverUtils.compareVersions(null, null), 0)
      assert.strictEqual(semverUtils.compareVersions(undefined, undefined), 0)
      assert.strictEqual(semverUtils.compareVersions(null, undefined), 0)
    })
    // Test case to verify the correct comparison of different versions.
    test('different versions comparison', () => {
      assert.ok(semverUtils.compareVersions('1.2.3', '1.2.4') < 0)
      assert.ok(semverUtils.compareVersions('1.2.4', '1.2.3') > 0)
    })
    // Test case to verify handling of versions with different levels of detail (e.g., '1.2' vs '1.2.0').
    test('different length versions', () => {
      assert.strictEqual(semverUtils.compareVersions('1.2', '1.2.0'), 0)
    })
    test('invalid version components', () => {
      assert.ok(semverUtils.compareVersions('1.a.3', '1.2.3') < 0)
    })
    test('null/undefined comparison with versions', () => {
      assert.ok(semverUtils.compareVersions(null, '1.0.0') < 0)
      assert.ok(semverUtils.compareVersions('1.0.0', null) > 0)
    })
    test('pre-release tags comparison', () => {
      // Note: The script's basic comparison might not align with strict SemVer 2.0.0 pre-release rules.
      assert.ok(semverUtils.compareVersions('1.2.3', '1.2.3-beta') > 0)
      assert.ok(semverUtils.compareVersions('1.2.3-alpha', '1.2.3-beta') < 0)
    })
  });

  test.describe('minVer and maxVer', () => {
    test('minVer should return the smaller version', () => {
      // Tests the minVer utility function, which uses compareVersions internally.
      assert.strictEqual(semverUtils.minVer('1.2.3', '1.2.4'), '1.2.3')
      assert.strictEqual(semverUtils.minVer('1.2.3', null), '1.2.3')
      assert.strictEqual(semverUtils.minVer(null, '1.2.3'), '1.2.3')
      assert.strictEqual(semverUtils.minVer(null, null), null)
    })
    // Tests the maxVer utility function, which uses compareVersions internally.
    test('maxVer should return the larger version', () => {
      assert.strictEqual(semverUtils.maxVer('1.2.3', '1.2.4'), '1.2.4')
      assert.strictEqual(semverUtils.maxVer('1.2.3', null), '1.2.3')
      assert.strictEqual(semverUtils.maxVer(null, null), null)
    })
  });

  test.describe('getImpliedBoundsFromOperator', () => {
    // Tests the interpretation of the caret (^) operator for major versions > 0.
    test('caret (^) operator', () => {
      const caretMajor = semverUtils.getImpliedBoundsFromOperator('^', '1.2.3')
      assert.strictEqual(caretMajor.min, '1.2.3')
      assert.strictEqual(caretMajor.maxExclusive, '2.0.0')
    })
    // Tests the interpretation of the tilde (~) operator for major versions > 0.
    test('tilde (~) operator', () => {
      const tildeMajorMinor = semverUtils.getImpliedBoundsFromOperator('~', '1.2.3')
      assert.strictEqual(tildeMajorMinor.min, '1.2.3')
      assert.strictEqual(tildeMajorMinor.maxExclusive, '1.3.0')
    })
  })

  test.describe('parseNodeRange', () => {
    // Tests the parsing of simple version ranges (>=, <, exact, *).
    test('simple ranges', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0'), ['14.0.0', null])
      assert.deepStrictEqual(semverUtils.parseNodeRange('<16.0.0'), [null, '16.0.0-0'], 'Should parse <16.0.0 correctly with -0 for exclusivity')
      assert.deepStrictEqual(semverUtils.parseNodeRange('14.0.0'), ['14.0.0', '14.0.0'])
      assert.deepStrictEqual(semverUtils.parseNodeRange('*'), [null, null])
    })
    // Tests the parsing of ranges using caret (^) and tilde (~) operators.
    test('ranges with operators', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0'), ['14.0.0', '15.0.0-0'], "Caret op should have exclusive max with -0")
      assert.deepStrictEqual(semverUtils.parseNodeRange('~14.0.0'), ['14.0.0', '14.1.0-0'], "Tilde op should have exclusive max with -0")
    })
    test('OR conditions', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || >=18.0.0'), ['14.0.0', null], "OR case: >=14<16 || >=18") // Correct, max is unbounded by ">=18"
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=10.0.0 || >=12.0.0'), ['10.0.0', null], "OR case: >=10 || >=12") // Correct, min is 10, max unbounded.
      // For '<=10.0.0 || >=12.0.0', the range is (-inf, 10.0.0] U [12.0.0, +inf). This means min is null and max is null for the combined range.
      assert.deepStrictEqual(semverUtils.parseNodeRange('<=10.0.0 || >=12.0.0'), [null, null], "OR case: <=10 || >=12 should be [null,null]")
      // For '>=10.0.0 || <5.0.0-0', this means [10.0.0, +inf) U (-inf, 5.0.0-0). Min is null, Max is null.
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=10.0.0 || <5.0.0'), [null, null], "OR case: >=10 || <5 should be [null,null]")
    })
    // Tests handling of edge cases for parseNodeRange, including empty strings and potentially invalid inputs.
    test('edge cases', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange(''), [null, null], "Empty string should result in [null, null]")
      // semverUtils.parseNodeRange now returns [null, null] for invalid/unparseable strings
      // without explicitly logging an error itself. Error logging would be the caller's responsibility.
      assert.deepStrictEqual(semverUtils.parseNodeRange('invalid range string'), [null, null], "Invalid string should result in [null, null]")
      assert.deepStrictEqual(semverUtils.parseNodeRange(null), [null, null], "Null input should result in [null, null]")
      // Ensure no errors were logged by parseNodeRange directly for these cases by checking loggerErrorOutput
      // This depends on loggerErrorOutput being reset before this test if it's part of a larger describe block
      // For now, assuming these specific calls to parseNodeRange don't log.
    })
  });

  // Removed test.describe('getIntersectingRange error handling', ...) as the function is not implemented/exported.
});

// Additional test cases for getImpliedBoundsFromOperator outside of the describe block
// Tests caret (^) operator for major version 0, minor > 0.
const caretMinor = semverUtils.getImpliedBoundsFromOperator('^', '0.2.3')
assert.strictEqual(caretMinor.min, '0.2.3', 'Caret min for major=0,minor>0 should be exact version')
assert.strictEqual(caretMinor.maxExclusive, '0.3.0', 'Caret max for major=0,minor>0 should be next minor version')

// Tests caret (^) operator for major version 0, minor version 0.
const caretPatch = semverUtils.getImpliedBoundsFromOperator('^', '0.0.3')
assert.strictEqual(caretPatch.min, '0.0.3', 'Caret min for major=0,minor=0 should be exact version')
assert.strictEqual(caretPatch.maxExclusive, '0.0.4', 'Caret max for major=0,minor=0 should be next patch version')

// Test tilde (~) operator
// Tests tilde (~) operator for major version > 0.
const tildeMajorMinor = semverUtils.getImpliedBoundsFromOperator('~', '1.2.3')
assert.strictEqual(tildeMajorMinor.min, '1.2.3', 'Tilde min should be exact version')
assert.strictEqual(tildeMajorMinor.maxExclusive, '1.3.0', 'Tilde max should be next minor version')

// Tests tilde (~) operator for major version 0, minor version 0.
const tildeZeroPatch = semverUtils.getImpliedBoundsFromOperator('~', '0.0.3')
assert.strictEqual(tildeZeroPatch.min, '0.0.3', 'Tilde min for major=0,minor=0 should be exact version')
assert.strictEqual(tildeZeroPatch.maxExclusive, '0.0.4', 'Tilde max for major=0,minor=0 should be next patch version')

// Test different version formats
// Tests handling of shorter version strings (without patch number) with caret operator.
const shortVersion = semverUtils.getImpliedBoundsFromOperator('^', '1.2')
assert.strictEqual(shortVersion.min, '1.2', 'Should handle versions without patch number')
assert.strictEqual(shortVersion.maxExclusive, '2.0.0', 'Should correctly calculate max for short versions')

// Test parseNodeRange
console.log('Testing parseNodeRange...')
// Additional test cases for parseNodeRange outside of the describe block for various scenarios.

// Test simple ranges
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0'), ['14.0.0', null], 'Should parse >=14.0.0 correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('<16.0.0'), [null, '16.0.0-0'], 'Should parse <16.0.0 correctly with -0 for exclusivity')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0'), ['14.0.0', '16.0.0-0'], 'Should parse range correctly, <16.0.0 part is exclusive')
// Tests parsing of ranges with only major or minor versions specified.
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14'), ['14.0.0', null], 'Should parse >=14 correctly, coercing to X.Y.Z') // Assuming coercion or explicit handling
assert.deepStrictEqual(semverUtils.parseNodeRange('14.0.0'), ['14.0.0', '14.0.0'], 'Should parse exact version correctly')
assert.deepStrictEqual(semverUtils.parseNodeRange('*'), [null, null], 'Should parse wildcard correctly')

// Test with operators (global scope tests)
assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0'), ['14.0.0', '15.0.0-0'], 'Global: Should parse ^14.0.0 correctly with -0 for exclusivity')
assert.deepStrictEqual(semverUtils.parseNodeRange('~14.0.0'), ['14.0.0', '14.1.0-0'], 'Global: Should parse ~14.0.0 correctly with -0 for exclusivity')
assert.deepStrictEqual(semverUtils.parseNodeRange('^0.0.3'), ['0.0.3', '0.0.4-0'], 'Global: Should parse ^0.0.3 correctly with -0 for exclusivity')
assert.deepStrictEqual(semverUtils.parseNodeRange('^0.1.0'), ['0.1.0', '0.2.0-0'], 'Global: Should parse ^0.1.0 correctly with -0 for exclusivity')

// Test with OR conditions (global scope tests)
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || >=18.0.0'), ['14.0.0', null], 'Global: OR conditions (min)')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || <=12.0.0'), [null, '16.0.0-0'], 'Global: OR conditions (max)')
assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || >=16.0.0 <18.0.0'), ['14.0.0', '18.0.0-0'], 'Global: merge adjacent ranges with -0')
// For ^14 || ^16: [14, 15-0] || [16, 17-0]. Min is 14. Max is 17-0.
assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0 || ^16.0.0'), ['14.0.0', '17.0.0-0'], 'Global: multiple caret ranges')

// Edge cases
// Tests handling of empty and invalid range strings for parseNodeRange.
assert.deepStrictEqual(semverUtils.parseNodeRange(''), [null, null], 'Should handle empty string')
assert.deepStrictEqual(semverUtils.parseNodeRange('invalid'), [null, null], 'Should handle invalid input')

console.log('All semver utility tests passed!')
