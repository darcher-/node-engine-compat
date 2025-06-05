import loggerService from './logger.service.js';

/**
 * Utility function to execute an asynchronous function with retries.
 * @param {() => Promise<any>} asyncFn - The asynchronous function to execute.
 * @param {number} maxRetries - The maximum number of retries.
 * @param {number} delayMs - The delay in milliseconds between retries.
 * @param {string} [operationName='Unnamed operation'] - A name for the operation for logging purposes.
 * @returns {Promise<any>} A promise that resolves with the result of asyncFn or rejects if all retries fail.
 */
async function withRetries(asyncFn, maxRetries, delayMs, operationName = 'Unnamed operation') {
  let failureCount = 0;
  while (failureCount <= maxRetries) {
    try {
      return await asyncFn();
    } catch (error) {
      failureCount++;
      const errorMessage = (error instanceof Error ? error.message : String(error));
      if (failureCount > maxRetries) {
        loggerService.error('errors.retryFailed', {
          operationName,
          totalAttemptsMade: maxRetries + 1,
          errorMessage
        });
        throw error; // Rethrow the original error object
      }
      loggerService.warn('warn.retryAttempt', {
        operationName,
        failureCount, // This is the number of failures so far
        maxConfiguredRetries: maxRetries, // Max *re*-tries configured
        delayMs,
        errorMessage
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export default {
  withRetries
};
