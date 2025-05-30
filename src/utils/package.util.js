import { readFileSync } from 'fs'
import { join } from 'path'
import logger from '../utils/logger.service.js'

/**
 * Extracts and combines the `dependencies` and optionally `devDependencies` from a parsed package.json object.
 * Handles cases where `dependencies` or `devDependencies` fields are missing or not objects.
 * @param {{ dependencies?: Object, devDependencies?: Object }} pkg - Parsed package.json object.
 * @param {boolean} [excludeDevDeps=false] - Whether to exclude devDependencies.
 * @returns {object} An object containing dependency names as keys and their versions as values.
 */
function getDeps(pkg, excludeDevDeps = false)
{
  if (typeof pkg !== 'object' || pkg === null) {
    throw new TypeError('pkg must be a non-null object')
  }
  const dependencies = (pkg.dependencies && typeof pkg.dependencies === 'object') ? pkg.dependencies : {}

  if (excludeDevDeps) {
    return { ...dependencies }
  }

  const devDependencies = (pkg.devDependencies && typeof pkg.devDependencies === 'object') ? pkg.devDependencies : {}
  return { ...dependencies, ...devDependencies }
}

/**
 * Reads and parses the package.json file for a specific dependency located within the project's node_modules directory.
 * Includes error handling for file system issues or invalid JSON.
 * @param {string} depName - Name of the dependency.
 * @throws {TypeError} If `depName` or `projectPath` are not strings.
 * @param {string} projectPath - The root path of the project being analyzed.
 * @returns {object|null} Parsed package.json object or null on error.
 */
function getDepPkgJson(depName, projectPath)
{
  if (typeof depName !== 'string' || typeof projectPath !== 'string') {
    throw new TypeError('depName and projectPath must be strings')
  }
  const depPath = join(projectPath, 'node_modules', depName, 'package.json')
  try {
    const fileContent = readFileSync(depPath, 'utf8')
    return JSON.parse(fileContent)
  } catch (error) {
    logger.warn('errors.readParseDependencyPackageJson', {
      depName: depName,
      errorMessage: (error && typeof error === 'object' && 'message' in error) ? error.message : String(error),
      depPath: depPath
    })
    return null
  }
}

/**
 * Reads and parses the package.json file at the specified project root path.
 * This function is critical and designed to exit the process upon failure.
 * @param {string} projectPkgPath - Path to the root package.json file.
 * @throws {TypeError} If `projectPkgPath` is not a string.
 * @returns {object|null} Parsed package.json object or null on error.
 */
function getRootPkgJson(projectPkgPath)
{
  if (typeof projectPkgPath !== 'string') {
    throw new TypeError('projectPkgPath must be a string')
  }
  try {
    const rootPkgContent = readFileSync(projectPkgPath, 'utf8')
    const parsed = JSON.parse(rootPkgContent)
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Parsed package.json is not an object')
    }
    return parsed
  } catch (error) {
    logger.error('errors.readParseRootPackageJson', {
      projectPkgPath: projectPkgPath,
      errorMessage: (error && typeof error === 'object' && 'message' in error) ? error.message : String(error)
    }, true) // true to exit
    return null // Will not be reached if error occurs due to process.exit
  }
}

export default {
  getDeps,
  getDepPkgJson,
  getRootPkgJson
}