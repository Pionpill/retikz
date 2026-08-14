import type {
  CompileObservationOwner,
  CoreProviderContribution,
  IRChild,
  IRCoordinate,
  IRScene,
  IRViewBox,
} from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';

import type { AnyInputEmbed, AnyInputEmbedAdapter, InputEmbedThemeContextResolver } from '../embed';
import type { InputNode } from '../node';
import type { InputPath } from '../path';
import type { InputScope } from '../scope';

/** 输入分层缓存提示 */
export const InputLayerCache = {
  Static: 'static',
  Dynamic: 'dynamic',
  Auto: 'auto',
} as const;

/** 输入分层缓存提示取值 */
export type InputLayerCacheValue = ValueOf<typeof InputLayerCache>;

/** 作者侧 Layer 输入 */
export type InputLayer = {
  type: 'layer';
  /** 分层身份标识 */
  id: string;
  /** 运行时缓存提示 */
  cache?: InputLayerCacheValue;
  /** 同值保持声明顺序的分层排序值 */
  zIndex?: number;
  /** 按声明顺序归一的子节点 */
  children: ReadonlyArray<InputChild>;
};

/** 作者侧可写入 Scene 或 Scope 的子节点 */
export type InputChild =
  | InputNode
  | InputPath
  | InputScope
  | IRCoordinate
  | AnyInputEmbed
  | Exclude<IRChild, IRCoordinate>;

/** 作者侧 Scene 输入的公共字段 */
type InputSceneBase = Omit<IRScene, 'type' | 'version' | 'children'> & {
  type?: 'scene';
  version?: never;
  id?: string;
  theme?: IRScene['theme'];
  viewBox?: IRViewBox;
  animations?: IRScene['animations'];
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 使用 children 简写的作者侧 Scene 输入 */
export type InputSceneChildren = InputSceneBase & {
  children: ReadonlyArray<InputChild>;
  layers?: never;
};

/** 使用 Layer 列表的作者侧 Scene 输入 */
export type InputSceneLayers = InputSceneBase & {
  layers: ReadonlyArray<InputLayer>;
  children?: never;
};

/** 作者侧 Scene 输入 */
export type InputScene = InputSceneChildren | InputSceneLayers;

/** 归一化时报告给 processing driver 的作者来源类别 */
export type InputAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'embeddable';

/** 框架无关的作者来源信息 */
export type InputAuthoringSite = Readonly<{
  kind: InputAuthoringSiteKind;
  sourcePath: string;
  /** 对应的 Core 编译观察所属者 */
  owner?: CompileObservationOwner;
  type: string;
  authoring: unknown;
}>;

/** 运行时记录的单个 Layer metadata */
export type InputLayerMeta = Readonly<{
  id: string;
  cache: InputLayerCacheValue;
  order: number;
  zIndex: number;
  childIds: ReadonlyArray<string>;
  hasAnonymousChildren: boolean;
  invalidationBoundary: string;
}>;

/** 输入归一化产生的运行时 metadata */
export type InputRuntimeMeta = Readonly<{
  layers: ReadonlyArray<InputLayerMeta>;
  identityIndex: ReadonlyMap<string, ReadonlyArray<string>>;
  parentIndex: ReadonlyMap<string, string>;
}>;

/** 单次 Scene 输入归一化的完整结果 */
export type NormalizedInputScene = {
  /** 唯一的 Core Source IR */
  ir: IRScene;
  /** 原样收集，待 processing 唯一调用 Core resolver */
  contributions: ReadonlyArray<CoreProviderContribution>;
  /** 运行时缓存与失效边界 metadata */
  runtimeMeta: InputRuntimeMeta;
  /** 按作者顺序收集的 provenance */
  authoringSites: ReadonlyArray<InputAuthoringSite>;
};

/** Input 归一化选项 */
export type InputNormalizeOptions = {
  /** 调用方显式提供的 Tier 2 adapter */
  adapters?: ReadonlyArray<AnyInputEmbedAdapter>;
  /** 仅由 processing 准备并注入的 Scope Theme 上下文解析器 */
  embedThemeContext?: InputEmbedThemeContextResolver;
};
