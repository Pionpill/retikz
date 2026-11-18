import type { CompositeInputBinding, CoreProviderContribution, IRChild } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { normalizeChild } from './children';
import type { SceneNormalizeContext } from './context';
import { asLayerStack, childSourcePath, inputEmbedIdentityOf, isInputEmbed, readIdentity } from './context';
import { createInputRuntimeMetaSnapshot } from './runtime-meta';
import type {
  InputAuthoringSite,
  InputLayerMeta,
  InputNormalizeOptions,
  InputRuntimeMeta,
  InputScene,
  SceneNormalizationResult,
} from './types';
import { InputLayerCache } from './types';

/** 判断输入是否为 Scene Input */
export const isInputScene = (input: unknown): input is InputScene =>
  typeof input === 'object' && input !== null && (input as { version?: unknown }).version !== CURRENT_IR_VERSION;

/** 将 InputScene 一次性归一为唯一 Source IR、contribution 与 runtime metadata */
export const normalizeScene = (scene: InputScene, options: InputNormalizeOptions = {}): SceneNormalizationResult => {
  const adapterKinds = new Set<string>();

  for (const adapter of options.adapters ?? []) {
    if (adapterKinds.has(adapter.kind))
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Normalize,
        `Duplicate input embed adapter kind "${adapter.kind}"`,
      );

    adapterKinds.add(adapter.kind);
  }

  const layers = asLayerStack(scene);
  const contributions: Array<CoreProviderContribution> = [];
  const runtimeInputs: Array<CompositeInputBinding> = [];
  const identityIndex = new Map<string, Array<string>>();
  const parentIndex = new Map<string, string>();
  const layerIds = new Set<string>();
  const layerMetas: Array<InputLayerMeta> = [];
  const children: Array<IRChild> = [];
  const authoringSites: Array<InputAuthoringSite> = [
    Object.freeze({ kind: 'scene', sourcePath: '', type: 'scene', authoring: scene.authoring }),
  ];

  for (const [order, layer] of layers.entries()) {
    if (layerIds.has(layer.id)) {
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Normalize,
        `normalizeScene: duplicate identity "${layer.id}" at layer "${layer.id}"`,
      );
    }

    layerIds.add(layer.id);
    const context: SceneNormalizeContext = {
      layerId: layer.id,
      parentId: layer.id,
      path: [layer.id],
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

    const sceneOffset = children.length;
    const layerChildren = layer.children.map((child, index) =>
      normalizeChild(child, {
        ...context,
        sourcePath: childSourcePath(context, sceneOffset + index),
        runtimePath: ['children', sceneOffset + index],
      }),
    );

    children.push(...layerChildren);
    layerMetas.push({
      id: layer.id,
      cache: layer.cache ?? InputLayerCache.Auto,
      order,
      zIndex: layer.zIndex ?? 0,
      childIds: layer.children
        .map((child, index) =>
          isInputEmbed(child)
            ? inputEmbedIdentityOf(child, { ...context, sourcePath: childSourcePath(context, sceneOffset + index) })
            : readIdentity(child),
        )
        .filter((id): id is string => id !== undefined),
      hasAnonymousChildren: layer.children.some(child => readIdentity(child) === undefined),
      invalidationBoundary: layer.id,
    });
  }

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
    layers: layerMetas,
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
