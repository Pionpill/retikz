import type { CompositeInputBinding, CoreProviderContribution, IRScene } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';

import { normalizeChild } from './children';
import type { SceneNormalizeContext } from './context';
import { childSourcePath } from './context';
import type { InputAuthoringSite, InputScene, SceneNormalizationResult, LayerName } from './types';
import { BuiltinLayerName } from './types';

/** 通过版本字段区分已类型化的作者输入与 Core IR */
export const isInputScene = (input: InputScene | IRScene): input is InputScene => input.version === undefined;

/** 将 InputScene 一次性归一为唯一 Source IR 与 contribution */
export const normalizeSceneLayer = (scene: InputScene, layerName: LayerName): SceneNormalizationResult => {
  const contributions: Array<CoreProviderContribution> = [];
  const runtimeInputs: Array<CompositeInputBinding> = [];
  const authoringSites: Array<InputAuthoringSite> = [];
  if (scene.authoring !== undefined)
    authoringSites.push({ kind: 'scene', sourcePath: '', type: 'scene', authoring: scene.authoring });

  const context: SceneNormalizeContext = {
    layerId: layerName,
    path: [layerName],
    contributions,
    runtimeInputs,
    runtimePath: [],
    sourcePath: '',
    authoringSites,
  };

  const children = scene.children.map((child, index) =>
    normalizeChild(child, {
      ...context,
      sourcePath: childSourcePath(context, index),
      runtimePath: ['children', index],
    }),
  );

  const { type, theme, viewBox, animations } = scene;

  return {
    ir: {
      type,
      version: CURRENT_IR_VERSION,
      children,
      ...(theme === undefined ? {} : { theme }),
      ...(viewBox === undefined ? {} : { viewBox }),
      ...(animations === undefined ? {} : { animations }),
    },
    contributions,
    ...(runtimeInputs.length === 0 ? {} : { runtimeInputs }),
    authoringSites,
  };
};

/** 归一化单图，匿名图元使用默认主层身份 */
export const normalizeScene = (scene: InputScene): SceneNormalizationResult =>
  normalizeSceneLayer(scene, BuiltinLayerName.Main);
