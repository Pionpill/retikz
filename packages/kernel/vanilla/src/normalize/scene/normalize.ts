import type { CompositeInputBinding, CoreProviderContribution } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { normalizeChild } from './children';
import type { SceneNormalizeContext } from './context';
import {
  asLayerStack,
  layerZIndex,
  childSourcePath,
  inputEmbedIdentityOf,
  isInputEmbed,
  readIdentity,
} from './context';
import { createInputRuntimeMetaSnapshot } from './runtime-meta';
import type {
  InputAuthoringSite,
  InputLayer,
  InputSceneChildren,
  InputSceneLayers,
  NamedLayerResult,
  InputNormalizeOptions,
  InputRuntimeMeta,
  InputScene,
  SceneNormalizationResult,
} from './types';
import { BuiltinLayerName } from './types';

/** 判断输入是否为 Scene Input */
export const isInputScene = (input: unknown): input is InputScene =>
  typeof input === 'object' && input !== null && (input as { version?: unknown }).version !== CURRENT_IR_VERSION;

/** 将 InputScene 一次性归一为唯一 Source IR、contribution 与 runtime metadata */
export const normalizeSceneLayer = (
  scene: InputScene,
  layer: InputLayer,
  options: InputNormalizeOptions,
): SceneNormalizationResult => {
  const adapterKinds = new Set<string>();

  for (const adapter of options.adapters ?? []) {
    if (adapterKinds.has(adapter.kind))
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Normalize,
        `Duplicate input embed adapter kind "${adapter.kind}"`,
      );

    adapterKinds.add(adapter.kind);
  }

  const contributions: Array<CoreProviderContribution> = [];
  const runtimeInputs: Array<CompositeInputBinding> = [];
  const identityIndex = new Map<string, Array<string>>();
  const parentIndex = new Map<string, string>();
  const authoringSites: Array<InputAuthoringSite> = [];
  if (scene.authoring !== undefined)
    authoringSites.push(Object.freeze({ kind: 'scene', sourcePath: '', type: 'scene', authoring: scene.authoring }));

  const context: SceneNormalizeContext = {
    layerId: layer.name,
    parentId: layer.name,
    path: [layer.name],
    adapters: options.adapters,
    ...(options.embedThemeContext === undefined ? {} : { embedThemeContext: options.embedThemeContext.root }),
    ...(options.embedThemeContext === undefined
      ? {}
      : { resolveEmbedScopeTheme: options.embedThemeContext.resolveScope }),
    contributions,
    runtimeInputs,
    runtimePath: [],
    identityIndex,
    parentIndex,
    identityFrame: '',
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

  const meta = {
    name: layer.name,
    order: 0,
    zIndex: layerZIndex(layer),
    childIds: layer.children
      .map((child, index) =>
        isInputEmbed(child)
          ? inputEmbedIdentityOf(child, { ...context, sourcePath: childSourcePath(context, index) })
          : readIdentity(child),
      )
      .filter((id): id is string => id !== undefined),
    hasAnonymousChildren: layer.children.some(child => readIdentity(child) === undefined),
    invalidationBoundary: layer.name,
  };

  const {
    type: _type,
    version: _version,
    id: _id,
    authoring: _authoring,
    layers: _layers,
    children: _children,
    ...rest
  } = scene;
  void _type;
  void _version;
  void _id;
  void _authoring;
  void _layers;
  void _children;
  const runtimeMeta: InputRuntimeMeta = createInputRuntimeMetaSnapshot({
    layers: [meta],
    identityIndex,
    parentIndex,
  });

  return {
    ir: { type: 'scene', version: CURRENT_IR_VERSION, ...rest, children },
    contributions: Object.freeze([...contributions]),
    ...(runtimeInputs.length === 0 ? {} : { runtimeInputs: Object.freeze(runtimeInputs) }),
    runtimeMeta,
    authoringSites: Object.freeze(authoringSites),
  };
};

/** 直接子项生成单图，显式图层各自生成独立的 IR */
export function normalizeScene(scene: InputSceneChildren, options?: InputNormalizeOptions): SceneNormalizationResult;
export function normalizeScene(
  scene: InputSceneLayers,
  options?: InputNormalizeOptions,
): ReadonlyArray<NamedLayerResult<SceneNormalizationResult>>;
export function normalizeScene(
  scene: InputScene,
  options?: InputNormalizeOptions,
): SceneNormalizationResult | ReadonlyArray<NamedLayerResult<SceneNormalizationResult>>;
export function normalizeScene(scene: InputScene, options: InputNormalizeOptions = {}) {
  if (scene.layers === undefined)
    return normalizeSceneLayer(
      scene,
      { type: 'layer', name: BuiltinLayerName.Main, children: scene.children },
      options,
    );
  return Object.freeze(
    asLayerStack(scene).map(layer =>
      Object.freeze({
        name: layer.name,
        zIndex: layerZIndex(layer),
        result: normalizeSceneLayer(scene, layer, options),
      }),
    ),
  );
}
