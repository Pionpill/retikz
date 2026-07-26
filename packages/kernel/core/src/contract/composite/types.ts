import type { BoundsRect } from '@retikz/math';
import type { ZodType } from 'zod';

import type { IRChild, JsonValue } from '../../schemas';
import type { Transform } from '../scene';

/** 子内容布局约束 */
export type ChildLayoutConstraint =
  | Readonly<{ kind: 'intrinsic' }>
  | Readonly<{
      kind: 'constrained';
      /** allocation box 的有限非负宽度上限 */
      maxWidth: number;
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
  /** 最终静态 primitive tree 的保守局部视觉包络 */
  visualBounds: Readonly<BoundsRect>;
  /** 对应本次布局结果的 opaque replay token */
  replay: CompositeReplay;
}>;

/** layout-aware composite 可见的受限编译上下文 */
export type LayoutCompositeCompileContext = Readonly<{
  /** 当前 composite occurrence 从父级收到的约束 */
  constraint: ChildLayoutConstraint;
  /** 在完整 compile 环境中布局任意 child */
  layoutChild: (child: IRChild, constraint: ChildLayoutConstraint) => LayoutChildResult;
}>;

/** 把已布局结果放入 layout-aware composite 的最终逻辑输出 */
export type CompositeReplayPlacement = Readonly<{
  kind: 'replay';
  replay: CompositeReplay;
  /** 在 replay 提交时应用的数值 transform */
  transforms?: ReadonlyArray<Transform>;
}>;

/** layout-aware composite 的最终输出 */
export type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  /** 普通 child 继续编译，replay placement 直接提交已保存结果 */
  children: ReadonlyArray<IRChild | CompositeReplayPlacement>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });

type LayoutCompositeBranch<TNode, TArtifact extends JsonValue> = [TArtifact] extends [never]
  ? {
      expand?: never;
      compile: (
        node: TNode,
        context: LayoutCompositeCompileContext,
      ) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
    }
  : {
      expand?: never;
      compile: (
        node: TNode,
        context: LayoutCompositeCompileContext,
      ) => LayoutCompositeCompileResult<TArtifact>;
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
> = Extract<
  CompositeDefinition<TNode, TNamespace, TType, TArtifact>,
  { compile: unknown }
>;

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
      compile: (
        node: never,
        context: LayoutCompositeCompileContext,
      ) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
    }
  | {
      namespace: string;
      type: string;
      schema: ZodType;
      expand?: never;
      compile: (
        node: never,
        context: LayoutCompositeCompileContext,
      ) => LayoutCompositeCompileResult<JsonValue>;
      artifactSchema: ZodType<JsonValue>;
    };

/** registry、adapter 与 provider resolver 使用的安全异构 composite 容器 */
export type AnyCompositeDefinition = AnyExpandCompositeDefinition | AnyLayoutCompositeDefinition;
