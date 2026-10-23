import type { JsonValue } from '@retikz/foundation';
import { assertNonEmptyString } from '@retikz/foundation';
import type { AffineMatrix, CenteredBox, Position } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import type { IRChild } from '../schemas';
import type { ResolvedTheme } from '../shared';
import type { CompileOccurrenceLocator } from './occurrence';
import type { Scene, PathCommand, SceneClipPath } from './scene';
import type { GeometryKeyPoint } from './shape';

/** 能够声明最终编译产物的领域中立所属者 */
export type CompileObservationOwner =
  | Readonly<{
      /** 当前被观测能力所属者的类别 */
      kind: 'composite';
      /** 被观测复合组件的注册命名空间 */
      namespace: string;
      /** 被观测复合组件的注册类型 */
      type: string;
    }>
  | Readonly<{
      /** 当前被观测能力所属者的类别 */
      kind: 'path';
      /** 被观测路径种类的注册名称 */
      name: string;
    }>
  | Readonly<{
      /** 当前被观测能力所属者的类别 */
      kind: 'node';
    }>
  | Readonly<{
      /** 当前被观测能力所属者的类别 */
      kind: 'scope';
    }>
  | Readonly<{
      /** 当前被观测能力所属者的类别 */
      kind: 'coordinate';
    }>
  | Readonly<{
      /** 当前被观测能力所属者的类别 */
      kind: 'clip';
    }>;

/** 最终 observation 所属的逻辑容器链条项 */
export type CompileObservationAncestor = Readonly<{
  /** 容器所属者；不包含当前 observation 自身 */
  owner: Extract<CompileObservationOwner, { kind: 'scope' | 'composite' }>;
  /** 容器对应的最终 occurrence */
  occurrence: CompileOccurrenceLocator;
}>;

/**
 * Path kind 在需要时发布最终产物的编译期 publisher
 * @template TValue 所属者发布和观察的 JSON 产物类型
 */
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
    | Readonly<{
        /** 诊断来自主编译或观察过程 */
        kind: 'primary';
      }>
    | Readonly<{
        /** 诊断来自主编译或观察过程 */
        kind: 'observation';
        /** 产生该观察诊断的能力所属者 */
        owner: CompileObservationOwner;
        /** 观察诊断对应的编译出现位置 */
        occurrence: CompileOccurrenceLocator;
        /** 诊断来自所属者产物处理还是隔离片段编译 */
        stage: 'owner' | 'fragment';
      }>;
}>;

/**
 * 一次最终所属者产物观察事件
 * @template TValue 所属者发布和观察的 JSON 产物类型
 */
export type CompileObservation<TValue extends JsonValue = JsonValue> = Readonly<{
  /** 所属者身份 */
  owner: CompileObservationOwner;
  /** 最终逻辑树中的 occurrence */
  occurrence: CompileOccurrenceLocator;
  /** 从外到内排列的最终逻辑容器链条，不包括当前 observation 自身 */
  ancestors: ReadonlyArray<CompileObservationAncestor>;
  /** 已隔离并冻结的所属者产物 */
  value: TValue;
  /** 从所属者局部坐标到主 Scene 坐标的仿射矩阵 */
  transform: AffineMatrix;
  /** probe/replay 来源追踪 */
  provenance: CompileObservationProvenance;
}>;

/** observer 在一次 observed compile 中使用的上下文 */
export type CompileObservationContext = Readonly<{
  /** 按本次主图编译精度舍入数值 */
  round: (value: number) => number;
  /** 当前最终 occurrence 的完整、只读 Theme */
  theme: ResolvedTheme;
  /** 在当前 occurrence 环境中编译隔离的普通 IR 片段 */
  compileFragment: (children: IRChild | ReadonlyArray<IRChild>) => CompiledSceneFragment;
}>;

/** 隔离片段编译结果，不并入 primary compile result */
export type CompiledSceneFragment = Readonly<{
  /** 当前出现位置局部坐标中的场景 */
  scene: Scene;
  /** fragment 内产生的 artifacts */
  artifacts: ReadonlyArray<CompileFragmentArtifact>;
  /** fragment 内产生的 diagnostics */
  diagnostics: ReadonlyArray<CompileFragmentDiagnostic>;
}>;

/**
 * 一次 observer 定义
 * @template TOutput 观察会话完成时产生的结果类型
 */
export type CompileObserverDefinition<TOutput = unknown> = Readonly<{
  /** 本次 observed compile 内唯一的 observer key */
  key: string;
  /** 为每次 compile 创建独立 session */
  createSession: () => CompileObserverSession<TOutput>;
}>;

/**
 * 一次 observed compile 独占的 observer session
 * @template TOutput 观察会话完成时产生的结果类型
 */
export type CompileObserverSession<TOutput = unknown> = Readonly<{
  /** 在 owner compile 前决定是否需要捕获产物 */
  select: (site: CompileObservationSite) => boolean;
  /** 消费最终 occurrence；probe 和失败候选不会调用此方法 */
  observe: (observation: CompileObservation, context: CompileObservationContext) => void;
  /** 在所有最终 observation dispatch 后生成 canonical observer output */
  complete: () => TOutput;
}>;

/**
 * 一个 observer 的完成结果
 * @template TOutput 观察会话完成时产生的结果类型
 */
export type CompileObserverOutput<TOutput = unknown> = Readonly<{
  /** 观察者定义的注册键 */
  key: string;
  /** observer session 的 canonical output */
  value: TOutput;
}>;

/** Node 最终 occurrence 的局部几何与正文布局产物 */
export type NodeOwnerOutput = {
  /** 最终节点外框 */
  rect: CenteredBox;
  /** 节点形状的轮廓与关键点 */
  shape: {
    /** 形状注册名 */
    name: string;
    /** 闭合轮廓，未提供时为 null */
    outline: Array<PathCommand> | null;
    /** 命名关键点，未提供时为 null */
    keyPoints: Array<GeometryKeyPoint> | null;
  };
  /** 节点连接边界的轮廓 */
  boundary: {
    /** 边界注册名 */
    name: string;
    /** 闭合轮廓，未提供时为 null */
    outline: Array<PathCommand> | null;
  };
  /** 正文角点与物理文本行基线，无正文时为 null */
  content: {
    /** 正文四角，按轮廓顺序排列 */
    corners: [Position, Position, Position, Position];
    /** 各物理文本行的基线端点 */
    baselines: Array<{ from: Position; to: Position }>;
  } | null;
};

/** Scope 最终 occurrence 的固有包络产物 */
export type ScopeOwnerOutput = {
  /** 子节点决定的固有包络，无贡献时为 null */
  envelope: {
    /** 包络形状 */
    shape: 'rectangle' | 'circle';
    /** 包络外框 */
    rect: CenteredBox;
  } | null;
};

/** Coordinate 最终 occurrence 的已解析点产物 */
export type CoordinateOwnerOutput = {
  /** 坐标标识 */
  id: string;
  /** occurrence 局部坐标 */
  position: Position;
};

/** 一次 Clip 应用的最终 lowering 路径产物 */
export type ClipOwnerOutput = {
  /** 最终裁剪路径 */
  path: SceneClipPath;
};

/**
 * 定义一次显式 observed compile observer
 * @template TOutput 观察会话完成时产生的结果类型
 */
export const defineCompileObserver = <TOutput>(
  definition: CompileObserverDefinition<TOutput>,
): CompileObserverDefinition<TOutput> => {
  if (typeof definition.key !== 'string')
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: key must be a non-empty string.');

  assertNonEmptyString(
    definition.key,
    'defineCompileObserver: key',
    () => new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: key must be a non-empty string.'),
  );
  if (typeof definition.createSession !== 'function') {
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: createSession must be a function.');
  }

  return definition;
};

/** 判断两个编译 observation 所属者是否相同 */
export const isCompileObservationOwnerEqual = (
  left: CompileObservationOwner,
  right: CompileObservationOwner,
): boolean => {
  if (left.kind !== right.kind) return false;

  switch (left.kind) {
    case 'path':
      return right.kind === 'path' && left.name === right.name;
    case 'composite':
      return right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type;
    case 'node':
    case 'scope':
    case 'coordinate':
    case 'clip':
      return true;
  }
};
