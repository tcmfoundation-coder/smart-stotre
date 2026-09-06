import { AppError, handleApiError } from '@/lib/error-handler';

// @types/node marks NODE_ENV as read-only; these tests need to flip it
// between cases, so route every write through this helper.
function setNodeEnv(value: string | undefined) {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
}

describe('AppError', () => {
  it('creates an error with default values', () => {
    const err = new AppError('Something went wrong');
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('AppError');
  });

  it('creates an error with custom status code', () => {
    const err = new AppError('Not found', 404);
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it('creates a non-operational error', () => {
    const err = new AppError('Fatal', 500, false);
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of Error', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('has a stack trace', () => {
    const err = new AppError('test');
    expect(err.stack).toBeDefined();
  });
});

describe('handleApiError', () => {
  const originalEnv = process.env.NODE_ENV;
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

  afterEach(() => {
    setNodeEnv(originalEnv);
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('returns operational AppError details', () => {
    const err = new AppError('Resource not found', 404, true);
    const result = handleApiError(err);
    expect(result).toEqual({
      success: false,
      error: 'Resource not found',
      statusCode: 404,
      isOperational: true,
    });
  });

  it('returns generic message for non-operational errors in production', () => {
    setNodeEnv('production');
    const err = new Error('DB connection failed');
    const result = handleApiError(err);
    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected error occurred. Please try again later.');
    expect(result.statusCode).toBe(500);
    expect(result.isOperational).toBe(false);
  });

  it('returns actual error message in development for non-AppError', () => {
    setNodeEnv('development');
    const err = new Error('Debug info');
    const result = handleApiError(err);
    expect(result.error).toBe('Debug info');
    expect(result.statusCode).toBe(500);
    expect(result.isOperational).toBe(false);
  });

  it('handles non-Error unknown values in development', () => {
    setNodeEnv('development');
    const result = handleApiError('string error');
    expect(result.error).toBe('An unexpected error occurred');
    expect(result.statusCode).toBe(500);
  });

  it('returns generic message for non-operational AppError in production', () => {
    setNodeEnv('production');
    const err = new AppError('Internal leak', 500, false);
    const result = handleApiError(err);
    expect(result.error).toBe('An unexpected error occurred. Please try again later.');
    expect(result.statusCode).toBe(500);
  });

  it('logs the error to console.error', () => {
    const err = new AppError('test error', 400);
    handleApiError(err);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
