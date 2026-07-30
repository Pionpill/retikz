import type { RuntimeOwnerToken, RuntimeProgramDefinition } from '@retikz/runtime';

import type { AnyCompositeDefinition, ScenePatch, SceneRuntimeSnapshot } from '../../contract';
import type { CompileOptions, CompileResult, CompositeArtifactOf } from '../types';
import type { CompileWarning } from '../warning';
import type { CoreProgramArtifact, CoreProgramArtifactInput, CoreProgramRead } from './types';

import { CORE_OWNER_KEY } from '../../contract';

/** Core compile Program 的固定 identity */
export const CORE_PROGRAM_ID = Object.freeze({ owner: CORE_OWNER_KEY, key: 'compile' } as const);

/** Program 生命周期内固定的 Core compile options */
export type CoreProgramOptions<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = Omit<CompileOptions<TComposites>, 'trace'>;

/** Core Program 的 Runtime 装配选项 */
export type CoreProgramRuntimeOptions = Readonly<{
  /** 只负责使固定 compile definitions 外部状态失效的 owner；其 value 不进入 Core IR */
  invalidationOwners?: ReadonlyArray<RuntimeOwnerToken>;
}>;

/** Core Program 对外提供的完整编译输出 */
export type CoreProgramOutput<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 与 full oracle 等价的完整 compile result */
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  /** 按 canonical compile 顺序收集的 warnings */
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

/** 下游 Program、participant 与 session caller 可见的 Core artifact */
export type CoreProgramPublicRead<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 完整编译输出 */
  output: CoreProgramOutput<TComposites>;
  /** 当前 revision 的完整 Runtime Scene */
  snapshot: SceneRuntimeSnapshot;
  /** update 相对 current revision 的原子 Patch；initial full run 缺省 */
  patch?: ScenePatch;
}>;

/** 保留 composite artifact 泛型的 Core Runtime Program Definition */
export type CoreProgramDefinition<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = RuntimeProgramDefinition<
  CoreProgramArtifactInput<TComposites>,
  CoreProgramArtifact<TComposites>,
  CoreProgramRead<TComposites>,
  CoreProgramPublicRead<TComposites>
>;
