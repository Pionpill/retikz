import type { ReconcilerResult } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { normalizeSceneLayers, layerZIndex } from '../../normalize';
import type { InputLayer, NamedLayerResult } from '../../normalize';
import { prepareProcessingInput, mergeLayerOptions } from '../_input';
import type { ProcessingOptions } from '../_input';
import { HostedSceneRuntime } from './runtime';
import type { LayerProcessingController } from './types';

/** 每层只持有自己的会话及最后一次成功发布的结果 */
type LayerSession = {
  controller: HostedSceneRuntime;
  execution: ProcessingOptions['reconciler'];
  entry: NamedLayerResult<ReconcilerResult>;
};

/** 按名称定位会话，更新目标层时不遍历兄弟层的输入 */
export const createLayerController = (source: ReadonlyArray<InputLayer>, options: ProcessingOptions = {}) => {
  let disposed = false;
  const listeners = new Set<(result: ReadonlyArray<NamedLayerResult<ReconcilerResult>>) => void>();
  const diagnostics: Array<unknown> = [];

  const assertActive = () => {
    if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Layer controller is disposed');
  };

  const mount = (layer: InputLayer): LayerSession => {
    const effective = mergeLayerOptions(options, layer);
    const prepared = prepareProcessingInput(layer.scene, effective.compile, layer.name);
    const controller = HostedSceneRuntime.fromPrepared(prepared, effective, assertActive);
    return {
      controller,
      execution: effective.reconciler,
      entry: Object.freeze({ name: layer.name, zIndex: layerZIndex(layer), result: controller.read() }),
    };
  };
  const release = (layers: Map<string, LayerSession>) => {
    for (const { controller } of layers.values()) controller.dispose();
  };
  const mountStack = (nextLayers: ReadonlyArray<InputLayer>) => {
    const ordered = normalizeSceneLayers(nextLayers);
    const layers = new Map<string, LayerSession>();
    try {
      for (const layer of ordered) layers.set(layer.name, mount(layer));
      assertActive();
      return layers;
    } catch (cause) {
      release(layers);
      throw cause;
    }
  };
  let sessions = mountStack(source);
  const snapshot = () =>
    Object.freeze(Array.from(sessions.values(), session => session.entry).sort((a, b) => a.zIndex - b.zIndex));
  let current = snapshot();
  const publish = () => {
    current = snapshot();
    for (const listener of listeners) {
      try {
        listener(current);
      } catch (cause) {
        diagnostics.push(cause);
      }
    }
  };
  let writing = false;
  const write = (action: () => void) => {
    assertActive();
    if (writing) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Cannot reenter a layer update');
    writing = true;
    try {
      action();
    } finally {
      writing = false;
    }
  };
  const get = (name: string) => {
    assertActive();
    const session = sessions.get(name);
    if (!session) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Unknown layer: ' + name);
    return session;
  };
  const update = (next: ReadonlyArray<InputLayer>) =>
    write(() => {
      const replacement = mountStack(next);
      const previous = sessions;
      sessions = replacement;
      release(previous);
      publish();
    });
  const replaceLayer = (layer: InputLayer) =>
    write(() => {
      const effective = mergeLayerOptions(options, layer);
      const previous = sessions.get(layer.name);
      const execution = previous?.execution;
      if (
        previous &&
        execution?.mode === effective.reconciler.mode &&
        execution?.updateStrategy === effective.reconciler.updateStrategy &&
        execution?.trace === effective.reconciler.trace &&
        execution?.captureProvenance === effective.reconciler.captureProvenance
      ) {
        const prepared = prepareProcessingInput(layer.scene, effective.compile, layer.name);
        previous.controller.updatePrepared(prepared);
        previous.entry = Object.freeze({
          name: layer.name,
          zIndex: layerZIndex(layer),
          result: previous.controller.read(),
        });
      } else {
        const replacement = mount(layer);
        sessions.set(layer.name, replacement);
        previous?.controller.dispose();
      }
      publish();
    });
  return {
    read: () => current,
    update,
    replaceLayer,
    getScopeId: (name, path, expected) => get(name).controller.getScopeId(path, expected),
    updateLayer: (name, batch, expected) =>
      write(() => {
        const session = get(name);
        session.controller.update(batch, expected);
        const result = session.controller.read();
        if (result === session.entry.result) return;
        session.entry = Object.freeze({ ...session.entry, result });
        publish();
      }),
    setLayerOrder: (name, zIndex) =>
      write(() => {
        const session = get(name);
        if (session.entry.zIndex === zIndex) return;
        session.entry = Object.freeze({ ...session.entry, zIndex });
        publish();
      }),
    removeLayer: name =>
      write(() => {
        const session = get(name);
        sessions.delete(name);
        session.controller.dispose();
        publish();
      }),
    subscribe: listener => {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    diagnostics: () => {
      for (const session of sessions.values()) diagnostics.push(...session.controller.diagnostics());
      return diagnostics.splice(0);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      release(sessions);
      sessions.clear();
    },
  } satisfies LayerProcessingController;
};
