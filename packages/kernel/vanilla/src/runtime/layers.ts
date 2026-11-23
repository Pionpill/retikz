import type { IRScene } from '@retikz/core';
import type { OpenString, ValueOf } from '@retikz/foundation';
import { mergeDefinedProperties } from '@retikz/foundation';
import { ReconcilerMode } from '@retikz/reconciler';
import type { CompileResult, ReconcilerResult, WeaveBatch } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import { isInputScene } from '../normalize';
import type { InputScene } from '../normalize';
import { compileToScene, SceneRuntime } from './runtime';
import type { ProcessOptions } from './runtime';

/** 内置作者图层名称 */
export const BuiltinLayerName = { Background: 'background', Main: 'main', Overlay: 'overlay' } as const;

export type LayerName = OpenString<ValueOf<typeof BuiltinLayerName>>;

/** 按画面顺序发布的独立图层结果 */
export type NamedLayerResult<TResult> = Readonly<{ name: LayerName; zIndex: number; result: TResult }>;

/** 作者侧图层 */
export type InputLayer = {
  /** 固定为 layer 的作者分层标识 */
  type: 'layer';
  /** 在视口内唯一的名称 */
  name: LayerName;
  /**
   * 同值保持声明顺序的分层排序值
   * @default background: 0; overlay: 100; otherwise: 10
   */
  zIndex?: number;
  /** 当前层的完整场景 */
  scene: InputScene | IRScene;
  /** 覆盖层栈的执行配置 */
  config?: ProcessOptions;
};

/**
 * 创建作者侧分层输入
 * @param config 分层名称、排序、计算配置与场景
 * @returns 带 layer 类别的输入，不编译或复制场景
 */
export const layer = (config: Omit<InputLayer, 'type'>): InputLayer => ({ type: 'layer', ...config });

export type LayerReconcilerOptions = NonNullable<ProcessOptions['reconciler']>;

/** 读取显式层级或内置图层的默认层级 */
const layerZIndex = (inputLayer: InputLayer): number =>
  inputLayer.zIndex ??
  (inputLayer.name === BuiltinLayerName.Background ? 0 : inputLayer.name === BuiltinLayerName.Overlay ? 100 : 10);

/** 显式图层检查重名后按层级稳定排序 */
const orderLayers = (layers: ReadonlyArray<InputLayer>): Array<InputLayer> => {
  const names = new Set<string>();
  for (const { name } of layers) {
    if (names.has(name))
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, 'Duplicate layer name: ' + name);
    names.add(name);
  }
  return [...layers].sort((left, right) => layerZIndex(left) - layerZIndex(right));
};

/** 显式层栈的计算控制器；批次依赖本层此前交付的结果 */
export type LayerProcessingController = Readonly<{
  read: () => ReadonlyArray<NamedLayerResult<ReconcilerResult>>;
  update: (source: ReadonlyArray<InputLayer>) => void;
  replaceLayer: (inputLayer: InputLayer) => void;
  /** 从本层已提交结果取得批次地址；不能跨会话或版本使用 */
  getScopeId: (name: LayerName, path: ReadonlyArray<number>, expected: ReconcilerResult) => string;
  updateLayer: (name: LayerName, batch: WeaveBatch, expected: ReconcilerResult) => void;
  setLayerOrder: (name: LayerName, zIndex: number) => void;
  removeLayer: (name: LayerName) => void;
  subscribe: (listener: (result: ReadonlyArray<NamedLayerResult<ReconcilerResult>>) => void) => () => void;
  diagnostics: () => ReadonlyArray<unknown>;
  dispose: () => void;
}>;

/** 按调用方配置、背景层默认值、显式图层配置的优先顺序合并，仅增量模式保留更新策略 */
const mergeLayerOptions = (
  options: ProcessOptions,
  inputLayer: InputLayer,
): {
  compile: NonNullable<ProcessOptions['compile']>;
  reconciler: LayerReconcilerOptions;
} => {
  const reconciler = mergeDefinedProperties<LayerReconcilerOptions>([
    options.reconciler,
    inputLayer.name === BuiltinLayerName.Background ? { mode: ReconcilerMode.Full } : undefined,
    inputLayer.config?.reconciler,
  ]);
  const { mode = ReconcilerMode.Full, updateStrategy, ...shared } = reconciler;
  return {
    compile: mergeDefinedProperties([options.compile, inputLayer.config?.compile]),
    reconciler: mode === ReconcilerMode.Incremental ? { ...shared, mode, updateStrategy } : { ...shared, mode },
  };
};

/** 各层独立编译，全部成功后返回有序结果 */
export const compileLayers = (
  layers: ReadonlyArray<InputLayer>,
  options: ProcessOptions = {},
): ReadonlyArray<NamedLayerResult<CompileResult>> => {
  return Object.freeze(
    orderLayers(layers).map(inputLayer => {
      const effective = mergeLayerOptions(options, inputLayer);
      const result = compileToScene(inputLayer.scene, effective);
      return Object.freeze({ name: inputLayer.name, zIndex: layerZIndex(inputLayer), result });
    }),
  );
};

/** 每层只持有自己的会话及最后一次成功发布的结果 */
type LayerSession = {
  controller: SceneRuntime;
  execution: ProcessOptions['reconciler'];
  entry: NamedLayerResult<ReconcilerResult>;
};

/** 按名称定位会话，更新目标层时不遍历兄弟层的输入 */
export const createLayerController = (source: ReadonlyArray<InputLayer>, options: ProcessOptions = {}) => {
  let disposed = false;
  const listeners = new Set<(result: ReadonlyArray<NamedLayerResult<ReconcilerResult>>) => void>();
  const diagnostics: Array<unknown> = [];

  const assertActive = () => {
    if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Layer controller is disposed');
  };

  const mount = (inputLayer: InputLayer): LayerSession => {
    const effective = mergeLayerOptions(options, inputLayer);
    const controller = isInputScene(inputLayer.scene)
      ? SceneRuntime.fromInput(inputLayer.scene, effective)
      : new SceneRuntime(inputLayer.scene, effective);
    try {
      // 首帧编译可触发用户回调；层栈销毁后不能接收新会话
      assertActive();
      return {
        controller,
        execution: effective.reconciler,
        entry: Object.freeze({ name: inputLayer.name, zIndex: layerZIndex(inputLayer), result: controller.current }),
      };
    } catch (cause) {
      controller.dispose();
      throw cause;
    }
  };
  const release = (layers: Map<string, LayerSession>) => {
    for (const { controller } of layers.values()) controller.dispose();
  };
  const mountStack = (nextLayers: ReadonlyArray<InputLayer>) => {
    const ordered = orderLayers(nextLayers);
    const layers = new Map<string, LayerSession>();
    try {
      for (const inputLayer of ordered) layers.set(inputLayer.name, mount(inputLayer));
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
  const replaceLayer = (inputLayer: InputLayer) =>
    write(() => {
      const effective = mergeLayerOptions(options, inputLayer);
      const previous = sessions.get(inputLayer.name);
      const execution = previous?.execution;
      if (
        previous &&
        execution?.mode === effective.reconciler.mode &&
        execution?.updateStrategy === effective.reconciler.updateStrategy &&
        execution?.trace === effective.reconciler.trace &&
        execution?.captureProvenance === effective.reconciler.captureProvenance
      ) {
        if (isInputScene(inputLayer.scene)) previous.controller.replaceInput(inputLayer.scene, effective.compile);
        else previous.controller.replace(inputLayer.scene, effective.compile);
        previous.entry = Object.freeze({
          name: inputLayer.name,
          zIndex: layerZIndex(inputLayer),
          result: previous.controller.current,
        });
      } else {
        const replacement = mount(inputLayer);
        sessions.set(inputLayer.name, replacement);
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
        const result = session.controller.current;
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
