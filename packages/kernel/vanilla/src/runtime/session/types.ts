import type { WeaveBatch } from '@retikz/reconciler';

import type { InputLayer, LayerName } from '../../normalize';
import type { ProcessingResult, LayerProcessingResult } from '../compile';

/** 显式层栈的计算控制器；批次依赖本层此前交付的结果 */
export type LayerProcessingController = Readonly<{
  read: () => LayerProcessingResult;
  update: (source: ReadonlyArray<InputLayer>) => void;
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
