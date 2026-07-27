import type { RuntimeIdentity, RuntimeRevision } from '@retikz/runtime';

import type { Scene, ScenePrimitive, SceneResource } from '../scene';

/** 把 Runtime 公开 DTO 递归收窄为只读结构，同时保留 callback identity */
export type RuntimeDeepReadonly<T> = T extends (...args: infer TArgs) => infer TResult
  ? (...args: TArgs) => TResult
  : T extends ReadonlyArray<infer TItem>
    ? ReadonlyArray<RuntimeDeepReadonly<TItem>>
    : T extends object
      ? { readonly [TKey in keyof T]: RuntimeDeepReadonly<T[TKey]> }
      : T;

/** Runtime Session 持有的 deeply immutable Scene */
export type RuntimeScene = RuntimeDeepReadonly<Omit<Scene, 'resources' | 'animations'>> &
  Readonly<{
    /** 规范化后的有序资源表 */
    resources: ReadonlyArray<RuntimeSceneResource>;
    /** 规范化后的根动画轨道 */
    animations: RuntimeDeepReadonly<NonNullable<Scene['animations']>>;
  }>;

/** Runtime Patch 携带的 deeply immutable Scene primitive */
export type RuntimeScenePrimitive = RuntimeDeepReadonly<ScenePrimitive>;

/** Runtime Patch 携带的 deeply immutable Scene resource */
export type RuntimeSceneResource = RuntimeDeepReadonly<SceneResource>;

/** 完整 Scene 中一个 primitive occurrence 的 Runtime topology */
export type SceneRuntimeNode = Readonly<{
  /** primitive occurrence 的稳定 identity */
  identity: RuntimeIdentity;
  /** 产生该 primitive 的语义 owner */
  semanticOwner: RuntimeIdentity;
  /** document root 或父 Group occurrence */
  parent: RuntimeIdentity;
  /** 在同一 parent 内的 canonical 顺序 */
  order: number;
  /** 从 Scene primitives 根数组开始的 zero-based occurrence path */
  primitivePath: ReadonlyArray<number>;
  /** 可选用户公开 id */
  publicId?: string;
}>;

/** Patch subtree 中一个相对 primitive occurrence 的 Runtime topology */
export type SceneRuntimeSubtreeNode = Readonly<{
  /** subtree 内稳定 identity */
  identity: RuntimeIdentity;
  /** 产生该 primitive 的语义 owner */
  semanticOwner: RuntimeIdentity;
  /** subtree 内父 occurrence，root 缺省 */
  parent?: RuntimeIdentity;
  /** 在同一 parent 内的 canonical 顺序 */
  order: number;
  /** 从 subtree root primitive 开始的相对 occurrence path */
  primitivePath: ReadonlyArray<number>;
  /** 可选用户公开 id */
  publicId?: string;
}>;

/** Runtime participant 消费的完整 Scene 与 identity topology */
export type SceneRuntimeSnapshot = Readonly<{
  /** snapshot 所属 session revision */
  revision: RuntimeRevision;
  /** deeply immutable 完整 Scene */
  scene: RuntimeScene;
  /** 不对应 Scene primitive 的 document root identity */
  root: RuntimeIdentity;
  /** 与 Scene primitive occurrences 严格双射的 topology */
  topology: ReadonlyArray<SceneRuntimeNode>;
}>;

/** insert/update operation 携带的相对 Scene subtree */
export type SceneRuntimeSubtree = Readonly<{
  /** 对应 subtree primitive 的 root identity */
  root: RuntimeIdentity;
  /** subtree root primitive */
  primitive: RuntimeScenePrimitive;
  /** 以 subtree root 为原点的相对 topology */
  topology: ReadonlyArray<SceneRuntimeSubtreeNode>;
}>;

/** Scene Patch 的规范化原子 operation */
export type ScenePatchOperation =
  | Readonly<{
      /** operation 判别符 */
      kind: 'insert';
      /** 接收 subtree root 的 next parent identity */
      parent: RuntimeIdentity;
      /** next topology 中同 parent 的后继 sibling，缺省时追加到末尾 */
      before?: RuntimeIdentity;
      /** 待插入的完整相对 Scene subtree */
      subtree: SceneRuntimeSubtree;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'update';
      /** 被替换的现有 subtree root identity，必须等于 subtree.root */
      identity: RuntimeIdentity;
      /** 替换 primitive 与 descendants 的完整相对 Scene subtree */
      subtree: SceneRuntimeSubtree;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'remove';
      /** 被移除的现有 subtree root identity */
      identity: RuntimeIdentity;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'move';
      /** 保持自身与 descendants identity 不变的现有 subtree root */
      identity: RuntimeIdentity;
      /** subtree root 的 next parent identity */
      parent: RuntimeIdentity;
      /** next topology 中同 parent 的后继 sibling，缺省时移动到末尾 */
      before?: RuntimeIdentity;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'setLayout';
      /** 完整 next Scene layout */
      layout: RuntimeDeepReadonly<Scene['layout']>;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'setResources';
      /** 完整 next ordered resources，空数组表示清除全部资源 */
      resources: ReadonlyArray<RuntimeSceneResource>;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'setAnimations';
      /** 完整 next root animation tracks，空数组表示清除全部根动画 */
      animations: RuntimeDeepReadonly<NonNullable<Scene['animations']>>;
    }>
  | Readonly<{
      /** operation 判别符 */
      kind: 'replaceScene';
      /** 替换 current 的完整 next snapshot，必须是 Patch 中唯一 operation */
      snapshot: SceneRuntimeSnapshot;
    }>;

/** 从 current revision 原子转换到 candidate revision 的 Scene Patch */
export type ScenePatch = Readonly<{
  /** Patch 所基于的 current revision */
  baseRevision: RuntimeRevision;
  /** Patch 应发布的 candidate revision */
  nextRevision: RuntimeRevision;
  /** 按规范化顺序执行的 operations */
  operations: ReadonlyArray<ScenePatchOperation>;
}>;
