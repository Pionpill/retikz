import type { CompositeInputBinding, CoreProviderContribution, IRChild, IRCoordinate, IRScene } from '@retikz/core';

import type { AnyInputEmbed, InputCoordinate, InputNode, InputPath, InputScope } from '../element';

/** 作者侧可写入 Scene 或 Scope 的子节点 */
export type InputChild =
  | InputNode
  | InputPath
  | InputScope
  | InputCoordinate
  | AnyInputEmbed
  | Exclude<IRChild, IRCoordinate>;

/** 单图作者输入，归一化时转换为 Core IR */
export type InputScene = Omit<IRScene, 'version' | 'children'> & {
  /** 作者输入不接受版本号；归一化时写入当前 IR 版本 */
  version?: never;
  /** 按声明顺序归一的子节点 */
  children: ReadonlyArray<InputChild>;
  /** 归一化时保留的作者元数据，不进入 Core IR */
  authoring?: unknown;
};

/** 归一化时收集的作者来源类别 */
export type InputAuthoringSiteKind = 'scene' | 'scope' | 'path' | 'node' | 'coordinate' | 'embeddable';

/** 框架无关的作者来源信息 */
export type InputAuthoringSite = Readonly<{
  /** 作者输入所属的节点或容器类别 */
  kind: InputAuthoringSiteKind;
  /** 该作者位置对应的 Source 路径 */
  sourcePath: string;
  /** 当前输入的具体类型标识 */
  type: string;
  /** 归一化时保留的原始作者载荷，不进入 Core IR */
  authoring: unknown;
}>;

/** 单次 Scene 输入归一化的完整结果 */
export type SceneNormalizationResult = {
  /** 相对最终 Source IR 的 composite 实例输入 */
  runtimeInputs?: ReadonlyArray<CompositeInputBinding>;
  /** 唯一的 Core Source IR */
  ir: IRScene;
  /** 原样收集，待 processing 唯一调用 Core resolver */
  contributions: ReadonlyArray<CoreProviderContribution>;
  /** 按作者顺序收集的 provenance */
  authoringSites: ReadonlyArray<InputAuthoringSite>;
};
