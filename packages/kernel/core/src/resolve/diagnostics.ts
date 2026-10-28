import type { CompileOccurrenceLocator } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';

const layoutProbeRecoverableErrors = new WeakSet<object>();

const compositeContractErrors = new WeakSet<object>();

const additionalFatalProbeErrors = new WeakSet<object>();

/** 布局候选失败的原因及来源 */
type LayoutProbeErrorDetails = Readonly<{
  /** 失败原因 */
  detail: string;
  /** 触发失败的扩展定义名称 */
  providerKey?: string;
  /** 触发失败的编译实例位置 */
  occurrence?: CompileOccurrenceLocator;
}>;

/** 布局试算中某个候选方案的失败，求解器可以放弃该候选并继续尝试 */
export type LayoutProbeRecoverableError = RetikzCoreError<
  typeof RetikzCoreErrorCode.LayoutProbeRecoverable,
  LayoutProbeErrorDetails
>;

/** 创建可由布局试算捕获的候选失败，并登记错误对象以供识别 */
export const createLayoutProbeRecoverableError = (
  message: string,
  options: ErrorOptions &
    Readonly<{ detail?: string; providerKey?: string; occurrence?: CompileOccurrenceLocator }> = {},
): LayoutProbeRecoverableError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.LayoutProbeRecoverable,
    message,
    details: {
      detail: options.detail ?? message,
      ...(options.providerKey === undefined ? {} : { providerKey: options.providerKey }),
      ...(options.occurrence === undefined ? {} : { occurrence: options.occurrence }),
    },
    cause: options.cause,
  });
  layoutProbeRecoverableErrors.add(error);

  return error;
};

/** 创建扩展契约违规错误；布局试算遇到此错误时必须中止 */
export const createCompositeContractError = (message: string, options?: ErrorOptions): RetikzCoreError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.CompositeContractViolation,
    message,
    details: Object.freeze({}),
    cause: options?.cause,
  });
  compositeContractErrors.add(error);

  return error;
};

/** 按登记的对象身份识别布局候选失败，不读取错误对象的属性 */
export const isLayoutProbeRecoverableError = (error: unknown): error is LayoutProbeRecoverableError =>
  error !== null && typeof error === 'object' && layoutProbeRecoverableErrors.has(error);

/** 按登记的对象身份识别扩展契约错误，不读取错误对象的属性 */
export const isCompositeContractError = (error: unknown): error is RetikzCoreError =>
  error !== null && typeof error === 'object' && compositeContractErrors.has(error);

/** 登记必须中止布局试算的错误，禁止将其视为可放弃的候选失败 */
export const registerFatalProbeError = (error: object): void => {
  additionalFatalProbeErrors.add(error);
};

/** 判断错误是否必须中止布局试算，检查时不访问对象属性或原型 */
export const isFatalProbeError = (error: unknown): error is Error =>
  error !== null &&
  typeof error === 'object' &&
  (compositeContractErrors.has(error) || additionalFatalProbeErrors.has(error));

/** 检查原型链是否包含 Error.prototype；原型读取失败或出现循环时返回 false */
const isOrdinaryError = (value: unknown): value is Error => {
  if (value === null || typeof value !== 'object') return false;

  const visited = new WeakSet<object>();

  try {
    let prototype: object | null = value;

    while (prototype !== null) {
      if (visited.has(prototype)) return false;

      visited.add(prototype);
      prototype = Object.getPrototypeOf(prototype);
      if (prototype === Error.prototype) return true;
    }
  } catch {
    return false;
  }

  return false;
};

/** 识别 Error 对象并安全读取消息，读取失败时仅保留识别结果 */
const readOrdinaryError = (thrown: unknown): Readonly<{ ordinary: boolean; message?: string }> => {
  if (!isOrdinaryError(thrown)) return { ordinary: false };

  try {
    const message = Reflect.get(thrown, 'message');
    return typeof message === 'string' ? { ordinary: true, message } : { ordinary: true };
  } catch {
    return { ordinary: true };
  }
};

/** 读取 Error 对象的字符串消息，其余情况返回 fallback */
export const safeErrorMessage = (thrown: unknown, fallback: string): string => {
  const inspected = readOrdinaryError(thrown);
  return inspected.message ?? fallback;
};

/** 将抛出的值转成诊断文字；无法安全读取的对象使用 fallback，避免诊断过程再次抛错 */
export const safeThrownDetail = (thrown: unknown, fallback = 'unknown thrown value'): string => {
  const inspected = readOrdinaryError(thrown);
  if (inspected.ordinary) return inspected.message ?? fallback;
  if (thrown !== null && (typeof thrown === 'object' || typeof thrown === 'function')) return fallback;

  try {
    return String(thrown);
  } catch {
    return fallback;
  }
};
