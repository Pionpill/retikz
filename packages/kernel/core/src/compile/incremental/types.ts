import type { AnyCompositeDefinition } from '../../contract';
import type { IRScene } from '../../schemas';
import type { CoreProgramPublicRead } from './public';

/** 只供同一 Core Program 下一次 update 使用的状态 */
export type CoreProgramStateRead = Readonly<{
  /** 当前 artifact 对应的 immutable Core IR Snapshot */
  source: Readonly<IRScene>;
}>;

/** Core Program 自身可见的 private read */
export type CoreProgramRead<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  CoreProgramPublicRead<TComposites> &
    Readonly<{
      /** 不进入 public read 的 session-local state */
      state: CoreProgramStateRead;
    }>;

/** Core Program prepare 交给 Runtime capture 的输入 */
export type CoreProgramArtifactInput<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 对外 artifact view */
  publicRead: CoreProgramPublicRead<TComposites>;
  /** 只供 Program 复用的 immutable state */
  state: CoreProgramStateRead;
}>;

/** Runtime session 实际持有的 Core Program artifact */
export type CoreProgramArtifact<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  CoreProgramArtifactInput<TComposites>;
