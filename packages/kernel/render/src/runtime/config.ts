import type { ValueOf } from '@retikz/foundation';

import { isRetikzRenderError, RetikzRenderError, RetikzRenderErrorCode } from '../error';
import type { HydrationHandlers } from '../hydration';
import type { RuntimeDeepReadonly } from '../scene';

/** renderer layer cache 策略 */
export const RenderCachePolicy = {
  Auto: 'auto',
  Static: 'static',
  Dynamic: 'dynamic',
} as const;

/** renderer layer cache 策略取值 */
export type RenderCachePolicy = ValueOf<typeof RenderCachePolicy>;

/** 一份按注册顺序叠加的 hydration handlers */
export type RenderHandlerContribution = Readonly<{
  /** view 内单调递增的注册序号 */
  registration: number;
  /** 本次注册贡献的 handlers */
  handlers: RuntimeDeepReadonly<HydrationHandlers>;
}>;

/** 可随 Runtime transaction 原子更新的 renderer 配置输入 */
export type InputRenderRuntimeConfig = Readonly<{
  /** 按 registration 升序执行的 handlers contributions */
  handlerContributions?: ReadonlyArray<RenderHandlerContribution>;
  /** 动画执行配置 */
  animation?: Readonly<{
    /** 是否启用动画 */
    enabled?: boolean;
    /** 可选静态采样时刻 */
    snapshotAt?: number;
  }>;
  /** Canvas CSS user-space 尺寸；省略字段时按 committed Scene layout 推导 */
  canvas?: Readonly<{
    /** Canvas CSS user-space 宽度 */
    width?: number;
    /** Canvas CSS user-space 高度 */
    height?: number;
  }>;
  /** layer cache 策略 */
  cachePolicy?: RenderCachePolicy;
}>;

/** 只读 renderer 配置；成员由调用方在使用期间保持稳定 */
export type RenderRuntimeConfig = RuntimeDeepReadonly<InputRenderRuntimeConfig>;

const invalidRuntimeInput = (cause: unknown): never => {
  throw new RetikzRenderError({ code: RetikzRenderErrorCode.RuntimeInputInvalid, cause });
};

/** 校验数值与注册关系，仅在注册项乱序时构造有序列表 */
export const prepareRuntimeConfig = (input: InputRenderRuntimeConfig): RenderRuntimeConfig => {
  try {
    const { animation, canvas, handlerContributions } = input;
    if (animation?.snapshotAt !== undefined && (!Number.isFinite(animation.snapshotAt) || animation.snapshotAt < 0)) {
      return invalidRuntimeInput(animation);
    }
    for (const dimension of [canvas?.width, canvas?.height]) {
      if (dimension !== undefined && (!Number.isFinite(dimension) || dimension < 0)) return invalidRuntimeInput(canvas);
    }
    if (!handlerContributions) return input;
    const registrations = new Set<number>();
    let previous = -1;
    let ordered = true;
    for (const contribution of handlerContributions) {
      const { registration } = contribution;
      if (!Number.isSafeInteger(registration) || registration < 0 || registrations.has(registration)) {
        return invalidRuntimeInput(contribution);
      }
      registrations.add(registration);
      if (registration < previous) ordered = false;
      previous = registration;
    }
    if (ordered) return input;
    return {
      ...input,
      handlerContributions: [...handlerContributions].sort((left, right) => left.registration - right.registration),
    };
  } catch (cause) {
    if (isRetikzRenderError(cause) && cause.code === RetikzRenderErrorCode.RuntimeInputInvalid) throw cause;
    return invalidRuntimeInput(cause);
  }
};
