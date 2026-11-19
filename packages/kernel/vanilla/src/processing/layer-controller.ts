import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import { asLayerStack, layerZIndex } from '../normalize';
import type { InputLayer, InputSceneLayers, NamedLayerResult } from '../normalize';
import { createPreparedInputProcessingController } from './internal';
import type { PreparedInputProcessingController } from './internal';
import { resolveLayerOptions } from './layer';
import { prepareProcessingInput } from './prepare';
import type {
  InputPreparedProcessing,
  LayerProcessingController,
  LayerProcessingResult,
  ProcessingOptions,
  ProcessingResult,
} from './types';

/** 每层只持有自己的会话及最后一次成功发布的结果 */
type LayerSession = {
  controller: PreparedInputProcessingController;
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
    pendingDriverCommits?: Array<() => void>,
  ): LayerSession => {
    const effective = resolveLayerOptions(options, layer);
    const prepared = ready ?? prepareProcessingInput({ ...scene, children: layer.children }, effective, layer);
    const controller = createPreparedInputProcessingController(prepared, effective, check, pendingDriverCommits);
    return {
      controller,
      execution: effective.reconciler,
      entry: Object.freeze({ name: layer.name, zIndex: layerZIndex(layer), result: controller.read() }),
    };
  };
  const release = (layers: Map<string, LayerSession>) => {
    for (const { controller } of layers.values()) controller.dispose();
  };
  const mountStack = (scene: InputSceneLayers, ready?: PreparedLayers, check?: () => void) => {
    asLayerStack(scene);
    const layers = new Map<string, LayerSession>();
    const pendingDriverCommits: Array<() => void> = [];
    try {
      for (const layer of scene.layers)
        layers.set(layer.name, mount(scene, layer, ready?.get(layer.name), check, pendingDriverCommits));
      check?.();
      for (const commit of pendingDriverCommits) commit();
      return layers;
    } catch (cause) {
      release(layers);
      throw cause;
    }
  };
  let sessions = mountStack(source, initial, initialCheck);
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
  const assertActive = () => {
    if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Layer controller is disposed');
  };
  const get = (name: string) => {
    assertActive();
    const session = sessions.get(name);
    if (!session) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Unknown layer: ' + name);
    return session;
  };
  const update = (next: InputSceneLayers, ready?: PreparedLayers, check?: () => void) => {
    assertActive();
    const replacement = mountStack(next, ready, check);
    const previous = sessions;
    root = rootFields(next);
    sessions = replacement;
    release(previous);
    publish();
  };
  const replaceLayer = (layer: InputLayer, ready?: InputPreparedProcessing, check?: () => void) => {
    assertActive();
    const effective = resolveLayerOptions(options, layer);
    const previous = sessions.get(layer.name);
    const execution = previous?.execution;
    if (
      previous &&
      execution?.incremental === effective.reconciler.incremental &&
      execution?.updateStrategy === effective.reconciler.updateStrategy &&
      execution?.trace === effective.reconciler.trace &&
      execution?.captureProvenance === effective.reconciler.captureProvenance
    ) {
      const prepared = ready ?? prepareProcessingInput({ ...root, children: layer.children }, effective, layer);
      previous.controller.updatePrepared(prepared, check);
      previous.entry = Object.freeze({
        name: layer.name,
        zIndex: layerZIndex(layer),
        result: previous.controller.read(),
      });
    } else {
      const replacement = mount(root, layer, ready, check);
      sessions.set(layer.name, replacement);
      previous?.controller.dispose();
    }
    publish();
  };
  const controller: LayerProcessingController = {
    read: () => current,
    update,
    replaceLayer,
    getScopeId: (name, path, expected) => get(name).controller.getScopeId(path, expected),
    updateLayer: (name, batch, expected) => {
      const session = get(name);
      session.controller.applyBatch(batch, expected);
      const result = session.controller.read();
      if (result === session.entry.result) return;
      session.entry = Object.freeze({ ...session.entry, result });
      publish();
    },
    setLayerOrder: (name, zIndex) => {
      const session = get(name);
      if (session.entry.zIndex === zIndex) return;
      session.entry = Object.freeze({ ...session.entry, zIndex });
      publish();
    },
    removeLayer: name => {
      const session = get(name);
      sessions.delete(name);
      session.controller.dispose();
      publish();
    },
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
  return { ...controller, updatePreparedStack: update, replacePreparedLayer: replaceLayer };
};
