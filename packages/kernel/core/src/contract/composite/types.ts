import type { BoundsRect } from '@retikz/math';
import type { z, ZodType } from 'zod';

import type {
  IRAnimationTrack,
  IRChild,
  IRClipSpec,
  IRJsonObject,
  IRTheme,
  JsonValue,
  ScopeBoundingShapeValue,
} from '../../schemas';
import type { ResolvedTheme, ValueOf } from '../../shared';
import type {
  CompositeInspectionChild,
  CompositeInspectorContext,
  InspectionPrimitive,
  LayoutCompositeInspectionContext,
  ResolvedBaseLayoutInspectOptions,
} from '../inspection';
import type { Transform } from '../scene';
import type {
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
} from './constants';

/** 单轴 layout proposal 的判别值 */
export type LayoutAxisProposalKindValue = ValueOf<typeof LayoutAxisProposalKind>;

/** intrinsic contribution 查询模式 */
export type LayoutIntrinsicModeValue = ValueOf<typeof LayoutIntrinsicMode>;

/** 父布局传给 child 单轴的上下文化尺寸 proposal */
export type LayoutAxisProposal =
  | Readonly<{
      /** 查询 child 的 intrinsic contribution */
      kind: typeof LayoutAxisProposalKind.Intrinsic;
      /** 查询最小或自然 contribution */
      mode: LayoutIntrinsicModeValue;
    }>
  | Readonly<{
      /** 在可用区间内解析 allocation slot */
      kind: typeof LayoutAxisProposalKind.Range;
      /** slot 的有限非负最小尺寸 */
      min: number;
      /** slot 的有限非负最大尺寸；省略表示无上限 */
      max?: number;
    }>
  | Readonly<{
      /** 父布局已要求固定 allocation slot */
      kind: typeof LayoutAxisProposalKind.Exact;
      /** slot 的有限非负固定尺寸 */
      value: number;
    }>;

/** 父布局传给任意 child 的完整双轴 proposal */
export type LayoutProposal = Readonly<{
  /** 水平轴 proposal */
  x: LayoutAxisProposal;
  /** 垂直轴 proposal */
  y: LayoutAxisProposal;
}>;

/** alignment guide 所属维度的判别值 */
export type LayoutAlignmentGuideDimensionValue = ValueOf<typeof LayoutAlignmentGuideDimension>;

/** Core 内置 alignment guide 的稳定名称 */
export type LayoutAlignmentGuideNameValue = ValueOf<typeof LayoutAlignmentGuideName>;

/** child-local allocation coordinate 中的一维 alignment guide */
export type LayoutAlignmentGuide = Readonly<{
  /** 开放的 guide 名称 */
  name: string;
  /** guide 所属的一维坐标轴 */
  dimension: LayoutAlignmentGuideDimensionValue;
  /** child-local allocation coordinate 中的有限位置 */
  position: number;
}>;

declare const replayBrand: unique symbol;

/**
 * compile-local replay token
 * @description 只能在创建它的同一次 compile 中放置一次，不能序列化或伪造
 */
export type CompositeReplay = Readonly<{
  [replayBrand]: never;
}>;

/** 已完成一次真实子布局、可供父 composite 选择的结果 */
export type LayoutChildResult = Readonly<{
  /** 本次 proposal 求值后的无原点 allocation slot */
  slotSize: Readonly<{
    /** slot 宽度 */
    width: number;
    /** slot 高度 */
    height: number;
  }>;
  /** child 在自身局部坐标中的真实布局占用 */
  allocationBounds: Readonly<BoundsRect>;
  /** 最终静态 primitive tree 的保守局部视觉包络 */
  visualBounds: Readonly<BoundsRect>;
  /** child-local allocation coordinate 中分离并冻结的 alignment guides */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
  /** 对应本次布局结果的 opaque replay token */
  replay: CompositeReplay;
}>;

declare const layoutChildFailureBrand: unique symbol;

/** callback-local、compile-local 的 opaque child probe failure */
export type LayoutChildFailure = Readonly<{
  [layoutChildFailureBrand]: never;
}>;

/** child probe 的结果判别值 */
export type LayoutChildProbeKindValue = ValueOf<typeof LayoutChildProbeKind>;

/** layoutChild 的 resolved 或 failed outcome */
export type LayoutChildProbe =
  | Readonly<{
      /** probe 已解析为可 replay 的结果 */
      kind: typeof LayoutChildProbeKind.Resolved;
      /** 当前 callback 拥有的布局结果 */
      result: LayoutChildResult;
    }>
  | Readonly<{
      /** probe 形成可丢弃或显式提升的失败 */
      kind: typeof LayoutChildProbeKind.Failed;
      /** 当前 callback 拥有的 opaque failure */
      failure: LayoutChildFailure;
    }>;

declare const compositeCompileChildBrand: unique symbol;

/**
 * layout-aware composite 的 compile-local 输出 child
 * @description 只能由当前 composite callback 的 `replay()` 或 `scope()` 创建，不能读取、伪造、序列化、跨 callback 或跨 compile 使用
 */
export type CompositeCompileChild = Readonly<{
  [compositeCompileChildBrand]: never;
}>;

/** runtime Scope 允许的结构属性 */
export type CompositeCompileScopeProps = Readonly<{
  /** 仅覆盖已声明字段的局部 Theme */
  theme?: IRTheme;
  /** 注册到父命名空间的 Scope id */
  id?: string;
  /** 是否隔离 Scope 子树内部命名 */
  localNamespace?: boolean;
  /** 已 lowering 的纯数值 Scene transforms */
  transforms?: ReadonlyArray<Transform>;
  /** Scope 局部坐标系中的裁剪区域 */
  clip?: IRClipSpec;
  /** Scope 作为一个同层单元参与排序的层级 */
  zIndex?: number;
  /** 有 id Scope 的包络形状 */
  boundingShape?: ScopeBoundingShapeValue;
  /** 透传到 Scene group 的 JSON 元数据 */
  meta?: IRJsonObject;
  /** 透传到 Scene group 的动画轨道 */
  animations?: ReadonlyArray<IRAnimationTrack>;
}>;

/** replay 外层允许附加的无 identity Scope 语义 */
export type CompositeReplayWrapper = Readonly<{
  /** replay root primitive 共享的已 lowering 数值变换 */
  transforms?: ReadonlyArray<Transform>;
  /** placement transform 后、parent allocation coordinate 中的裁剪区域 */
  clip?: IRClipSpec;
}>;

/** layout-aware composite 可见的受限编译上下文 */
export type LayoutCompositeCompileContext = Readonly<{
  /** 当前 composite 位置完整、只读的有效 Theme */
  theme: ResolvedTheme;
  /** 当前 composite occurrence 从父级收到的完整双轴 proposal */
  proposal: LayoutProposal;
  /** 在完整 compile 环境中 probe 任意 child */
  layoutChild: (child: IRChild, proposal: LayoutProposal, inspection?: CompositeInspectionChild) => LayoutChildProbe;
  /** 当前 Composite authored children 的 inspection sidecar */
  inspection: LayoutCompositeInspectionContext;
  /**
   * 把当前 callback 的一次布局结果转为 one-use output child
   * @param result 当前 callback 的 resolved probe result
   * @param wrapper replay 提交时应用的数值变换与裁剪外壳
   */
  replay: (result: LayoutChildResult, wrapper?: CompositeReplayWrapper) => CompositeCompileChild;
  /**
   * 提升当前 callback 创建的 child probe failure
   * @param failure 当前 callback 的 failed probe failure
   */
  raise: (failure: LayoutChildFailure) => never;
  /**
   * 创建递归 runtime Scope output child
   * @description 只支持结构属性，不重新施加样式默认、引用变换或 placement
   * @param props Scope 结构属性
   * @param children 普通 IR child 或当前 callback 创建的 opaque child
   */
  scope: (
    props: CompositeCompileScopeProps,
    children: ReadonlyArray<IRChild | CompositeCompileChild>,
  ) => CompositeCompileChild;
}>;

/** 无布局 Composite 展开时可见的只读编译上下文 */
export type CompositeExpandContext = Readonly<{
  /** 当前 composite 位置完整、只读的有效 Theme */
  theme: ResolvedTheme;
}>;

/** layout-aware composite 的最终输出 */
export type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  /** 普通 child 继续编译，opaque child 在当前 callback 的 runtime output tree 中解析 */
  children: ReadonlyArray<IRChild | CompositeCompileChild>;
  /** composite 对父布局声明的 container allocation box；省略时由最终 children 合并 */
  allocationBounds?: Readonly<BoundsRect>;
  /** composite 在自身局部 allocation coordinate 中显式声明、由 Core 校验并分离的 guides */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });

/** layout-aware Composite 可选的 artifact inspector */
export type CompositeInspectorDefinition<
  TArtifact extends JsonValue,
  TLocalShape extends z.ZodRawShape,
  TResolvedLocalOptions extends IRJsonObject,
> = Readonly<{
  /** inspector 类别 */
  kind: 'layout';
  /** family-local sparse admission schema */
  localOptionsInputSchema: z.ZodObject<TLocalShape>;
  /** family-local canonical resolved schema */
  localOptionsSchema: ZodType<TResolvedLocalOptions, z.output<z.ZodObject<TLocalShape>>>;
  /** 把最终 typed artifact lowering 为受限 inspection primitives */
  inspect: (
    artifact: TArtifact,
    context: CompositeInspectorContext<TResolvedLocalOptions> &
      Readonly<{ baseOptions: ResolvedBaseLayoutInspectOptions }>,
  ) => ReadonlyArray<InspectionPrimitive>;
}>;

/** registry 中安全擦除后的 inspector callable boundary */
export type AnyCompositeInspectorDefinition = Readonly<{
  kind: 'layout';
  localOptionsInputSchema: z.ZodObject;
  localOptionsSchema: ZodType;
  inspect: (artifact: never, context: never) => ReadonlyArray<InspectionPrimitive>;
}>;

type LayoutCompositeBranch<
  TNode,
  TArtifact extends JsonValue,
  TLocalShape extends z.ZodRawShape,
  TResolvedLocalOptions extends IRJsonObject,
> = [TArtifact] extends [never]
  ? {
      expand?: never;
      compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
      inspector?: never;
    }
  : {
      expand?: never;
      compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<TArtifact>;
      artifactSchema: ZodType<TArtifact>;
      inspector?: CompositeInspectorDefinition<TArtifact, TLocalShape, TResolvedLocalOptions>;
    };

/**
 * Tier 2 composite 注册项
 * @description 精确描述单个 composite 的 schema，以及互斥的轻量 expand 或完整编译期 compile 分支
 */
export type CompositeDefinition<
  TNode,
  TNamespace extends string = string,
  TType extends string = string,
  TArtifact extends JsonValue = never,
  TLocalShape extends z.ZodRawShape = z.ZodRawShape,
  TResolvedLocalOptions extends IRJsonObject = IRJsonObject,
> = {
  /** composite IR 节点引用的 provider namespace */
  namespace: TNamespace;
  /** composite IR 节点引用的 provider type */
  type: TType;
  /** 完整节点 schema；单个对象或对象 union 的 namespace / type 必须是相同 literal */
  schema: ZodType<TNode>;
} & (
  | {
      /** 把该 composite 节点按当前位置上下文展开为下一层 IR */
      expand: (node: TNode, context: CompositeExpandContext) => IRChild | Array<IRChild>;
      compile?: never;
      artifactSchema?: never;
      inspector?: never;
    }
  | LayoutCompositeBranch<TNode, TArtifact, TLocalShape, TResolvedLocalOptions>
);

/** 精确描述单个轻量 expand composite definition */
export type ExpandCompositeDefinition<
  TNode,
  TNamespace extends string = string,
  TType extends string = string,
> = Extract<CompositeDefinition<TNode, TNamespace, TType>, { expand: unknown }>;

/** 精确描述单个 layout-aware composite definition */
export type LayoutCompositeDefinition<
  TNode,
  TNamespace extends string = string,
  TType extends string = string,
  TArtifact extends JsonValue = never,
  TLocalShape extends z.ZodRawShape = z.ZodRawShape,
  TResolvedLocalOptions extends IRJsonObject = IRJsonObject,
> = Extract<
  CompositeDefinition<TNode, TNamespace, TType, TArtifact, TLocalShape, TResolvedLocalOptions>,
  { compile: unknown }
>;

/** 异构 registry 中擦除后的轻量 expand composite */
export type AnyExpandCompositeDefinition = {
  namespace: string;
  type: string;
  schema: ZodType;
  expand: (node: never, context: CompositeExpandContext) => IRChild | Array<IRChild>;
  compile?: never;
  artifactSchema?: never;
  inspector?: never;
};

/** 异构 registry 中擦除后的 layout-aware composite */
export type AnyLayoutCompositeDefinition =
  | {
      namespace: string;
      type: string;
      schema: ZodType;
      expand?: never;
      compile: (node: never, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
      inspector?: never;
    }
  | {
      namespace: string;
      type: string;
      schema: ZodType;
      expand?: never;
      compile: (node: never, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<JsonValue>;
      artifactSchema: ZodType<JsonValue>;
      inspector?: AnyCompositeInspectorDefinition;
    };

/** registry、adapter 与 provider resolver 使用的安全异构 composite 容器 */
export type AnyCompositeDefinition = AnyExpandCompositeDefinition | AnyLayoutCompositeDefinition;
