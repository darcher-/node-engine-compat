import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// ANSI escape codes for colors
const RESET = "\x1b[0m"
const FG_RED = "\x1b[31m"
const FG_GREEN = "\x1b[32m"
const FG_YELLOW = "\x1b[33m"
const FG_CYAN = "\x1b[36m"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const messages = JSON.parse(readFileSync(join(__dirname, '../shared/messages.json'), 'utf8'))

/**
 * @param {string} templateString
 * @param {{ [x: string]: any; }} data
 * @param {string} baseColor
 */
function interpolate(templateString, data, baseColor)
{
  if (typeof templateString !== 'string') return ''
  return templateString.replace(/\{(\w+)\}/g, (match, key) =>
  {
    const value = data[key]
    if (value !== undefined) {
      // Apply specific color to placeholders, then reset to baseColor for subsequent text in the same line
      if (key === 'depName' || key === 'projectPkgPath' || key === 'depPath' || key === 'globalMin' || key === 'globalMax') {
        return `${FG_CYAN}${value}${baseColor}`
      }
      return String(value) // Ensure value is a string
    }
    return match // Placeholder not found
  })
}

/**
 * @param {string} level
 * @param {string} messageKey
 */
function logMessage(level, messageKey, data = {})
{
  const messageParts = messageKey.split('.')
  let messageObj = messages
  try {
    messageParts.forEach((/** @type {string | number} */ part) =>
    {
      messageObj = messageObj[part]
    })
  } catch (e) {
    messageObj = undefined
  }

  if (!messageObj) {
    console.error(`${FG_RED}Logger Error: Message key not found: ${messageKey}${RESET}`)
    return
  }

  const baseColor = level === 'error' ? FG_RED : (level === 'warn' ? FG_YELLOW : FG_GREEN)

  if (typeof messageObj === 'string') {
    console.log(`${baseColor}${interpolate(messageObj, data, baseColor)}${RESET}`)
  } else if (typeof messageObj === 'object') { // For structured messages
    if (messageObj.title) {
      console.log(`${baseColor}${interpolate(messageObj.title, data, baseColor)}${RESET}`)
    }
    ['path', 'details', 'minRequired', 'maxAllowed', 'conflictExplanation'].forEach(field =>
    {
      if (messageObj[field]) {
        console.log(`${baseColor}${interpolate(messageObj[field], data, baseColor)}${RESET}`)
      }
    });
    ['causes', 'solutions'].forEach(field =>
    {
      if (Array.isArray(messageObj[field])) {
        messageObj[field].forEach(line =>
        {
          console.log(`${baseColor}${interpolate(line, data, baseColor)}${RESET}`)
        })
      }
    })
  }
}

const logger = {
  info: (/** @type {any} */ messageKey, /** @type {{} | undefined} */ data) => logMessage('info', messageKey, data),
  warn: (/** @type {any} */ messageKey, /** @type {{} | undefined} */ data) => logMessage('warn', messageKey, data),
  error: (/** @type {any} */ messageKey, /** @type {{} | undefined} */ data, exit = false) =>
  {
    logMessage('error', messageKey, data)
    if (exit) {
      process.exit(1)
    }
  }
}

export default logger