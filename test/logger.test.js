import assert from 'assert'
import { createRequire } from 'module'
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

// Run tests
console.log('Testing logger service...')

// Test info method
setupMocks()
logger.info('info.determinedRangeMinMax', { globalMin: '14.0.0', globalMax: '16.0.0' })
assert(consoleOutput.length === 1, 'Should output one line for info message')
assert(containsColorCode(consoleOutput[0], FG_GREEN), 'Info message should be green')
assert(containsColorCode(consoleOutput[0], FG_CYAN), 'Highlighted keys should be cyan')
assert(consoleOutput[0].includes('14.0.0'), 'Message should contain interpolated min value')
assert(consoleOutput[0].includes('16.0.0'), 'Message should contain interpolated max value')
restoreMocks()

// Test warn method
setupMocks()
logger.warn('info.noConstraintsFound', {})
assert(consoleOutput.length === 1, 'Should output one line for warn message')
assert(containsColorCode(consoleOutput[0], FG_YELLOW), 'Warning message should be yellow')
assert(consoleOutput[0].includes('No specific Node.js version constraints found'), 'Message content should match')
restoreMocks()

// Test error method
setupMocks()
// Mock process.exit to prevent test from exiting
let exitCode = null
process.exit = (code) => { exitCode = code; throw new Error('process.exit called') }
try {
  logger.error('errors.readParseRootPackageJson', {
    projectPkgPath: '/path/to/package.json',
    errorMessage: 'File not found'
  }, true)
} catch (e) {
  // Expected error due to mocked process.exit
}
assert(consoleOutput.length > 1, 'Should output multiple lines for structured error message')
assert(containsColorCode(consoleOutput[0], FG_RED), 'Error message should be red')
assert(exitCode === 1, 'Should call process.exit with code 1 when exit flag is true')
process.exit = originalExit
restoreMocks()

// Test interpolation with different data types
setupMocks()
logger.info('info.dependencyProcessed', {
  depName: 'test-dep',
  nodeEngine: '>=14.0.0',
  min: '14.0.0',
  max: null
})
assert(consoleOutput[0].includes('test-dep'), 'Should interpolate string value')
assert(consoleOutput[0].includes('null'), 'Should convert null to string')
restoreMocks()

// Test missing message key
setupMocks()
logger.info('info.nonExistentKey', {})
assert(consoleOutput.length === 1, 'Should log an error for missing key')
assert(consoleOutput[0].includes('Logger Error: Message key not found'), 'Should mention missing key')
restoreMocks()

// Test structured message with arrays
setupMocks()
logger.error('errors.versionConflict', {
  globalMin: '16.0.0',
  globalMax: '14.0.0'
}, false)
assert(consoleOutput.length > 5, 'Should output multiple lines including arrays in structured message')
assert(consoleOutput.some(line => line.includes('This conflict')), 'Should include conflict explanation')
assert(consoleOutput.some(line => line.includes('Possible ways to resolve this')), 'Should include solutions array')
restoreMocks()

console.log('All logger service tests passed!')
