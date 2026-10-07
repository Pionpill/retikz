import type { AnyCompositeDefinition } from '../../contract';
import type { IRScene } from '../../schemas';
import type { CoreSnapshotIndexRead } from './diff';
import type { CoreComputationPublicRead } from './public';

/** 只供同一 Core Computation 下一次 update 使用的状态 */
export type CoreComputationStateRead = Readonly<{
  /** 当前 result 对应的 immutable Core IR Snapshot */
  source: Readonly<IRScene>;
  /** 当前 Snapshot 的 conservative stable identity index */
  index: CoreSnapshotIndexRead;
}>;

/**
 * Core Computation 自身可见的 private read
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CoreComputationRead<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  CoreComputationPublicRead<TComposites> &
    Readonly<{
      /** 不进入 public read 的 runtime-local state */
      state: CoreComputationStateRead;
    }>;

/**
 * Core Computation prepare 交给 Runtime capture 的输入
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CoreComputationResultInput<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 对外 result view */
  publicRead: CoreComputationPublicRead<TComposites>;
  /** 只供 Computation 复用的 immutable state */
  state: CoreComputationStateRead;
}>;

/**
 * Runtime 实际持有的 Core Computation result
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type CoreComputationResult<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  CoreComputationResultInput<TComposites>;
