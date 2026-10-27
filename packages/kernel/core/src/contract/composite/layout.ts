import type { ValueOf, JsonValue } from '@retikz/foundation';
import type { BoundsRect } from '@retikz/math';

import type { IRChild, IRClip, IRPosition, IRScopeProps, IRTarget } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
import type { Transform } from '../scene';
import type { SpatialHandleDeclaration } from '../spatial-handle';
import type { CompositeBoundChild, CompositeRuntimeInputContext } from './input';

/** 单轴布局提案的判别值 */
export const LayoutAxisProposalKind = {
  /** 请求子节点的内在尺寸贡献 */
  Intrinsic: 'intrinsic',
  /** 请求子节点在指定尺寸范围内布局 */
  Range: 'range',
  /** 要求子节点使用固定尺寸 */
  Exact: 'exact',
} as const;

/** 内在尺寸提案的查询模式 */
export const LayoutIntrinsicMode = {
  /** 最小合法尺寸贡献 */
  Minimum: 'minimum',
  /** 自然尺寸贡献 */
  Natural: 'natural',
} as const;

/** 对齐参考线所属的一维坐标轴 */
export const LayoutAlignmentGuideDimension = {
  /** 水平轴 */
  X: 'x',
  /** 垂直轴 */
  Y: 'y',
} as const;

/** Core 提供的稳定对齐参考线名称 */
export const BuiltinLayoutAlignmentGuideName = {
  /** 首行基线 */
  FirstBaseline: 'first-baseline',
  /** 末行基线 */
  LastBaseline: 'last-baseline',
} as const;

/** 子节点探测结果的判别值 */
export const LayoutChildProbeKind = {
  /** 探测成功 */
  Resolved: 'resolved',
  /** 探测失败 */
  Failed: 'failed',
} as const;

/** 根布局感知复合节点使用的深冻结自然尺寸提案 */
export const NaturalLayoutProposal = Object.freeze({
  x: Object.freeze({
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  }),
  y: Object.freeze({
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  }),
}) satisfies LayoutProposal;

/** 单轴 layout proposal 的判别值 */
export type LayoutAxisProposalKind = ValueOf<typeof LayoutAxisProposalKind>;

/** intrinsic contribution 查询模式 */
export type LayoutIntrinsicMode = ValueOf<typeof LayoutIntrinsicMode>;

/** alignment guide 所属维度的判别值 */
export type LayoutAlignmentGuideDimension = ValueOf<typeof LayoutAlignmentGuideDimension>;

/** Core 内置 alignment guide 的稳定名称 */
export type BuiltinLayoutAlignmentGuideName = ValueOf<typeof BuiltinLayoutAlignmentGuideName>;

/** child probe 的结果判别值 */
export type LayoutChildProbeKind = ValueOf<typeof LayoutChildProbeKind>;

/** 父布局传给子项的单轴尺寸提案 */
export type LayoutAxisProposal =
  | Readonly<{
      /** 查询子项的内在尺寸贡献 */
      kind: typeof LayoutAxisProposalKind.Intrinsic;
      /** 查询最小或自然尺寸贡献 */
      mode: LayoutIntrinsicMode;
    }>
  | Readonly<{
      /** 在可用区间内确定布局槽位 */
      kind: typeof LayoutAxisProposalKind.Range;
      /** 布局槽位的有限非负最小尺寸 */
      min: number;
      /** 布局槽位的有限非负最大尺寸；省略表示无上限 */
      max?: number;
    }>
  | Readonly<{
      /** 父布局要求固定大小的布局槽位 */
      kind: typeof LayoutAxisProposalKind.Exact;
      /** 布局槽位的有限非负固定尺寸 */
      value: number;
    }>;

/** 父布局传给任意子项的双轴尺寸提案 */
export type LayoutProposal = Readonly<{
  /** 水平轴尺寸提案 */
  x: LayoutAxisProposal;
  /** 垂直轴尺寸提案 */
  y: LayoutAxisProposal;
}>;

/** 子项局部布局坐标中的一维对齐参考线 */
export type LayoutAlignmentGuide = Readonly<{
  /** 开放的对齐线名称 */
  name: string;
  /** 对齐线所属的一维坐标轴 */
  dimension: LayoutAlignmentGuideDimension;
  /** 子项局部布局坐标中的有限位置 */
  position: number;
}>;

declare const replayBrand: unique symbol;

/**
 * 仅在当前编译内有效的重放令牌
 * @description 只能在创建它的同一次 compile 中放置一次，不能序列化或伪造
 */
export type CompositeReplay = Readonly<{
  [replayBrand]: never;
}>;

/** 已完成一次真实子布局、可供父复合组件选择的结果 */
export type LayoutChildResult = Readonly<{
  /** 本次尺寸提案求值后不含原点位置的布局槽位 */
  slotSize: Readonly<{
    /** 槽位宽度 */
    width: number;
    /** 槽位高度 */
    height: number;
  }>;
  /** child 在自身局部坐标中的真实布局占用 */
  allocationBounds: Readonly<BoundsRect>;
  /** 最终静态 primitive tree 的保守局部视觉包络 */
  visualBounds: Readonly<BoundsRect>;
  /** 子项局部布局坐标中已分离并冻结的对齐线 */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
  /** 对应本次布局结果的不透明重放令牌 */
  replay: CompositeReplay;
}>;

declare const layoutChildFailureBrand: unique symbol;

/** 仅限当前编译回调使用的不透明子项试算失败句柄 */
export type LayoutChildFailure = Readonly<{
  [layoutChildFailureBrand]: never;
}>;

/** 子项布局试算的成功结果或失败句柄 */
export type LayoutChildProbe =
  | Readonly<{
      /** 试算已得到可重放结果 */
      kind: typeof LayoutChildProbeKind.Resolved;
      /** 当前回调拥有的布局结果 */
      result: LayoutChildResult;
    }>
  | Readonly<{
      /** 试算失败，可舍弃或显式抛出 */
      kind: typeof LayoutChildProbeKind.Failed;
      /** 当前回调拥有的不透明失败句柄 */
      failure: LayoutChildFailure;
    }>;

declare const compositeCompileChildBrand: unique symbol;

/**
 * 仅限当前编译回调使用的复合组件输出子项
 * @description 只能由当前 composite callback 的 `replay()` 或 `createScope()` 创建，不能读取、伪造、序列化、跨 callback 或跨 compile 使用
 */
export type CompositeCompileChild = Readonly<{
  [compositeCompileChildBrand]: never;
}>;

/** 复合组件创建的完整 authored Scope props */
export type CompositeCompileScopeProps = Readonly<
  Omit<IRScopeProps, 'transforms' | 'animations'> & {
    /** Scope authored transform，沿普通 Scope pipeline 在 compile 阶段 lowering */
    transforms?: ReadonlyArray<NonNullable<IRScopeProps['transforms']>[number]>;
    /** Scope group 的声明式动画轨道 */
    animations?: ReadonlyArray<NonNullable<IRScopeProps['animations']>[number]>;
  }
>;

/** replay 外层允许附加的无 identity Scope 语义 */
export type CompositeReplayWrapper = Readonly<{
  /** replay root primitive 共享的已 lowering 数值变换 */
  transforms?: ReadonlyArray<Transform>;
  /** placement transform 后、parent allocation coordinate 中的裁剪区域 */
  clip?: IRClip;
}>;

/** 在当前编译环境中查询 child 根局部空间的有序路径目标 */
export type PathTargetQuery = Readonly<{
  /** 提供真实布局、引用和定义绑定的 child */
  child: IRChild;
  /** 初始参考点；相对形式以局部原点为基准 */
  source: IRTarget;
  /** 按 smooth cursor 规则消费的目标序列 */
  points: ReadonlyArray<IRTarget>;
}>;

/** 与输入点列一一对应的有限局部坐标，不包含路径裁剪或插值 */
export type PathTargetQueryResult = Readonly<{
  /** 起始参考点 */
  source: Readonly<IRPosition>;
  /** 有序目标参考点 */
  points: ReadonlyArray<Readonly<IRPosition>>;
}>;

/** 当前查询需要的尺寸轴 */
export type LayoutMeasurementAxis = 'x' | 'y' | 'both';

/** 仅包含已请求轴的尺寸贡献，不携带几何或提交状态 */
export type LayoutContribution =
  | Readonly<{ axis: 'x'; width: number }>
  | Readonly<{ axis: 'y'; height: number }>
  | Readonly<{ axis: 'both'; width: number; height: number }>;

/** 统一组件求值的需求 */
export type CompositeEvaluation =
  | Readonly<{ kind: 'layout' }>
  | Readonly<{ kind: 'contribution'; axis: LayoutMeasurementAxis }>;

/** 组件按需返回的真实布局占用尺寸，由 Core 投影成提案槽位 */
export type CompositeContributionResult = Readonly<{
  /** 仅用于尺寸贡献求值 */
  kind: 'contribution';
  /** 与当前请求轴完全对应的布局占用尺寸 */
  contribution: LayoutContribution;
}>;

/** 尺寸查询的成功贡献或当前回调拥有的失败 */
export type LayoutMeasurementProbe =
  | Readonly<{ kind: 'resolved'; result: LayoutContribution }>
  | Readonly<{ kind: 'failed'; failure: LayoutChildFailure }>;

/**
 * 复合组件返回的完整布局结果或按需尺寸贡献
 * @template TArtifact 完整布局结果可携带的 JSON 产物类型，默认 never 表示不声明产物
 */
export type CompositeEvaluationResult<TArtifact extends JsonValue = never> =
  | CompositeCompileResult<TArtifact>
  | CompositeContributionResult;

/** 复合组件可见的受限编译上下文 */
export type CompositeCompileContext = CompositeRuntimeInputContext &
  Readonly<{
    /** 当前复合组件位置完整、只读的有效主题 */
    theme: ResolvedTheme;
    /** 当前求值需要完整布局或指定轴的布局尺寸贡献 */
    evaluation: CompositeEvaluation;
    /** 隔离查询尺寸贡献；结果不可重放 */
    measureChild: (
      child: IRChild | CompositeBoundChild,
      proposal: LayoutProposal,
      axis: LayoutMeasurementAxis,
    ) => LayoutMeasurementProbe;
    /** 当前复合组件实例从父级收到的完整双轴尺寸提案 */
    proposal: LayoutProposal;
    /**
     * 创建使用局部 Theme 的编译上下文，复用当前 callback 的 probe、replay 与输入所有权
     * @description 通过 Core 已注册的 Theme definitions 解析覆盖；测量与目标查询使用解析后的主题，不修改父上下文。最终输出仍须由 createScope() 声明同一主题边界
     */
    withTheme: (theme: NonNullable<IRScopeProps['theme']>) => CompositeCompileContext;
    /**
     * 从当前 composite Source occurrence 发出非致命编译 warning
     * @param code 开放的机器可读 warning code
     * @param message 面向调用方的英文消息
     * @param subPath 相对当前 composite Source occurrence 的可选 jq-like 路径
     */
    warn: (code: string, message: string, subPath?: string) => void;
    /** 在完整编译环境中试算任意子项的布局 */
    layoutChild: (child: IRChild | CompositeBoundChild, proposal: LayoutProposal) => LayoutChildProbe;
    /** 隔离绑定真实 child 后查询有序目标，不提交 probe 绘图或修改作者点列 */
    resolvePathTargets: (query: PathTargetQuery) => PathTargetQueryResult;
    /**
     * 把当前回调的一次布局结果转为只能放置一次的输出子项
     * @param result 当前回调中试算成功的布局结果
     * @param wrapper replay 提交时应用的数值变换与裁剪外壳
     */
    replay: (result: LayoutChildResult, wrapper?: CompositeReplayWrapper) => CompositeCompileChild;
    /**
     * 抛出当前回调创建的子项试算失败
     * @param failure 当前回调中试算失败的句柄
     */
    raise: (failure: LayoutChildFailure) => never;
    /**
     * 创建递归 runtime Scope output child
     * @description props 沿普通 Scope orchestration 消费；replay child 仍只通过 replay wrapper 接收布局提交变换与裁剪
     * @param props 完整 authored Scope props
     * @param children 普通 IR child 或当前 callback 创建的 opaque child
     * @param spatialHandles 附着到该 Scope 局部坐标并在最终可达 output tree 中发布的空间声明
     */
    createScope: (
      props: CompositeCompileScopeProps,
      children: ReadonlyArray<IRChild | CompositeCompileChild | CompositeBoundChild>,
      spatialHandles?: ReadonlyArray<SpatialHandleDeclaration>,
    ) => CompositeCompileChild;
  }>;

/**
 * 复合组件的编译输出
 * @template TArtifact 可选 JSON 产物的类型，默认 never 表示不声明产物
 */
export type CompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  /** 普通 IR、绑定子项或当前回调创建的运行时输出 */
  children: ReadonlyArray<IRChild | CompositeCompileChild | CompositeBoundChild>;
  /** 当前组件局部坐标中的空间声明；输出含带位置或变换的普通 Scope 时改用 createScope() 的局部声明 */
  spatialHandles?: ReadonlyArray<SpatialHandleDeclaration>;
  /** 组件对父布局声明的布局占用；省略时合并最终子项 */
  allocationBounds?: Readonly<BoundsRect>;
  /** 当前组件局部坐标中的对齐线 */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });
