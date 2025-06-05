import assert from 'node:assert'
import { createRequire } from 'node:module'
import test from 'node:test'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../src/utils/logger.service.js'

// Get file paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

// Get messages directly to test against
const messages = require('../src/data/messages.json')

// Mock console methods for testing
let consoleOutput = []
const originalConsoleLog = console.log
const originalConsoleError = console.error

function setupMocks() {
  consoleOutput = []
  console.log = (...args) => { consoleOutput.push(args.join(' ')) }
  console.error = (...args) => { consoleOutput.push(args.join(' ')) }
}

function restoreMocks() {
  console.log = originalConsoleLog
  console.error = originalConsoleError
}

// Original process.exit to restore later
const originalExit = process.exit

// Helper to check color codes in output
function containsColorCode(str, colorCode) {
  return str.includes(colorCode)
}

// Define color codes
const FG_RED = "\x1b[31m"
const FG_GREEN = "\x1b[32m"
const FG_YELLOW = "\x1b[33m"
const FG_CYAN = "\x1b[36m"
const RESET = "\x1b[0m"

test.describe('Logger Service', () => {
  // Original process.exit to restore later
  const originalExit = process.exit
  let exitCalledWith = null;

  test.beforeEach(() => {
    setupMocks()
    exitCalledWith = null
    // Mock process.exit for tests that might call it
    // @ts-ignore
    process.exit = (code) => {
      exitCalledWith = code
      // throw new Error('process.exit called'); // Optionally throw to stop execution if needed
    }
  })

  test.afterEach(() => {
    restoreMocks()
    process.exit = originalExit
  });

  test('info method should log green messages with cyan highlights', () => {
    logger.info('info.determinedRangeMinMax', { globalMin: '14.0.0', globalMax: '16.0.0' })
    assert.strictEqual(consoleOutput.length, 1, 'Should output one line for info message')
    assert.ok(containsColorCode(consoleOutput[0], FG_GREEN), 'Info message should be green')
    assert.ok(containsColorCode(consoleOutput[0], FG_CYAN), 'Highlighted keys should be cyan')
    assert.ok(consoleOutput[0].includes('14.0.0'), 'Message should contain interpolated min value')
    assert.ok(consoleOutput[0].includes('16.0.0'), 'Message should contain interpolated max value')
  })

  test('warn method should log yellow messages', () => {
    // Using the 'warn.retryAttempt' key as an example of a warning message.
    // The previous 'info.noConstraintsFound' is an info message, not typically logged via logger.warn.
    // Let's use a message that is defined under 'warn' in messages.json
    const warnKey = 'warn.retryAttempt'; // This is a structured message now.
    const warnData = { operationName: 'testOp', failureCount: 1, maxConfiguredRetries: 3, delayMs:100, errorMessage: 'failed' };
    logger.warn(warnKey, warnData);

    // Structured messages log title and details on separate lines if both exist.
    // warn.retryAttempt has title and details.
    assert.ok(consoleOutput.length >= 1, 'Should output at least one line for warn message');
    assert.ok(containsColorCode(consoleOutput[0], FG_YELLOW), 'Warning message should be yellow');
    // Check for content from the title of warn.retryAttempt
    assert.ok(consoleOutput[0].includes("Operation 'testOp' failed (failure 1 of 3). Retrying in 100ms..."), 'Message content should match title');
    if (consoleOutput.length > 1) { // If details are also logged
      assert.ok(consoleOutput[1].includes("Underlying error: failed"), 'Details should match');
    }
  })

  test('error method should log red messages and exit if specified', () => {
    logger.error('errors.readParseRootPackageJson', {
      projectPkgPath: '/path/to/package.json',
      errorMessage: 'File not found'
    }, true)
    assert.ok(consoleOutput.length > 1, 'Should output multiple lines for structured error message')
    assert.ok(containsColorCode(consoleOutput[0], FG_RED), 'Error message should be red')
    assert.strictEqual(exitCalledWith, 1, 'Should call process.exit with code 1 when exit flag is true')
  })

  test('error method should not exit if exit flag is false', () => {
    logger.error('errors.readParseRootPackageJson', {
      projectPkgPath: '/path/to/package.json',
      errorMessage: 'File not found'
    }, false)
    assert.ok(consoleOutput.length > 1, 'Should output multiple lines for structured error message')
    assert.ok(containsColorCode(consoleOutput[0], FG_RED), 'Error message should be red')
    assert.strictEqual(exitCalledWith, null, 'Should not call process.exit when exit flag is false')
  });

  test('should interpolate different data types correctly', () => {
    logger.info('info.dependencyProcessed', {
      depName: 'test-dep',
      nodeEngine: '>=14.0.0',
      min: '14.0.0',
      max: null
    })
    assert.ok(consoleOutput[0].includes('test-dep'), 'Should interpolate string value')
    assert.ok(consoleOutput[0].includes('null'), 'Should convert null to string')
  });

  test('should log an error for a missing message key', () => {
    logger.info('info.nonExistentKey', {})
    assert.strictEqual(consoleOutput.length, 1, 'Should log an error for missing key')
    assert.ok(consoleOutput[0].includes('Logger Error: Message key not found'), 'Should mention missing key')
  });

  test('should log structured messages with arrays correctly', () => {
    logger.error('errors.versionConflict', {
      globalMin: '16.0.0',
      globalMax: '14.0.0'
    }, false)
    // Title, minRequired, maxAllowed, conflictExplanation, solutions header, solution lines
    assert.ok(consoleOutput.length >= 5, 'Should output multiple lines including arrays in structured message')
    const conflictExplanationPattern = messages.errors.versionConflict.conflictExplanation.replace(/\{.*?\}/g, '.*').substring(0, 30); // Check for start of the string
    assert.ok(consoleOutput.some(line => line.includes('Conflict: The minimum required version')), `Should include conflict explanation. Expected: "${conflictExplanationPattern}"`);
    assert.ok(consoleOutput.some(line => line.includes(messages.errors.versionConflict.solutions[0])), 'Should include solutions array header');
  })

  // Removed logVerbose tests as logger.logVerbose does not exist.
})
