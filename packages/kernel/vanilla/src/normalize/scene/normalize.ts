import type { CompositeInputBinding, CoreProviderContribution, IRScene } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';

import { normalizeChild } from './children';
import type { SceneNormalizeContext } from './context';
import { childSourcePath } from './context';
import { normalizeSceneLayers, layerZIndex } from './layers';
import type {
  InputAuthoringSite,
  InputLayer,
  InputSceneChildren,
  InputSceneLayers,
  NamedLayerResult,
  InputScene,
  NormalizedScene,
} from './types';
import { BuiltinLayerName } from './types';

/** 通过版本字段区分已类型化的作者输入与 Core IR */
export const isInputScene = (input: InputScene | IRScene): input is InputScene => input.version === undefined;

/** 将 InputScene 一次性归一为唯一 Source IR 与 contribution */
export const normalizeSceneLayer = (scene: InputScene, layer: InputLayer): NormalizedScene => {
  const contributions: Array<CoreProviderContribution> = [];
  const runtimeInputs: Array<CompositeInputBinding> = [];
  const authoringSites: Array<InputAuthoringSite> = [];
  if (scene.authoring !== undefined)
    authoringSites.push({ kind: 'scene', sourcePath: '', type: 'scene', authoring: scene.authoring });

  const context: SceneNormalizeContext = {
    layerId: layer.name,
    path: [layer.name],
    contributions,
    runtimeInputs,
    runtimePath: [],
    sourcePath: '',
    authoringSites,
  };

  const children = layer.children.map((child, index) =>
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

/** 直接子项生成单图，显式图层各自生成独立的 IR */
export function normalizeScene(scene: InputSceneChildren): NormalizedScene;
export function normalizeScene(scene: InputSceneLayers): ReadonlyArray<NamedLayerResult<NormalizedScene>>;
export function normalizeScene(scene: InputScene): NormalizedScene | ReadonlyArray<NamedLayerResult<NormalizedScene>>;
export function normalizeScene(scene: InputScene): NormalizedScene | ReadonlyArray<NamedLayerResult<NormalizedScene>> {
  if (scene.layers === undefined)
    return normalizeSceneLayer(scene, { type: 'layer', name: BuiltinLayerName.Main, children: scene.children });
  return normalizeSceneLayers(scene).map(layer => ({
    name: layer.name,
    zIndex: layerZIndex(layer),
    result: normalizeSceneLayer(scene, layer),
  }));
}
