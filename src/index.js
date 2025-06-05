#!/usr/bin/env node

import { join } from 'path'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import loggerService from './utils/logger.service.js'
import packageUtils from './utils/package.util.js'
import semverUtils from './utils/semver.util.js'
import retryUtil from './utils/retry.util.js'

// Define a type for the parsed command line arguments.
/**
 * @typedef {object} Param
 * @property {string} [projectPath] - The path to the project directory to analyze. Defaults to the current working directory.
 * @property {boolean} [json] - Flag to output the results in JSON format.
 * @property {boolean} [noDev] - Flag to exclude `devDependencies` from the analysis.
 * @property {boolean} [verbose] - Flag to enable verbose logging for debugging purposes.
 * @property {boolean} [noExit] - Flag to prevent the script from calling `process.exit()` on conflict.
 * @property {number} [maxRetries] - Maximum number of times to retry fetching package data on failure.
 * // Properties added by yargs (some may be aliases defined in the configuration)
 * @property {string} ['project-path'] - Alias for `projectPath`.
 * @property {string} [p] - Alias for `projectPath`.
 * @property {boolean} ['no-dev'] - Alias for `noDev`.
 * @property {string} [v] - Alias for `verbose`.
 * @property {number} [retries] - Alias for `maxRetries`.
 * @property {(string|number)[]} [_] - Positional arguments.
 * @property {string} [$0] - The original command that was run.
 * @property {boolean} [help] - Flag to display help message.
 * @property {boolean} [h] - Alias for `help`.
 * @property {boolean} [version] - Flag to display version number.
 * @property {boolean} [V] - Alias for `version`.
 */

/**
 * Main function to calculate Node.js version compatibility based on package.json and dependencies.
 * It reads the project's package.json and all dependencies' package.json files to determine
 * the minimum and maximum Node.js versions required.
 * It outputs the results in a human-readable format or as JSON based on command line arguments.
 * @param {Param} argv
 * @returns {Promise<{ globalMin: string|null, globalMax: string|null, conflict: boolean }>}
 *   A Promise resolving to an object containing:
 *   - `globalMin`: The highest minimum Node.js version required across all analyzed packages, or null if no lower bound is specified.
 *   - `globalMax`: The lowest maximum Node.js version allowed across all analyzed packages, or null if no upper bound is specified. Note: this is potentially exclusive depending on the source constraint but represented inclusively in the return value for simplicity, consistent with the script's output format.
 *   - `conflict`: A boolean indicating whether a version conflict was detected (`globalMin` is greater than `globalMax`).
 * @throws {Error} If the root package.json cannot be read or parsed (after retries) and `noExit` is false.
 */
async function main(argv)
{
  const { maxRetries = 0 } = argv; // Extracted for use with withRetries
  const retryDelayMs = 200; // Standard delay for retries

  // Use argv.projectPath, which yargs will populate from 'project-path' or 'p' aliases
  const projectPath = typeof argv?.projectPath === 'string' ? argv.projectPath : process.cwd()
  const projectPkgPath = join(projectPath, 'package.json')

  const pkg = await retryUtil.withRetries(
    async () => packageUtils?.getRootPkgJson(projectPkgPath), // Wrap sync call
    maxRetries,
    retryDelayMs,
    `fetch root package.json from ${projectPkgPath}`
  );

  if (!pkg) {
    // This path should ideally not be taken if getRootPkgJson (via withRetries) always throws on actual read/parse errors.
    // An error thrown from withRetries would be caught by the main .catch block.
    // This block serves as a safeguard if pkg somehow becomes null without an exception.
    loggerService?.error(
      'errors.readParseRootPackageJson', // Using the updated key from messages.json
      {
        projectPkgPath,
        errorMessage: "Failed to obtain root package.json; the operation resolved to null after potential retries."
      },
      !argv.noExit
    );
    return { globalMin: null, globalMax: null, conflict: false };
  }

  let globalMin = null
  let globalMax = null

  if (
    pkg && typeof pkg === 'object' &&
    'engines' in pkg &&
    pkg.engines &&
    typeof pkg.engines === 'object' &&
    'node' in pkg.engines &&
    typeof pkg.engines.node === 'string'
  ) {
    const parsed = semverUtils?.parseNodeRange(pkg.engines.node)
    const projMin = Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null
    const projMax = Array.isArray(parsed) && typeof parsed[1] === 'string' ? parsed[1] : null

    if (argv.verbose) {
      console.log('DEBUG - Project root engines:', { projMin, projMax, node: pkg.engines.node })
    }

    globalMin = semverUtils?.maxVer(globalMin, projMin)
    globalMax = semverUtils?.minVer(globalMax, projMax)

    if (argv.verbose) {
      loggerService?.info('info.dependencyProcessed', {
        depName: 'Project root',
        nodeEngine: pkg.engines.node,
        min: projMin,
        max: projMax
      })
    }
  }

  // Check both the canonical option and its alias since tests might pass the alias directly.
  const excludeDevDeps = !!(argv.noDev || argv['no-dev'])
  const dependencies = packageUtils?.getDeps(pkg, excludeDevDeps)
  const depNames = Object.keys(dependencies)

  for (const depName of depNames) {
    let depPkg = null;
    try {
      depPkg = await retryUtil.withRetries(
        async () => packageUtils?.getDepPkgJson(depName, projectPath), // Wrap sync call
        maxRetries,
        retryDelayMs,
        `fetch dependency package.json: ${depName}`
      );
    } catch (error) {
      loggerService?.error(
        'errors.fetchDependencyPackageJson',
        {
          depName,
          projectPath,
          errorMessage: error.message || 'Unknown error occurred while fetching dependency package.json.'
        },
        false
      );
      continue; // Skip this dependency and proceed with the next one
    }

    if (
      depPkg &&
      typeof depPkg === 'object' &&
      'engines' in depPkg &&
      depPkg.engines &&
      typeof depPkg.engines === 'object' &&
      'node' in depPkg.engines &&
      typeof depPkg.engines.node === 'string'
    ) {
      const parsed = semverUtils?.parseNodeRange(depPkg.engines.node)
      const min = Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null
      const max = Array.isArray(parsed) && typeof parsed[1] === 'string' ? parsed[1] : null
      globalMin = semverUtils?.maxVer(globalMin, min)
      globalMax = semverUtils?.minVer(globalMax, max)
      if (argv.verbose) {
        const nodeEngine = depPkg.engines.node || 'N/A'
        loggerService.info('info.dependencyProcessed', { depName, nodeEngine, min, max })
      }
    }
  }

  let conflict = !!(globalMin && globalMax && semverUtils?.compareVersions(globalMin, globalMax) > 0)

  // Check for specific conflict case: min === max (e.g., "14.0.0")
  // which arose from incompatible exclusive/inclusive bounds (e.g., "<14.0.0" and ">=14.0.0")
  if (!conflict && globalMin && globalMax && semverUtils?.compareVersions(globalMin, globalMax) === 0) {
    const rootEngine = pkg?.engines?.node?.trim();
    const depEngines = depNames.map(depName => {
      const depPkg = packageUtils?.getDepPkgJson(depName, projectPath);
      return depPkg?.engines?.node?.trim();
    });

    // Scenario 1: Root is <X and some dep is >=X (where X = globalMin = globalMax)
    if (rootEngine === `<${globalMax}` && depEngines.some(depEngine => depEngine === `>=${globalMin}`)) {
      conflict = true;
    }
    // Scenario 2: Root is >=X and some dep is <X (where X = globalMin = globalMax)
    if (!conflict && rootEngine === `>=${globalMin}` && depEngines.some(depEngine => depEngine === `<${globalMax}`)) {
      conflict = true;
    }
  }

  // Always log this for debugging
  console.log('DEBUG - Conflict detection in main:', { globalMin, globalMax, conflict, compareResult: globalMin && globalMax ? semverUtils?.compareVersions(globalMin, globalMax) : 'N/A' })

  if (argv.verbose) {
    console.log('DEBUG - Conflict detection:', { globalMin, globalMax, conflict })
  }

  if (argv.json) {
    const result = {
      // Ensure null is explicitly returned for min/max if they are not strings
      globalMin: typeof globalMin === 'string' ? globalMin : null,
      globalMax: typeof globalMax === 'string' ? globalMax : null,
      conflict,
      message: 'no message'
    }

    if (conflict) {
      result.message = `Version conflict: calculated min (${globalMin}) is greater than max (${globalMax}).`
    } else if (globalMin && globalMax) {
      // Note: The output format "<=globalMax" might be misleading if globalMax originated from an exclusive constraint.
      // This matches the script's original human-readable output style.
      result.message = `Determined Node.js version range: ${globalMin} - ${globalMax}`
    } else if (globalMin) {
      result.message = `Determined minimum Node.js version: ${globalMin}`
    } else if (globalMax) {
      // Note: The output format "<=globalMax" might be misleading if globalMax originated from an exclusive constraint.
      result.message = `Determined maximum Node.js version (exclusive): ${globalMax}`
    } else {
      result.message = "No specific Node.js engine constraints found."
    }

    // Output the JSON result to stdout
    console.log(JSON.stringify(result, null, 2))

    // If a conflict is detected and process.exit is not disabled, exit with a non-zero code
    if (conflict && !argv.noExit) {
      // Log debug message before exiting
      console.log('DEBUG: Found conflict, about to call process.exit(1)')
      // Exit with code 1 to indicate an error/conflict
      // This line will only be reached if !argv.noExit
      process.exit(1)
    }
  } else {
    if (conflict) {
      loggerService?.error('errors.versionConflict', { globalMin, globalMax }, !argv.noExit)
    } else if (globalMin && globalMax) {
      loggerService?.info('info.determinedRangeMinMax', { globalMin, globalMax })
    } else if (globalMin) {
      loggerService?.info('info.determinedRangeMinOnly', { globalMin })
    } else if (globalMax) {
      loggerService?.info('info.determinedRangeMaxOnly', { globalMax })
    } else {
      loggerService?.warn('info.noConstraintsFound', {})
    }
  }

  // Return the calculated range and conflict status. This is primarily for testing or external use when noExit is true.
  return {
    globalMin: globalMin || null,
    globalMax: globalMax || null,
    conflict
  }
}

  const argv = yargs(hideBin(process.argv))
    // Option to specify the project path
    .option('projectPath', {
      alias: ['p', 'project-path'], // Keep 'project-path' as an alias for CLI
      type: 'string',
      description: 'Path to the project directory. Defaults to current working directory.'
    })
    // Option to output results in JSON format
    .option('json', {
      type: 'boolean',
      description: 'Output results in JSON format.'
    })
    // Option to exclude devDependencies from analysis
    .option('noDev', {
      alias: 'no-dev', // Keep 'no-dev' as an alias for CLI
      type: 'boolean',
      description: 'Exclude devDependencies from analysis.'
    })
    // Option for verbose logging
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging.'
    })
    // New option for maximum retries
    .option('maxRetries', {
      alias: ['retries', 'max-retries'], // Add 'max-retries' for CLI consistency
      type: 'number',
      description: 'Maximum number of times to retry fetching package data on failure.',
      default: 0
    })
    // Option to display the version number
    .version()
    // Option to display help message
    .help()
    // Alias for help option
    .alias('help', 'h')
    // Alias for version option
    .alias('version', 'V')
    // Ensure all descriptions are used in the help message.
    // Yargs typically does this by default, but adding usage text can enhance it.
    .usage('Usage: $0 [options]')
    // Example of how to use the command
    .example('$0 -p /path/to/project --no-dev', 'Analyze a project excluding dev dependencies')
    .example('$0 --json --retries 3', 'Analyze current project, output as JSON, and retry up to 3 times on failure')
    // Wrap ensures the help message fits the terminal width
    .wrap(yargs(hideBin(process.argv)).terminalWidth())
    .argv

  // Run the main function with the parsed arguments.
  // Using Promise.resolve().then() to handle the async main function
  Promise.resolve(argv)
    .then(resolvedArgv => main(resolvedArgv))
    .catch(error => {
      // Handle errors propagated from main (e.g., after all retries failed for getRootPkgJson or getDepPkgJson)
      // The retryUtil's loggerService.error('errors.retryFailed', ...) would have already logged specifics about the failed operation.
      // This is a more general catch-all for the application.
      const errorMessage = (error instanceof Error ? error.message : String(error));
      loggerService.error(
        'errors.unexpectedError',
        { errorMessage },
        !argv.noExit // Force exit if noExit is false
      );
      // If loggerService.error doesn't exit (e.g. if argv.noExit is true),
      // and we are in a situation where we must exit, ensure it happens.
      // However, loggerService.error is already handling the !argv.noExit logic.
    });

export default {
  calculateCompatibility: main,
  ...semverUtils,
  ...packageUtils
}
