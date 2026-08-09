/** Retikz 结构化领域错误的基础构造参数 */
export type RetikzErrorOptions<TCode extends string, TDetails extends Readonly<Record<string, unknown>>> = Readonly<{
  code: TCode;
  message: string;
  details: TDetails;
  cause?: unknown;
}>;

/** Retikz 结构化领域错误的基础骨架 */
export class RetikzError<TCode extends string, TDetails extends Readonly<Record<string, unknown>>> extends Error {
  readonly code: TCode;
  readonly details: TDetails;
  readonly cause?: unknown;

  constructor(options: RetikzErrorOptions<TCode, TDetails>) {
    super(options.message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}

/** 判断动态值是否继承自 Retikz 结构化领域错误 */
export const isRetikzError = (value: unknown): value is RetikzError<string, Readonly<Record<string, unknown>>> =>
  value instanceof RetikzError;
