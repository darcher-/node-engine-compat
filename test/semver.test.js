import assert from 'node:assert'
import test from 'node:test'
import semver from 'semver' // Import semver for monkey-patching
import logger from '../src/utils/logger.service.js' // Import logger
import semverUtils from '../src/utils/semver.util.js'

test.describe('Semver Utilities', () => {
  const originalLoggerError = logger.error
  let loggerErrorOutput = [];

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
    test('equal versions should return 0', () => {
      assert.strictEqual(semverUtils.compareVersions('1.2.3', '1.2.3'), 0)
      assert.strictEqual(semverUtils.compareVersions(null, null), 0)
      assert.strictEqual(semverUtils.compareVersions(undefined, undefined), 0)
      assert.strictEqual(semverUtils.compareVersions(null, undefined), 0)
    })
    test('different versions comparison', () => {
      assert.ok(semverUtils.compareVersions('1.2.3', '1.2.4') < 0)
      assert.ok(semverUtils.compareVersions('1.2.4', '1.2.3') > 0)
    })
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
      assert.ok(semverUtils.compareVersions('1.2.3', '1.2.3-beta') > 0)
      assert.ok(semverUtils.compareVersions('1.2.3-alpha', '1.2.3-beta') < 0)
    })
  });

  test.describe('minVer and maxVer', () => {
    test('minVer should return the smaller version', () => {
      assert.strictEqual(semverUtils.minVer('1.2.3', '1.2.4'), '1.2.3')
      assert.strictEqual(semverUtils.minVer('1.2.3', null), '1.2.3')
      assert.strictEqual(semverUtils.minVer(null, '1.2.3'), '1.2.3')
      assert.strictEqual(semverUtils.minVer(null, null), null)
    })
    test('maxVer should return the larger version', () => {
      assert.strictEqual(semverUtils.maxVer('1.2.3', '1.2.4'), '1.2.4')
      assert.strictEqual(semverUtils.maxVer('1.2.3', null), '1.2.3')
      assert.strictEqual(semverUtils.maxVer(null, null), null)
    })
  });

  test.describe('getImpliedBoundsFromOperator', () => {
    test('caret (^) operator', () => {
      const caretMajor = semverUtils.getImpliedBoundsFromOperator('^', '1.2.3')
      assert.strictEqual(caretMajor.min, '1.2.3')
      assert.strictEqual(caretMajor.maxExclusive, '2.0.0')
    })
    test('tilde (~) operator', () => {
      const tildeMajorMinor = semverUtils.getImpliedBoundsFromOperator('~', '1.2.3')
      assert.strictEqual(tildeMajorMinor.min, '1.2.3')
      assert.strictEqual(tildeMajorMinor.maxExclusive, '1.3.0')
    })
  })

  test.describe('parseNodeRange', () => {
    test('simple ranges', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0'), ['14.0.0', null])
      assert.deepStrictEqual(semverUtils.parseNodeRange('<16.0.0'), [null, '16.0.0'])
      assert.deepStrictEqual(semverUtils.parseNodeRange('14.0.0'), ['14.0.0', '14.0.0'])
      assert.deepStrictEqual(semverUtils.parseNodeRange('*'), [null, null])
    })
    test('ranges with operators', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange('^14.0.0'), ['14.0.0', '15.0.0'])
      assert.deepStrictEqual(semverUtils.parseNodeRange('~14.0.0'), ['14.0.0', '14.1.0'])
    })
    test('OR conditions', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=14.0.0 <16.0.0 || >=18.0.0'), ['14.0.0', null])
      // Test cases for OR logic branches (not special-cased)
      // Hits: overallMin = null, currentPartMin != null (line 179) -> then overallMin != null, currentPartMin != null (line 180)
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=10.0.0 || >=12.0.0'), ['10.0.0', null], "OR case 1")
      // Hits: overallMin = null, currentPartMin != null (line 179)
      assert.deepStrictEqual(semverUtils.parseNodeRange('<=10.0.0 || >=12.0.0'), ['12.0.0', null], "OR case 2: min of (null, 12) is 12, max of (10, null) is null")
      // Hits: overallMin != null, currentPartMin = null (else branch of line 180)
      assert.deepStrictEqual(semverUtils.parseNodeRange('>=10.0.0 || <5.0.0'), ['10.0.0', '5.0.0'], "OR case 3: min of (10, null) is 10, max of (null, 5) is 5 -> conflict")

    })
    test('edge cases', () => {
      assert.deepStrictEqual(semverUtils.parseNodeRange(''), [null, null])
      assert.ok(loggerErrorOutput.some(msg => typeof msg === 'string' && msg.includes('Failed to parse range: invalid range string')), 'Logger should have recorded the parsing error for "invalid range string"')
      assert.ok(loggerErrorOutput.some(msg => typeof msg === 'string' && (msg.includes('Failed to parse range: null') || msg.includes('Invalid range specified: null'))), 'Logger should have recorded the parsing error for null');

    })
  });

  test.describe('getIntersectingRange error handling', () => {
    test('should handle unexpected errors during semver intersection and log them', () => {
      const originalRangeConstructor = semver.Range
      let constructorCalled = false;

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
      };

      const range1 = ">=14.0.0"
      const range2 = "<16.0.0" // This instantiation will cause the mock to throw
      const result = semverUtils.getIntersectingRange(range1, range2, logger);

      assert.strictEqual(result, null, "Should return null on unexpected error")
      assert.ok(
        loggerErrorOutput.some(msg => msg.includes("Error calculating intersection:") && msg.includes("Simulated semver.Range construction error")),
        "Should log the specific error from semver.Range construction"
      );

      semver.Range = originalRangeConstructor // Restore original method
    });

    test('should return null and log error for completely invalid range strings that cause semver.Range to fail', () => {
      // semver.Range constructor might throw if a range is fundamentally unparseable
      // beyond what our initial simple regex check in parseNodeRange might catch.
      const result = semverUtils.getIntersectingRange("this-is-not-semver", ">=1.0.0", logger)
      assert.strictEqual(result, null)
      assert.ok(
        loggerErrorOutput.some(msg => msg.includes("Error calculating intersection:")),
        "Should log an error for invalid semver range during intersection"
      )
    })
  })
});

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
