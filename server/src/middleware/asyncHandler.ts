import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so that any rejected promise is forwarded
 * to Express's next(err) instead of becoming an unhandled rejection.
 */
export function asyncHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
