#!/usr/bin/env node

import { join } from 'path'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import loggerService from './utils/logger.service.js'
import packageUtils from './utils/package.util.js'
import semverUtils from './utils/semver.util.js'

/**
 * @typedef {object} Param
 * @property {string} [projectPath] - Path to the project directory.
 * @property {string} [project-path] - Alias for projectPath.
 * @property {boolean} [json] - Output results in JSON format.
 * @property {boolean} [noDev] - Exclude devDependencies from analysis.
 * @property {boolean} [no-dev] - Alias for noDev.
 * @property {boolean} [verbose] - Run with verbose logging.
 * @property {(string|number)[]} [_] - Positional arguments.
 * @property {string} [$0] - The original command that was run.
 */

/**
 * Main function to calculate Node.js version compatibility based on package.json and dependencies.
 * It reads the project's package.json and all dependencies' package.json files to determine
 * the minimum and maximum Node.js versions required.
 * It outputs the results in a human-readable format or as JSON based on command line arguments.
 * @param {Param} argv
 * @returns
 */
function main(argv)
{
  const projectPath = typeof argv?.projectPath === 'string' ? argv.projectPath : process.cwd()
  const projectPkgPath = join(projectPath, 'package.json')
  const pkg = packageUtils?.getRootPkgJson(projectPkgPath)
  if (!pkg) return

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

  const excludeDevDeps = !!(argv.noDev || argv['no-dev'])
  const dependencies = packageUtils?.getDeps(pkg, excludeDevDeps)
  const depNames = Object.keys(dependencies)

  for (const depName of depNames) {
    const depPkg = packageUtils?.getDepPkgJson(depName, projectPath)
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

  const conflict = !!(globalMin && globalMax && semverUtils?.compareVersions(globalMin, globalMax) > 0)

  if (argv.json) {
    const result = {
      globalMin: typeof globalMin === 'string' ? globalMin : null,
      globalMax: typeof globalMax === 'string' ? globalMax : null,
      conflict,
      message: 'no message'
    }
    if (conflict) {
      result.message = `Version conflict: calculated min (${globalMin}) is greater than max (${globalMax}).`
    } else if (globalMin && globalMax) {
      result.message = `Determined Node.js version range: ${globalMin} - ${globalMax}`
    } else if (globalMin) {
      result.message = `Determined minimum Node.js version: ${globalMin}`
    } else if (globalMax) {
      result.message = `Determined maximum Node.js version (exclusive): ${globalMax}`
    } else {
      result.message = "No specific Node.js engine constraints found."
    }
    console.log(JSON.stringify(result, null, 2))
    if (conflict) process.exit(1)
  } else {
    if (conflict) {
      loggerService?.error('errors.versionConflict', { globalMin, globalMax }, true)
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
}

  const argv = yargs(hideBin(process.argv))
    .option('project-path', {
      alias: 'p',
      type: 'string',
      description: 'Path to the project directory'
    })
    .option('json', {
      type: 'boolean',
      description: 'Output results in JSON format'
    })
    .option('no-dev', {
      type: 'boolean',
      description: 'Exclude devDependencies from analysis'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging'
    })
    .version()
    .help()
    .alias('help', 'h')
    .alias('version', 'V')
    .argv

  Promise.resolve(argv).then(
    (resolvedArgv) => main(resolvedArgv)
  )

export default {
  calculateCompatibility: main,
  ...semverUtils,
  ...packageUtils
}
