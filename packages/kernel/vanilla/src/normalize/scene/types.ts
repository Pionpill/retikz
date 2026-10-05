import type {
  CompileObservationOwner,
  CompositeInputBinding,
  CoreProviderContribution,
  IRChild,
  IRCoordinate,
  IRScene,
  IRViewBox,
} from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';

import type { InputCoordinate } from '../coordinate';
import type { AnyInputEmbed, SynchronousInputEmbedAdapter, InputEmbedThemeContextResolver } from '../embed';
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
export type InputLayerCache = ValueOf<typeof InputLayerCache>;

/** 作者侧 Layer 输入 */
export type InputLayer = {
  /** 固定为 layer 的作者分层标识 */
  type: 'layer';
  /** 分层身份标识 */
  id: string;
  /** 运行时缓存提示
   * @default InputLayerCache.Auto
   */
  cache?: InputLayerCache;
  /** 同值保持声明顺序的分层排序值
   * @default 0
   */
  zIndex?: number;
  /** 按声明顺序归一的子节点 */
  children: ReadonlyArray<InputChild>;
};

/** 作者侧可写入 Scene 或 Scope 的子节点 */
export type InputChild =
  | InputNode
  | InputPath
  | InputScope
  | InputCoordinate
  | AnyInputEmbed
  | Exclude<IRChild, IRCoordinate>;

/** 作者侧 Scene 输入的公共字段 */
type InputSceneBase = Omit<IRScene, 'type' | 'version' | 'children'> & {
  /** 可省略的场景类别；归一化后固定为 scene */
  type?: 'scene';
  /** 作者输入不接受版本号；归一化时写入当前 IR 版本 */
  version?: never;
  /** 作者侧场景标识，不写入持久化 Scene IR */
  id?: string;
  /** 场景根主题，只填写需要覆盖的 style 与 mode */
  theme?: IRScene['theme'];
  /** 显式取景矩形；省略时由编译结果按内容计算 */
  viewBox?: IRViewBox;
  /** 场景根动画轨道，省略时不添加根动画 */
  animations?: IRScene['animations'];
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 使用 children 简写的作者侧 Scene 输入 */
export type InputSceneChildren = InputSceneBase & {
  /** 有序子图元，归一化时置于隐式默认层 */
  children: ReadonlyArray<InputChild>;
  /** children 模式不接受显式 layers */
  layers?: never;
};

/** 使用 Layer 列表的作者侧 Scene 输入 */
export type InputSceneLayers = InputSceneBase & {
  /** 显式分层列表，按 zIndex 稳定排序后归一化 */
  layers: ReadonlyArray<InputLayer>;
  /** layers 模式不接受顶层 children */
  children?: never;
};

/** 作者侧 Scene 输入 */
export type InputScene = InputSceneChildren | InputSceneLayers;

/** 归一化时报告给 processing driver 的作者来源类别 */
export type InputAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'node' | 'coordinate' | 'embeddable';

/** 框架无关的作者来源信息 */
export type InputAuthoringSite = Readonly<{
  /** 作者输入所属的节点或容器类别 */
  kind: InputAuthoringSiteKind;
  /** 该作者位置对应的 Source 路径 */
  sourcePath: string;
  /** 对应的 Core 编译观察所属者 */
  owner?: CompileObservationOwner;
  /** 当前输入的具体类型标识 */
  type: string;
  /** 由编译驱动解释的原始作者载荷，不进入 Core IR */
  authoring: unknown;
}>;

/** 运行时记录的单个 Layer metadata */
export type InputLayerMeta = Readonly<{
  /** 图层的稳定身份标识 */
  id: string;
  /** 已补齐缺省值的图层缓存提示 */
  cache: InputLayerCache;
  /** 图层稳定排序后的顺序编号 */
  order: number;
  /** 已补齐缺省值的绘制层级 */
  zIndex: number;
  /** 该图层直属子项中可识别的身份列表 */
  childIds: ReadonlyArray<string>;
  /** 该图层是否包含未声明身份的直属子项 */
  hasAnonymousChildren: boolean;
  /** 用于运行时失效传播的图层边界身份 */
  invalidationBoundary: string;
}>;

/** 输入归一化产生的运行时 metadata */
export type InputRuntimeMeta = Readonly<{
  /** 按最终图层顺序保存的运行时元数据 */
  layers: ReadonlyArray<InputLayerMeta>;
  /** 从规范身份键到完整身份路径的索引 */
  identityIndex: ReadonlyMap<string, ReadonlyArray<string>>;
  /** 从规范身份键到父身份的索引 */
  parentIndex: ReadonlyMap<string, string>;
}>;

/** 单次 Scene 输入归一化的完整结果 */
export type NormalizedInputScene = {
  /** 相对最终 Source IR 的 composite 实例输入 */
  runtimeInputs?: ReadonlyArray<CompositeInputBinding>;
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
  adapters?: ReadonlyArray<SynchronousInputEmbedAdapter<never>>;
  /** 仅由 processing 准备并注入的 Scope Theme 上下文解析器 */
  embedThemeContext?: InputEmbedThemeContextResolver;
};
