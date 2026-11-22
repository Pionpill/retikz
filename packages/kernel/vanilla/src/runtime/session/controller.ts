import type { IRScene } from '@retikz/core';

import type { InputSceneChildren, InputSceneLayers } from '../../normalize';
import { isLayerSource } from '../_input';
import type { ProcessingOptions, ProcessingSource } from '../_input';
import { createLayerController } from './layer';
import { SceneRuntime } from './runtime';
import type { LayerProcessingController, ProcessingController } from './types';

/** 创建只发布完整成功 revision 的 framework-neutral retained processing controller */
export function createProcessingController(
  source: InputSceneLayers,
  options?: ProcessingOptions,
): LayerProcessingController;
export function createProcessingController(
  source: InputSceneChildren | IRScene,
  options?: ProcessingOptions,
): ProcessingController;
export function createProcessingController(
  source: ProcessingSource,
  options?: ProcessingOptions,
): ProcessingController | LayerProcessingController;
export function createProcessingController(
  source: ProcessingSource,
  options: ProcessingOptions = {},
): ProcessingController | LayerProcessingController {
  return isLayerSource(source) ? createLayerController(source, options) : SceneRuntime.fromSource(source, options);
}
