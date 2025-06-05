import assert from 'assert';
import { describe, it, beforeEach, afterEach } from 'node:test'; // Assuming Node.js test runner
import retryUtil from '../src/utils/retry.util.js';
import loggerService from '../src/utils/logger.service.js';

// Manual mock for loggerService
const originalLoggerService = { ...loggerService };
let mockLoggerWarnArgs = [];
let mockLoggerErrorArgs = [];

const mockLogger = {
  warn: (key, args) => mockLoggerWarnArgs.push({ key, args }),
  error: (key, args) => mockLoggerErrorArgs.push({ key, args }),
  // Keep other methods if any, or mock them as needed
  info: () => {},
  log: () => {},
  formatMessage: originalLoggerService.formatMessage, // Use real formatter if complex
};

describe('retryUtil.withRetries', () => {
  beforeEach(() => {
    // Replace loggerService with the mock
    Object.assign(loggerService, mockLogger);
    mockLoggerWarnArgs = [];
    mockLoggerErrorArgs = [];
  });

  afterEach(() => {
    // Restore original loggerService
    Object.assign(loggerService, originalLoggerService);
  });

  it('should resolve successfully if asyncFn succeeds on the first try', async () => {
    const asyncFn = async () => 'success';
    const result = await retryUtil.withRetries(asyncFn, 3, 10, 'testOp');
    assert.strictEqual(result, 'success');
    assert.strictEqual(mockLoggerWarnArgs.length, 0);
    assert.strictEqual(mockLoggerErrorArgs.length, 0);
  });

  it('should resolve successfully if asyncFn fails once then succeeds', async () => {
    let attempts = 0;
    const asyncFn = async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Simulated failure 1');
      }
      return 'success_after_retry';
    };
    const result = await retryUtil.withRetries(asyncFn, 3, 10, 'testOpRetrySuccess');
    assert.strictEqual(result, 'success_after_retry');
    assert.strictEqual(mockLoggerWarnArgs.length, 1);
    assert.strictEqual(mockLoggerErrorArgs.length, 0);

    const warnArg = mockLoggerWarnArgs[0].args;
    assert.strictEqual(warnArg.operationName, 'testOpRetrySuccess');
    assert.strictEqual(warnArg.failureCount, 1);
    assert.strictEqual(warnArg.maxConfiguredRetries, 3);
    assert.strictEqual(warnArg.errorMessage, 'Simulated failure 1');
  });

  it('should reject if asyncFn consistently fails after all retry attempts', async () => {
    let attempts = 0;
    const asyncFn = async () => {
      attempts++;
      throw new Error(`Simulated failure ${attempts}`);
    };
    const maxRetries = 2;
    const operationName = 'testOpConsistentFail';

    await assert.rejects(
      retryUtil.withRetries(asyncFn, maxRetries, 10, operationName),
      (err) => {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, `Simulated failure ${maxRetries + 1}`); // total attempts = maxRetries + 1
        return true;
      }
    );

    assert.strictEqual(mockLoggerWarnArgs.length, maxRetries); // Warns for each retry
    assert.strictEqual(mockLoggerErrorArgs.length, 1); // Error for the final failure

    // Check last warn call
    const lastWarnArg = mockLoggerWarnArgs[maxRetries -1].args;
    assert.strictEqual(lastWarnArg.operationName, operationName);
    assert.strictEqual(lastWarnArg.failureCount, maxRetries);
    assert.strictEqual(lastWarnArg.errorMessage, `Simulated failure ${maxRetries}`);

    // Check error call
    const errorArg = mockLoggerErrorArgs[0].args;
    assert.strictEqual(errorArg.operationName, operationName);
    assert.strictEqual(errorArg.totalAttemptsMade, maxRetries + 1);
    assert.strictEqual(errorArg.errorMessage, `Simulated failure ${maxRetries + 1}`);
  });

  it('should use default operationName if not provided', async () => {
    const asyncFn = async () => { throw new Error('fail'); };
    await assert.rejects(retryUtil.withRetries(asyncFn, 0, 10)); // maxRetries = 0

    assert.strictEqual(mockLoggerErrorArgs.length, 1);
    assert.strictEqual(mockLoggerErrorArgs[0].args.operationName, 'Unnamed operation');
  });

  // Note: Testing the actual delay timing with setTimeout is complex without fake timers.
  // These tests focus on the number of calls and logged parameters.
  // A simple way to approximate delay testing is to record timestamps, but it can lead to flaky tests.
  it('should make the correct number of calls to asyncFn', async () => {
    let callCount = 0;
    const asyncFn = async () => {
      callCount++;
      if (callCount <= 2) { // Fails twice
        throw new Error(`Failure ${callCount}`);
      }
      return 'success_on_third_attempt'; // Succeeds on 3rd attempt
    };
    const maxRetries = 3; // Allows up to 3 retries (4 total attempts)

    const result = await retryUtil.withRetries(asyncFn, maxRetries, 10, 'testCallCount');

    assert.strictEqual(result, 'success_on_third_attempt');
    assert.strictEqual(callCount, 3); // Called initial + 2 retries that failed, then success
    assert.strictEqual(mockLoggerWarnArgs.length, 2); // Logged for the two failures
    assert.strictEqual(mockLoggerErrorArgs.length, 0);
  });
});
