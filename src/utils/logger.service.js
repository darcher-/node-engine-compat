import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/**
 * @fileoverview Logger service for console output with colorization and message templating.
 * Messages are loaded from a JSON file and can be simple strings or structured objects.
 */

// ANSI escape codes for colors
const RESET = "\x1b[0m"
const FG_RED = "\x1b[31m"
const FG_GREEN = "\x1b[32m"
const FG_YELLOW = "\x1b[33m"
const FG_CYAN = "\x1b[36m"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Attempt to load messages.json. If this fails, the application will crash at startup.
// For a CLI tool, this "fail fast" approach is often acceptable.
/**
 * The root object containing all loaded messages from `../data/messages.json`.
 * @type {MessagesNode}
 */
const messages = JSON.parse(readFileSync(join(__dirname, '../data/messages.json'), 'utf8'));

/**
 * Keys whose corresponding values in the interpolation data will be highlighted with cyan.
 * @type {string[]}
 */
const HIGHLIGHT_KEYS = ['depName', 'projectPkgPath', 'depPath', 'globalMin', 'globalMax'];

/**
 * Data object for interpolating placeholders in messages.
 * Keys are placeholder names (without curly braces) and values are their replacements.
 * @typedef {{ [key: string]: any }} InterpolationData
 */

/**
 * Represents a structured message with various fields for detailed logging.
 * All properties are optional.
 * @typedef {object} StructuredMessage
 * @property {string} [title] - The main title of the message.
 * @property {string} [path] - A file path or relevant location.
 * @property {string} [details] - Additional details or context.
 * @property {string} [minRequired] - Minimum required value/version.
 * @property {string} [maxAllowed] - Maximum allowed value/version.
 * @property {string} [conflictExplanation] - Explanation of a conflict.
 * @property {string[]} [causes] - A list of possible causes for an issue.
 * @property {string[]} [solutions] - A list of possible solutions for an issue.
 */

/**
 * Represents the content of a log message, which can be a simple string
 * or a {@link StructuredMessage} object.
 * @typedef {string | StructuredMessage} MessageContent
 */

/**
 * Represents a node in the messages JSON structure.
 * It can be a direct {@link MessageContent} or a nested object leading to more messages.
 * This allows for a hierarchical organization of messages.
 * @typedef {{ [key: string]: MessageContent | MessagesNode }} MessagesNode
 */

/**
 * Interpolates a template string with data, applying colors.
 * Placeholders in the template string are in the format `{key}`.
 * Values for keys listed in `HIGHLIGHT_KEYS` are colored cyan; other interpolated values
 * inherit the `baseColor`. The entire string is reset to default terminal color at the end.
 *
 * @param {string} templateString The string containing placeholders (e.g., "Hello {name}").
 * @param {InterpolationData} data An object mapping placeholder keys to their values.
 * @param {string} baseColor The base ANSI color code to apply to the output string.
 * @returns {string} The interpolated and colored string. Returns an empty string if templateString is not a string.
 */
function interpolate(templateString, data, baseColor)
{
  if (typeof templateString !== 'string') return ''
  // Replace placeholders like {key} with values from the data object.
  return templateString.replace(/\{(\w+)\}/g, (match, key) =>
  {
    const value = data[key]
    if (value !== undefined && HIGHLIGHT_KEYS.includes(key)) {
      // Apply specific color to placeholders, then reset to baseColor for subsequent text in the same line
      return `${FG_CYAN}${String(value)}${baseColor}`
    } else if (value !== undefined) {
      return String(value) // Ensure value is a string for other placeholders.
    }
    return match // Placeholder not found in data, leave it as is.
  })
}

/**
 * Logs a message to the console after retrieving it by key from the loaded messages
 * and interpolating it with the provided data.
 *
 * @param {('info' | 'warn' | 'error')} level The logging level, determining the color of the message.
 * @param {string} messageKey A dot-separated key to retrieve the message template (e.g., "general.greeting").
 * @param {InterpolationData} [data={}] Data to interpolate into the message template.
 */
function logMessage(level, messageKey, data = {})
{
  const messageParts = messageKey.split('.')
  /** @type {MessageContent | MessagesNode | undefined} */
  let messageObj = messages

  // Traverse the messages object using the parts of the messageKey.
  for (const part of messageParts) {
    if (messageObj && typeof messageObj === 'object' && part in messageObj) {
      messageObj = /** @type {MessagesNode} */ (messageObj)[part];
    } else {
      messageObj = undefined // Key path not fully resolved
      break
    }
  }

  // Cast to the expected resolved type after traversal.
  /** @type {MessageContent | undefined} */
  const resolvedMessageContent = messageObj

  if (!resolvedMessageContent) {
    console.error(`${FG_RED}Logger Error: Message key not found: ${messageKey}${RESET}`)
    return
  }

  const baseColor = level === 'error' ? FG_RED : (level === 'warn' ? FG_YELLOW : FG_GREEN)

  if (typeof resolvedMessageContent === 'string') {
    // Handle simple string messages.
    console.log(`${baseColor}${interpolate(resolvedMessageContent, data, baseColor)}${RESET}`)
  } else if (typeof resolvedMessageContent === 'object') {
    // Handle structured messages.
    /** @type {StructuredMessage} */
    const structuredMsg = resolvedMessageContent

    if (structuredMsg.title) {
      console.log(`${baseColor}${interpolate(structuredMsg.title, data, baseColor)}${RESET}`)
    }

    // Iterate over predefined fields for structured messages and print them if they exist.
    // Any other fields in the structured message object will be ignored.
    ['path', 'details', 'minRequired', 'maxAllowed', 'conflictExplanation'].forEach(field =>
    {
      if (structuredMsg[field]) {
        console.log(`${baseColor}${interpolate(String(structuredMsg[field]), data, baseColor)}${RESET}`)
      }
    });

    ['causes', 'solutions'].forEach(field =>
    {
      if (Array.isArray(structuredMsg[field])) {
        /** @type {string[]} */ (structuredMsg[field]).forEach(line =>
        {
          console.log(`${baseColor}${interpolate(line, data, baseColor)}${RESET}`)
        })
      }
    })
  }
}

const logger = {
  /**
   * Logs an informational message.
   * @param {string} messageKey Key for the message template.
   * @param {InterpolationData | undefined} [data] Data for interpolation.
   */
  info: (messageKey, data) => logMessage('info', messageKey, data),

  /**
   * Logs a warning message.
   * @param {string} messageKey Key for the message template.
   * @param {InterpolationData | undefined} [data] Data for interpolation.
   */
  warn: (messageKey, data) => logMessage('warn', messageKey, data),

  /**
   * Logs an error message.
   * @param {string} messageKey Key for the message template.
   * @param {InterpolationData | undefined} [data] Data for interpolation.
   * @param {boolean} [exit=false] If true, exits the process with code 1 after logging.
   */
  error: (messageKey, data, exit = false) =>
  {
    logMessage('error', messageKey, data)
    if (exit) {
      // Exit the process if the error is critical.
      process.exit(1)
    }
  }
}

export default logger