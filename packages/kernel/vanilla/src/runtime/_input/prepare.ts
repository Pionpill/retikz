import { createCompositeInputBindings, resolveCoreProviderDependencies } from '@retikz/core';
import type { IRScene } from '@retikz/core';
import type { CompileOptions } from '@retikz/reconciler';

import type { InputScene, LayerName } from '../../normalize';
import { isInputScene, BuiltinLayerName, normalizeSceneLayer } from '../../normalize';
import { createDefaultTextMeasurer } from './text';
import type { InputPreparedProcessing } from './types';

/** 准备单图编译输入；只有作者输入需要归一化并绑定组件依赖 */
export const prepareProcessingInput = (
  source: InputScene | IRScene,
  compile?: CompileOptions,
  layerName: LayerName = BuiltinLayerName.Main,
): InputPreparedProcessing => {
  if (!isInputScene(source)) {
    return {
      source,
      coreOptions:
        compile?.measureText !== undefined ? compile : { ...compile, measureText: createDefaultTextMeasurer() },
    };
  }

  const normalized = normalizeSceneLayer(source, layerName);
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
  };
};
