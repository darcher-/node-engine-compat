import assert from 'node:assert'
import test from 'node:test'
import semver from 'semver' // Import semver for monkey-patching
import logger from '../src/utils/logger.service.js' // Import logger
import semverUtils from '../src/utils/semver.util.js'

test.describe('Semver Utilities', () => {
  // let loggerErrorOutput = []; // Will use mock.calls instead

  test.beforeEach(() => {
    // Mock logger.error using node:test mock API
    test.mock.method(logger, 'error', () => { })
  })

  test.afterEach(() => {
    test.mock.restoreAll() // Restore original logger.error
  })

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
  })

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
  })

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

      const originalWarn = logger.warn
      logger.warn = (key, data) => { warnMessages.push({ key, data }) }

      semverUtils.parseNodeRange("invalid range string") // This should trigger the warn
      assert.ok(warnMessages.find(m => m.key === 'errors.invalidRangeString' && m.data.range === "invalid range string"), 'Logger should have recorded the parsing error for "invalid range string"')
      // warnMessages is automatically reset before each test

      // Test that null input does not trigger the 'errors.invalidRangeString' warning from parseNodeRange itself.
      // parseNodeRange returns [null,null] for null input without logging this specific key.
      semverUtils.parseNodeRange(null)
      assert.ok(!warnMessages.find(m => m.key === 'errors.invalidRangeString'), 'Logger should not log "errors.invalidRangeString" for null input to parseNodeRange')

      logger.warn = originalWarn // Restore
    })
  })

  test.describe('getIntersectingRange error handling', () => {
    // Tests that getIntersectingRange gracefully handles unexpected errors that might occur
    // within the underlying `semver` library during range intersection calculations.
    // It mocks the `semver.Range` constructor to simulate such an error.
    test('should handle unexpected errors during semver intersection and log them', () => {
      const originalRangeConstructor = semver.Range
      let constructorCalled = false

      // Monkey-patch semver.Range constructor to throw an error on the second instantiation
      // This simulates an error deeper within semver library usage.
      // @ts-ignore
      semver.Range = function(rangeStr) {
        if (constructorCalled) { // Throw on the second call (for range2)
          throw new Error("Simulated semver.Range construction error")
        }
        constructorCalled = true
        // @ts-ignore
        return new originalRangeConstructor(rangeStr, {}) // Call original with options if needed
      }

      const range1 = ">=14.0.0"
      const range2 = "<16.0.0" // This instantiation will cause the mock to throw
      const result = semverUtils.getIntersectingRange(range1, range2, logger)

      assert.strictEqual(result, null, "Should return null on unexpected error")
      assert.strictEqual(logger.error.mock.calls.length, 1, "logger.error should have been called once")
      const logArgs = logger.error.mock.calls[0].arguments
      assert.strictEqual(logArgs[0], 'errors.semverIntersectError', "Should log with correct error key")
      assert.ok(logArgs[1].error.includes("Simulated semver.Range construction error"), "Logged error details should include the simulated message")

      semver.Range = originalRangeConstructor // Restore original method
    })

    // Tests that getIntersectingRange handles cases where the input range strings
    // are so invalid that the `semver.Range` constructor itself throws an error.
    test('should return null and log error for completely invalid range strings that cause semver.Range to fail', () => {
      // semver.Range constructor might throw if a range is fundamentally unparseable
      // beyond what our initial simple regex check in parseNodeRange might catch.
      const result = semverUtils.getIntersectingRange("this-is-not-semver", ">=1.0.0") // logger no longer passed
      assert.strictEqual(result, null)
      assert.strictEqual(logger.error.mock.calls.length, 1, "logger.error should have been called once for invalid range string")
      const logArgs = logger.error.mock.calls[0].arguments
      assert.strictEqual(logArgs[0], 'errors.semverIntersectError', "Should log with correct error key for invalid range")
      assert.ok(logArgs[1].error.includes("Invalid range string provided."), "Logged error details should include the invalid range message")
    })
  })
})

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
