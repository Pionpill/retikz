/** 可暂停的单次计算；只有驱动器调用计算回调 */
export type TransformComputation<TResult> = Generator<() => unknown, TResult, unknown>;

/** 在唯一的泛型擦除边界恢复本次回调的结果关联 */
export function* computeTransformValue<T>(action: () => T | Promise<T>): TransformComputation<T> {
  return (yield action) as T;
}

/** 同步驱动；调用方只提供同步计算回调 */
export const runTransformComputation = <T>(computation: TransformComputation<T>): T => {
  let step = computation.next();
  while (!step.done) {
    try {
      step = computation.next(step.value());
    } catch (cause) {
      step = computation.throw(cause);
    }
  }
  return step.value;
};

/** 异步驱动；每次回调完成后才恢复同一个计算实例 */
export const runTransformComputationAsync = async <T>(computation: TransformComputation<T>): Promise<T> => {
  let step = computation.next();
  while (!step.done) {
    try {
      step = computation.next(await step.value());
    } catch (cause) {
      step = computation.throw(cause);
    }
  }
  return step.value;
};
