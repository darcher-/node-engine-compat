/**
 * Compares two semantic version strings (a, b).
 * Returns:
 * - 0 if a === b or both are null/undefined.
 * - -1 if a < b or a is null/undefined and b is not.
 * - 1 if a > b or b is null/undefined and a is not.
 * Note: Handles null as an effective minimum.
 * Limitation: Incorrectly parses versions with pre-release tags or build metadata due to map(Number).
 *
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {number}
 */
function compareVersions(a, b)
{
  if (a === null || a === undefined) {
    return (b === null || b === undefined) ? 0 : -1 // a is less if b exists
  }
  if (b === null || b === undefined) {
    return 1 // a is greater as b is null
  }

  const pa = String(a).split('.').map(Number) // Limitation: "1.2.3-alpha" -> [1, NaN, NaN]
  const pb = String(b).split('.').map(Number)

  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0 // Treat missing parts as 0
    const nb = pb[i] || 0

    if (isNaN(na) && !isNaN(nb)) return -1
    if (!isNaN(na) && isNaN(nb)) return 1
    if (isNaN(na) && isNaN(nb)) continue

    if (na < nb) return -1
    if (na > nb) return 1
  }
  return 0 // Versions are equal
}

/**
 * Returns the minimum of two version strings. Handles null values.
 *
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {string | null | undefined}
 */
function minVer(a, b)
{
  if (a === null) return b
  if (b === null) return a
  return compareVersions(a, b) <= 0 ? a : b
}

/**
 * Returns the maximum of two version strings. Handles null values.
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {string | null | undefined}
 */
function maxVer(a, b)
{
  if (a === null) return b
  if (b === null) return a
  return compareVersions(a, b) >= 0 ? a : b
}

// 3.3. Interpreting Caret (^) and Tilde (~) Operators

/**
 * Calculates implied [min, maxExclusive] bounds for ^ and ~ operators.
 * @param {string} operator - '^' or '~'
 * @param {string} versionString - e.g., "1.2.3"
 * @returns {{min: string, maxExclusive: string}}
 */
function getImpliedBoundsFromOperator(operator, versionString)
{
  const parts = versionString.split('.').map(Number)
  const major = parts[0] || 0
  const minor = parts[1] || 0
  const patch = parts[2] || 0

  const min = versionString
  let maxExclusive = ""

  if (operator === '^') {
    if (major > 0) maxExclusive = `${major + 1}.0.0`
    else if (minor > 0) maxExclusive = `0.${minor + 1}.0`
    else maxExclusive = `0.1.0` // ^0.0.x implies >=0.0.x <0.1.0 (simplified)
  } else if (operator === '~') {
    if (major > 0 || minor > 0) maxExclusive = `${major}.${minor + 1}.0`
    else maxExclusive = `0.0.${patch + 1}`
  }
  // Fallback to empty string if not set (should not happen)
  if (!maxExclusive) maxExclusive = ""
  return { min, maxExclusive }
}

// 3.4. Parsing Node.js Engine Range Strings

/**
 * Parses an engines.node version range string.
 * @param {string} range - The range string (e.g., ">=14.0.0 <16.0.0 || ^18.0.0")
 * @returns {[string|null, string|null]} [overallEngineMin, overallEngineMax]
 */
function parseNodeRange(range)
{
  let overallEngineMin = null
  let overallEngineMax = null

  const orParts = range.split(/\s*\|\|\s*/)

  for (const partStr of orParts) {
    let currentPartMin = null
    let currentPartMax = null

    if (partStr.trim() === '*') continue // Wildcard, no constraints from this part
    if (/^[\d.]+$/.test(partStr.trim())) { // Exact version
      currentPartMin = partStr.trim()
      currentPartMax = partStr.trim()
    } else {
      const conditions = partStr.match(/([<>]=?|=|~|\^)?\s*([\d.]+)/g) || []
      for (const cond of conditions) {
        const match = cond.match(/([<>]=?|=|~|\^)?\s*([\d.]+)/)
        if (!match) continue

        let operator = match[1] || '='
        const version = match[2]
        let condMin = null, condMax = null

        if (operator === '>=' || operator === '>') condMin = version
        if (operator === '<=' || operator === '<') condMax = version // '<' is exclusive
        if (operator === '~' || operator === '^') ({ min: condMin, maxExclusive: condMax } = getImpliedBoundsFromOperator(operator, version))
        if (operator === '=') { condMin = version; condMax = version }

        currentPartMin = maxVer(currentPartMin, condMin)
        currentPartMax = minVer(currentPartMax, condMax)
      }
    }
    overallEngineMin = minVer(overallEngineMin, currentPartMin)
    overallEngineMax = maxVer(overallEngineMax, currentPartMax)
  }
  return [overallEngineMin ?? null, overallEngineMax ?? null]
}

export default {
  compareVersions,
  minVer,
  maxVer,
  getImpliedBoundsFromOperator,
  parseNodeRange
}