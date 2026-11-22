import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { normalizeSceneLayers, layerZIndex } from '../../normalize';
import type { InputLayer, InputSceneLayers, NamedLayerResult } from '../../normalize';
import { prepareProcessingInput, mergeLayerOptions } from '../_input';
import type { InputPreparedProcessing, ProcessingOptions } from '../_input';
import type { LayerProcessingResult, ProcessingResult } from '../compile';
import { SceneRuntime } from './runtime';
import type { LayerProcessingController } from './types';

/** 每层只持有自己的会话及最后一次成功发布的结果 */
type LayerSession = {
  controller: SceneRuntime;
  execution: ProcessingOptions['reconciler'];
  entry: NamedLayerResult<ProcessingResult>;
};

/** 已完成异步准备的分层输入 */
type PreparedLayers = ReadonlyMap<string, InputPreparedProcessing>;

/** 按名称定位会话，更新目标层时不遍历兄弟层的输入 */
export const createLayerController = (
  source: InputSceneLayers,
  options: ProcessingOptions,
  initial?: PreparedLayers,
  initialCheck?: () => void,
) => {
  const rootFields = ({ layers: _layers, ...fields }: InputSceneLayers) => fields;
  let root = rootFields(source);
  let disposed = false;
  const listeners = new Set<(result: LayerProcessingResult) => void>();
  const diagnostics: Array<unknown> = [];

  const mount = (
    scene: Omit<InputSceneLayers, 'layers'>,
    layer: InputLayer,
    ready?: InputPreparedProcessing,
    check?: () => void,
    pendingCommitNotifications?: Array<() => void>,
  ): LayerSession => {
    const effective = mergeLayerOptions(options, layer);
    const prepared = ready ?? prepareProcessingInput({ ...scene, children: layer.children }, effective, layer);
    const controller = SceneRuntime.fromPrepared(prepared, effective, check, pendingCommitNotifications);
    return {
      controller,
      execution: effective.reconciler,
      entry: Object.freeze({ name: layer.name, zIndex: layerZIndex(layer), result: controller.read() }),
    };
  };
  const release = (layers: Map<string, LayerSession>) => {
    for (const { controller } of layers.values()) controller.dispose();
  };
  const mountStack = (
    scene: InputSceneLayers,
    notifications: Array<() => void>,
    ready?: PreparedLayers,
    check?: () => void,
  ) => {
    normalizeSceneLayers(scene);
    const layers = new Map<string, LayerSession>();
    try {
      for (const layer of scene.layers)
        layers.set(layer.name, mount(scene, layer, ready?.get(layer.name), check, notifications));
      check?.();
      return layers;
    } catch (cause) {
      release(layers);
      throw cause;
    }
  };
  const initialNotifications: Array<() => void> = [];
  let sessions = mountStack(source, initialNotifications, initial, initialCheck);
  const snapshot = () =>
    Object.freeze(Array.from(sessions.values(), session => session.entry).sort((a, b) => a.zIndex - b.zIndex));
  let current = snapshot();
  for (const notify of initialNotifications) notify();
  const publish = (notifications: Array<() => void> = []) => {
    current = snapshot();
    for (const notify of notifications) notify();
    for (const listener of listeners) {
      try {
        listener(current);
      } catch (cause) {
        diagnostics.push(cause);
      }
    }
  };
  const assertActive = () => {
    if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Layer controller is disposed');
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
  const update = (next: InputSceneLayers, ready?: PreparedLayers, check?: () => void) =>
    write(() => {
      const notifications: Array<() => void> = [];
      const replacement = mountStack(next, notifications, ready, () => {
        assertActive();
        check?.();
      });
      const previous = sessions;
      root = rootFields(next);
      sessions = replacement;
      release(previous);
      publish(notifications);
    });
  const replaceLayer = (layer: InputLayer, ready?: InputPreparedProcessing, check?: () => void) =>
    write(() => {
      const notifications: Array<() => void> = [];
      const checkLayer = () => {
        assertActive();
        check?.();
      };
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
        const prepared = ready ?? prepareProcessingInput({ ...root, children: layer.children }, effective, layer);
        previous.controller.updatePrepared(prepared, checkLayer, notifications);
        previous.entry = Object.freeze({
          name: layer.name,
          zIndex: layerZIndex(layer),
          result: previous.controller.read(),
        });
      } else {
        const replacement = mount(root, layer, ready, checkLayer, notifications);
        sessions.set(layer.name, replacement);
        previous?.controller.dispose();
      }
      publish(notifications);
    });
  const controller: LayerProcessingController = {
    read: () => current,
    update,
    replaceLayer,
    getScopeId: (name, path, expected) => get(name).controller.getScopeId(path, expected),
    updateLayer: (name, batch, expected) =>
      write(() => {
        const notifications: Array<() => void> = [];
        const session = get(name);
        session.controller.applyBatch(batch, expected, notifications);
        const result = session.controller.read();
        if (result === session.entry.result) return;
        session.entry = Object.freeze({ ...session.entry, result });
        publish(notifications);
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
  };
  return { ...controller, readRoot: () => root, updatePreparedStack: update, replacePreparedLayer: replaceLayer };
};
