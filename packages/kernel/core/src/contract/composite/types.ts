import type { BoundsRect } from '@retikz/math';
import type { ZodType } from 'zod';

import type {
  IRAnimationTrack,
  IRChild,
  IRClipSpec,
  IRJsonObject,
  JsonValue,
  ScopeBoundingShapeValue,
} from '../../schemas';
import type { Transform } from '../scene';

/** 父布局分配给 child 单轴的尺寸约束 */
export type ChildLayoutAxisConstraint =
  | Readonly<{
      /** 在有限区间内保留 child 的真实占用，slot 取 clamp 后尺寸 */
      kind: 'bounded';
      /**
       * slot 的有限非负最小尺寸
       * @default 0
       */
      min?: number;
      /** slot 的有限非负最大尺寸 */
      max: number;
    }>
  | Readonly<{
      /** 父布局已经分配固定 slot */
      kind: 'exact';
      /** slot 的有限非负固定尺寸 */
      size: number;
    }>;

/** 父布局传给任意 child 的双轴布局约束 */
export type ChildLayoutConstraint =
  | Readonly<{ kind: 'intrinsic' }>
  | Readonly<{
      kind: 'constrained';
      /** width 轴约束；省略表示 indefinite */
      width?: ChildLayoutAxisConstraint;
      /** height 轴约束；省略表示 indefinite */
      height?: ChildLayoutAxisConstraint;
    }>;

/** 父布局为 child 分配的二维 slot 尺寸 */
export type ChildLayoutSize = Readonly<{
  /** slot 宽度 */
  width: number;
  /** slot 高度 */
  height: number;
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
  /** 父布局应为 child 保留的局部坐标包络 */
  allocationBounds: Readonly<BoundsRect>;
  /** 父布局按双轴约束分配的尺寸，不包含位置或对齐语义 */
  slotSize: ChildLayoutSize;
  /** 最终静态 primitive tree 的保守局部视觉包络 */
  visualBounds: Readonly<BoundsRect>;
  /** 对应本次布局结果的 opaque replay token */
  replay: CompositeReplay;
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
  /** replay local space 中的裁剪区域 */
  clip?: IRClipSpec;
}>;

/** layout-aware composite 可见的受限编译上下文 */
export type LayoutCompositeCompileContext = Readonly<{
  /** 当前 composite occurrence 从父级收到的约束 */
  constraint: ChildLayoutConstraint;
  /** 在完整 compile 环境中布局任意 child */
  layoutChild: (child: IRChild, constraint: ChildLayoutConstraint) => LayoutChildResult;
  /**
   * 把当前 callback 的一次布局结果转为 one-use output child
   * @param result 当前 callback 的 `layoutChild()` 返回值
   * @param wrapper replay 提交时应用的数值变换与裁剪外壳
   */
  replay: (result: LayoutChildResult, wrapper?: CompositeReplayWrapper) => CompositeCompileChild;
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

/** layout-aware composite 的最终输出 */
export type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  /** 普通 child 继续编译，opaque child 在当前 callback 的 runtime output tree 中解析 */
  children: ReadonlyArray<IRChild | CompositeCompileChild>;
  /** composite 对父布局声明的 container allocation box；省略时由最终 children 合并 */
  allocationBounds?: Readonly<BoundsRect>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });

type LayoutCompositeBranch<TNode, TArtifact extends JsonValue> = [TArtifact] extends [never]
  ? {
      expand?: never;
      compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
    }
  : {
      expand?: never;
      compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<TArtifact>;
      artifactSchema: ZodType<TArtifact>;
    };

/**
 * Tier 2 composite 注册项
 * @description 精确描述单个 composite 的 schema，以及互斥的无上下文 expand 或完整编译期 compile 分支
 */
export type CompositeDefinition<
  TNode,
  TNamespace extends string = string,
  TType extends string = string,
  TArtifact extends JsonValue = never,
> = {
  /** composite IR 节点引用的 provider namespace */
  namespace: TNamespace;
  /** composite IR 节点引用的 provider type */
  type: TType;
  /** 完整节点 schema；单个对象或对象 union 的 namespace / type 必须是相同 literal */
  schema: ZodType<TNode>;
} & (
  | {
      /** 把该 composite 节点无上下文展开为下一层 IR */
      expand: (node: TNode) => IRChild | Array<IRChild>;
      compile?: never;
      artifactSchema?: never;
    }
  | LayoutCompositeBranch<TNode, TArtifact>
);

/** 精确描述单个无上下文 expand composite definition */
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
> = Extract<CompositeDefinition<TNode, TNamespace, TType, TArtifact>, { compile: unknown }>;

/** 异构 registry 中擦除后的无上下文 composite */
export type AnyExpandCompositeDefinition = {
  namespace: string;
  type: string;
  schema: ZodType;
  expand: (node: never) => IRChild | Array<IRChild>;
  compile?: never;
  artifactSchema?: never;
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
    }
  | {
      namespace: string;
      type: string;
      schema: ZodType;
      expand?: never;
      compile: (node: never, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<JsonValue>;
      artifactSchema: ZodType<JsonValue>;
    };

/** registry、adapter 与 provider resolver 使用的安全异构 composite 容器 */
export type AnyCompositeDefinition = AnyExpandCompositeDefinition | AnyLayoutCompositeDefinition;
