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
 * @returns {object} Parsed package.json object.
 * @throws {Error} If the file cannot be read or parsed, or if depName/projectPath are invalid.
 */
function getDepPkgJson(depName, projectPath)
{
  if (typeof depName !== 'string' || typeof projectPath !== 'string') {
    // This error is a programming error, not something retries would fix.
    throw new TypeError('depName and projectPath must be strings');
  }
  const depPath = join(projectPath, 'node_modules', depName, 'package.json');
  // Errors from readFileSync (e.g., file not found) or JSON.parse (e.g., malformed JSON)
  // will now propagate up to be caught by withRetries.
  const fileContent = readFileSync(depPath, 'utf8');
  const parsedPkg = JSON.parse(fileContent);
  if (typeof parsedPkg !== 'object' || parsedPkg === null) {
    throw new Error(`Parsed package.json for ${depName} is not an object or is null.`);
  }
  return parsedPkg;
}

/**
 * Reads and parses the package.json file at the specified project root path.
 * @param {string} projectPkgPath - Path to the root package.json file.
 * @throws {TypeError} If `projectPkgPath` is not a string.
 * @throws {Error} If the file cannot be read or parsed.
 * @returns {object} Parsed package.json object.
 */
function getRootPkgJson(projectPkgPath)
{
  if (typeof projectPkgPath !== 'string') {
    // This error is a programming error, not something retries would fix.
    throw new TypeError('projectPkgPath must be a string');
  }
  // Errors from readFileSync (e.g., file not found) or JSON.parse (e.g., malformed JSON)
  // will now propagate up to be caught by withRetries.
  const rootPkgContent = readFileSync(projectPkgPath, 'utf8');
  const parsed = JSON.parse(rootPkgContent);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Parsed root package.json is not an object or is null.');
  }
  return parsed;
}

export default {
  getDeps,
  getDepPkgJson,
  getRootPkgJson
}