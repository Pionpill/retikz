import type { CompositeInputBinding, CoreProviderContribution, IRChild, IRCoordinate, IRScene } from '@retikz/core';
import type { OpenString, RequireExactlyOne, ValueOf } from '@retikz/foundation';
import type { CompileOptions, FullSceneReconcilerOptions, IncrementalSceneReconcilerOptions } from '@retikz/reconciler';

import type { AnyInputEmbed, InputCoordinate, InputNode, InputPath, InputScope } from '../element';

/** 内置作者图层名称 */
export const BuiltinLayerName = { Background: 'background', Main: 'main', Overlay: 'overlay' } as const;

export type LayerName = OpenString<ValueOf<typeof BuiltinLayerName>>;

/** 视口宿主管理提交目标，各层配置执行方式 */
export type LayerReconcilerOptions =
  | Omit<FullSceneReconcilerOptions, 'target'>
  | Omit<IncrementalSceneReconcilerOptions, 'target'>;

/** 视口公共配置与单层覆盖 */
export type LayerOptions = Readonly<{
  /** 本层的编译选项 */
  compile?: CompileOptions;
  /** 本层的协调器执行选项 */
  reconciler?: LayerReconcilerOptions;
}>;

/** 按画面顺序发布的独立图层结果 */
export type NamedLayerResult<TResult> = Readonly<{ name: LayerName; zIndex: number; result: TResult }>;

/** 作者侧图层 */
export type InputLayer = LayerOptions & {
  /** 固定为 layer 的作者分层标识 */
  type: 'layer';
  /** 在视口内唯一的名称 */
  name: LayerName;
  /**
   * 同值保持声明顺序的分层排序值
   * @default background: 0; overlay: 100; otherwise: 10
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
type InputSceneBase = Omit<IRScene, 'version' | 'children'> & {
  /** 作者输入不接受版本号；归一化时写入当前 IR 版本 */
  version?: never;
  /** 可选编译结果扩展自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 场景的两种互斥内容来源 */
type SceneSource = RequireExactlyOne<{
  /** 有序子图元，归一化时置于隐式默认层 */
  children: ReadonlyArray<InputChild>;
  /** 显式分层列表，按 zIndex 稳定排序后归一化 */
  layers: ReadonlyArray<InputLayer>;
}>;

/** 使用 children 简写的作者侧 Scene 输入 */
export type InputSceneChildren = InputSceneBase & Extract<SceneSource, { children: unknown }>;

/** 使用 Layer 列表的作者侧 Scene 输入 */
export type InputSceneLayers = InputSceneBase & Extract<SceneSource, { layers: unknown }>;

/** 作者侧 Scene 输入 */
export type InputScene = InputSceneChildren | InputSceneLayers;

/** 归一化时报告给 编译结果扩展 的作者来源类别 */
export type InputAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'node' | 'coordinate' | 'embeddable';

/** 框架无关的作者来源信息 */
export type InputAuthoringSite = Readonly<{
  /** 作者输入所属的节点或容器类别 */
  kind: InputAuthoringSiteKind;
  /** 该作者位置对应的 Source 路径 */
  sourcePath: string;
  /** 当前输入的具体类型标识 */
  type: string;
  /** 由编译结果扩展解释的原始作者载荷，不进入 Core IR */
  authoring: unknown;
}>;

/** 单次 Scene 输入归一化的完整结果 */
export type NormalizedScene = {
  /** 相对最终 Source IR 的 composite 实例输入 */
  runtimeInputs?: ReadonlyArray<CompositeInputBinding>;
  /** 唯一的 Core Source IR */
  ir: IRScene;
  /** 原样收集，待 processing 唯一调用 Core resolver */
  contributions: ReadonlyArray<CoreProviderContribution>;
  /** 按作者顺序收集的 provenance */
  authoringSites: ReadonlyArray<InputAuthoringSite>;
};
