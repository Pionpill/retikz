import type { WeaveBatch } from '@retikz/reconciler';

import type { InputLayer, InputSceneLayers, LayerName } from '../../normalize';
import type { SingleSceneSource } from '../_input';
import type { ProcessingResult, LayerProcessingResult } from '../compile';

/** 显式层栈的计算控制器；批次依赖本层此前交付的结果 */
export type LayerProcessingController = Readonly<{
  read: () => LayerProcessingResult;
  update: (source: InputSceneLayers) => void;
  replaceLayer: (layer: InputLayer) => void;
  /** 从本层已提交结果取得批次地址；不能跨会话或版本使用 */
  getScopeId: (name: LayerName, path: ReadonlyArray<number>, expected: ProcessingResult) => string;
  updateLayer: (name: LayerName, batch: WeaveBatch, expected: ProcessingResult) => void;
  setLayerOrder: (name: LayerName, zIndex: number) => void;
  removeLayer: (name: LayerName) => void;
  subscribe: (listener: (result: LayerProcessingResult) => void) => () => void;
  diagnostics: () => ReadonlyArray<unknown>;
  dispose: () => void;
}>;

/** 不绑定框架的保留式处理控制器 */
export type ProcessingController = Readonly<{
  /** 原子提交下一份 InputScene 或已归一的 IRScene */
  update: (source: SingleSceneSource) => void;
  /** 读取最后一次成功提交的结果 */
  read: () => ProcessingResult;
  /** 订阅后续成功提交，返回取消订阅函数 */
  subscribe: (listener: (result: ProcessingResult) => void) => () => void;
  /** 读取并清空 processing 与 Runtime 诊断 */
  diagnostics: () => ReadonlyArray<unknown>;
  /** 释放 controller，之后禁止更新与订阅 */
  dispose: () => void;
}>;
