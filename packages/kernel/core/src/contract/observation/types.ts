import type { ZodType } from 'zod';

import type { IRChild, JsonValue } from '../../schemas';
import type { CompileOccurrenceLocator } from '../occurrence';
import type { Scene } from '../scene';

/** 能够声明最终编译产物的领域中立所属者 */
export type CompileObservationOwner =
  | Readonly<{ kind: 'composite'; namespace: string; type: string }>
  | Readonly<{ kind: 'pathKind'; name: string }>;

/** 所属者产物的 JSON schema 契约 */
export type CompileOwnerOutputDefinition<TValue extends JsonValue = JsonValue> = Readonly<{
  /** 校验并恢复所属者最终产物的 schema */
  schema: ZodType<TValue>;
}>;

/** Path kind 在需要时发布最终产物的编译期 publisher */
export type CompileOwnerOutputPublisher<TValue extends JsonValue = JsonValue> = Readonly<{
  /** 当前编译是否至少被一个 observer 选中 */
  requested: boolean;
  /** 发布当前 Path occurrence 的最终所属者产物 */
  publish: (value: TValue) => void;
}>;

/** observer 选择所属者时看到的 authored site */
export type CompileObservationSite = Readonly<{
  /** 被选择的所属者 */
  owner: CompileObservationOwner;
  /** 所属者对应的 authored source path */
  sourcePath: string;
}>;

/** 所属者产物从 probe 到最终 occurrence 的来源关系 */
export type CompileObservationProvenance = Readonly<{
  /** 最终 replay remap 前的 occurrence */
  origin: CompileOccurrenceLocator;
  /** 最终提交的 occurrence，与公开 occurrence 相同 */
  final: CompileOccurrenceLocator;
}>;

/** 隔离片段向观察者公开的 JSON-safe artifact */
export type CompileFragmentArtifact =
  | Readonly<{
      /** 复合组件产物 */
      kind: 'composite';
      /** 复合组件命名空间 */
      namespace: string;
      /** 复合组件类型 */
      type: string;
      /** 产物对应的 occurrence */
      occurrence: CompileOccurrenceLocator;
      /** 已校验并冻结的复合组件产物 */
      value: JsonValue;
    }>
  | Readonly<{
      /** 节点布局产物 */
      kind: 'nodeLayout';
      /** 产物对应的 occurrence */
      occurrence: CompileOccurrenceLocator;
      /** 已冻结的节点布局产物 */
      value: JsonValue;
    }>;

/** 隔离片段向观察者公开的领域中立诊断 */
export type CompileFragmentDiagnostic = Readonly<{
  /** 机器可读诊断 code */
  code: string;
  /** 人类可读诊断 message */
  message: string;
  /** 产生诊断的 IR path */
  path: string;
  /** 诊断所属的主编译或观测阶段 */
  origin:
    | Readonly<{ kind: 'primary' }>
    | Readonly<{
        kind: 'observation';
        owner: CompileObservationOwner;
        occurrence: CompileOccurrenceLocator;
        stage: 'owner' | 'fragment';
      }>;
}>;

/** 一次最终所属者产物观察事件 */
export type CompileObservation<TValue extends JsonValue = JsonValue> = Readonly<{
  /** 所属者身份 */
  owner: CompileObservationOwner;
  /** 最终逻辑树中的 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** 已按所属者 schema 校验并冻结的产物 */
  value: TValue;
  /** 从所属者局部坐标到主 Scene 坐标的仿射矩阵 */
  transform: readonly [number, number, number, number, number, number];
  /** probe/replay 来源追踪 */
  provenance: CompileObservationProvenance;
}>;

/** observer 在一次 observed compile 中使用的上下文 */
export type CompileObservationContext = Readonly<{
  /** 在当前 occurrence 环境中编译隔离的普通 IR 片段 */
  compileFragment: (children: IRChild | ReadonlyArray<IRChild>) => CompiledSceneFragment;
}>;

/** 隔离片段编译结果，不并入 primary compile result */
export type CompiledSceneFragment = Readonly<{
  /** occurrence-local Scene */
  scene: Scene;
  /** fragment 内产生的 artifacts */
  artifacts: ReadonlyArray<CompileFragmentArtifact>;
  /** fragment 内产生的 diagnostics */
  diagnostics: ReadonlyArray<CompileFragmentDiagnostic>;
}>;

/** 一次 observer 定义 */
export type CompileObserverDefinition<TOutput = unknown> = Readonly<{
  /** 本次 observed compile 内唯一的 observer key */
  key: string;
  /** 为每次 compile 创建独立 session */
  createSession: () => CompileObserverSession<TOutput>;
}>;

/** 一次 observed compile 独占的 observer session */
export type CompileObserverSession<TOutput = unknown> = Readonly<{
  /** 在 owner compile 前决定是否需要捕获产物 */
  select: (site: CompileObservationSite) => boolean;
  /** 消费最终 occurrence；probe 和失败候选不会调用此方法 */
  observe: (observation: CompileObservation, context: CompileObservationContext) => void;
  /** 在所有最终 observation dispatch 后生成 canonical observer output */
  complete: () => TOutput;
}>;

/** 一个 observer 的完成结果 */
export type CompileObserverOutput<TOutput = unknown> = Readonly<{
  /** observer definition key */
  key: string;
  /** observer session 的 canonical output */
  value: TOutput;
}>;
