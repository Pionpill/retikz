import { createCompositeInputBindings, resolveCoreProviderDependencies } from '@retikz/core';
import type { IRScene } from '@retikz/core';

import type { InputAuthoringSite, InputScene, LayerName } from '../../normalize';
import { isInputScene, BuiltinLayerName, normalizeSceneLayer } from '../../normalize';
import { createDefaultTextMeasurer } from './text';
import type { InputPreparedProcessing, ProcessingOptions } from './types';

const EMPTY_AUTHORING_SITES: ReadonlyArray<InputAuthoringSite> = Object.freeze([]);

/** 绑定归一结果的实例输入、Core 定义与文字测量器 */
const prepareNormalizedInput = (
  normalized: ReturnType<typeof normalizeSceneLayer>,
  compile: ProcessingOptions['compile'],
): InputPreparedProcessing => {
  const definitions = resolveCoreProviderDependencies({
    contributions: normalized.contributions,
    definitions: compile,
  });
  return {
    source: normalized.ir,
    coreOptions: {
      ...compile,
      ...definitions,
      ...(normalized.runtimeInputs === undefined
        ? {}
        : {
            compositeInputs: createCompositeInputBindings(normalized.ir, normalized.runtimeInputs),
          }),
      measureText: compile?.measureText ?? createDefaultTextMeasurer(),
    },
    authoringSites: normalized.authoringSites,
  };
};

/** 将 typed InputScene 或已类型化 IRScene 准备为 processing 的唯一 Core 输入 */
export const prepareProcessingInput = (
  source: InputScene | IRScene,
  options: ProcessingOptions,
  layerName: LayerName = BuiltinLayerName.Main,
): InputPreparedProcessing => {
  if (isInputScene(source)) {
    const normalized = normalizeSceneLayer(source, layerName);
    return prepareNormalizedInput(normalized, options.compile);
  }

  return {
    source,
    coreOptions:
      options.compile?.measureText !== undefined
        ? options.compile
        : {
            ...options.compile,
            measureText: createDefaultTextMeasurer(),
          },
    authoringSites: EMPTY_AUTHORING_SITES,
  };
};
