import type { IRScene } from '@retikz/core';
import type { OpenString, ValueOf } from '@retikz/foundation';
import { compareProperties, mergeDefinedProperties } from '@retikz/foundation';
import { ReconcilerMode } from '@retikz/reconciler';
import type { CompileResult, ReconcilerResult } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import { normalizeScene } from '../normalize';
import type { InputScene } from '../normalize';
import { bindInputCompileOptions, compileToScene, SceneRuntime } from './runtime';
import type { ProcessOptions, SceneInputBindings } from './runtime';

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
  /** 当前层的完整 Core IR */
  scene: IRScene;
  /** 仅随当前场景参与编译的嵌入绑定，不属于图层默认配置 */
  bindings?: SceneInputBindings;
  /** 覆盖层栈的执行配置 */
  config?: ProcessOptions;
};

/**
 * 创建作者侧分层输入
 * @param config 分层名称、排序、计算配置与场景
 * @returns 带 layer 类别的输入，不编译或复制场景
 */
export const layer = (config: Omit<InputLayer, 'type'>): InputLayer => ({ type: 'layer', ...config });

/** 创建图层时将作者输入一次转换为 IR，并保留其嵌入绑定 */
export const layerFromInput = (
  config: Omit<InputLayer, 'type' | 'scene' | 'bindings'> & { scene: InputScene },
): InputLayer => {
  const { ir, contributions, runtimeInputs } = normalizeScene(config.scene);
  return layer({ ...config, scene: ir, bindings: { contributions, runtimeInputs } });
};

export type LayerReconcilerOptions = NonNullable<ProcessOptions['reconciler']>;

/** 读取显式层级或内置图层的默认层级 */
const layerZIndex = (inputLayer: InputLayer): number =>
  inputLayer.zIndex ??
  (inputLayer.name === BuiltinLayerName.Background ? 0 : inputLayer.name === BuiltinLayerName.Overlay ? 100 : 10);

/** 同一层栈内的名称必须唯一 */
const assertUniqueLayerNames = (layers: ReadonlyArray<InputLayer>) => {
  const names = new Set<string>();
  for (const { name } of layers) {
    if (names.has(name))
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, 'Duplicate layer name: ' + name);
    names.add(name);
  }
};

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
  assertUniqueLayerNames(layers);
  return Object.freeze(
    [...layers]
      .sort((left, right) => layerZIndex(left) - layerZIndex(right))
      .map(inputLayer => {
        const effective = mergeLayerOptions(options, inputLayer);
        const result = compileToScene(inputLayer.scene, {
          ...effective,
          compile: bindInputCompileOptions(inputLayer.scene, inputLayer.bindings, effective.compile),
        });
        return Object.freeze({ name: inputLayer.name, zIndex: layerZIndex(inputLayer), result });
      }),
  );
};

type LayerSnapshot = NamedLayerResult<ReconcilerResult>;

/** 层栈拥有会话与生效的默认配置；未变图层复用上次发布的具名结果 */
type LayerEntry = {
  runtime: SceneRuntime;
  options: ProcessOptions;
  snapshot: LayerSnapshot;
};

/** 独立场景的具名层栈；单图操作直接通过 get 取得的 runtime 执行 */
export class LayerStack {
  private entries = new Map<LayerName, LayerEntry>();
  private snapshot: ReadonlyArray<LayerSnapshot> = Object.freeze([]);
  private readonly listeners = new Set<(layers: ReadonlyArray<LayerSnapshot>) => void>();
  private readonly failures: Array<unknown> = [];
  private disposed = false;
  private editing = false;

  /** 按层序发布的最近一组结果 */
  get current(): ReadonlyArray<LayerSnapshot> {
    return this.snapshot;
  }

  constructor(
    layers: ReadonlyArray<InputLayer>,
    private readonly options: ProcessOptions = {},
  ) {
    this.replace(layers);
  }

  /** 借用指定层的会话；释放由层栈负责，未知名称抛错 */
  get(name: LayerName): SceneRuntime {
    return this.getEntry(name).runtime;
  }

  /** 先建立整组候选会话，全部成功才替换原层栈 */
  replace(layers: ReadonlyArray<InputLayer>) {
    this.edit(() => {
      assertUniqueLayerNames(layers);
      const next = new Map<LayerName, LayerEntry>();
      try {
        for (const input of layers) next.set(input.name, this.mount(input, mergeLayerOptions(this.options, input)));
        this.release(this.entries);
        this.assertActive();
      } catch (cause) {
        this.release(next);
        throw cause;
      }
      this.entries = next;
    });
  }

  /** 新增或替换完整的图层声明；仅当会话默认配置不变时复用实例 */
  replaceLayer(input: InputLayer) {
    this.edit(() => {
      const previous = this.entries.get(input.name);
      const options = mergeLayerOptions(this.options, input);
      if (previous && compareProperties(previous.options, options, { depth: 2 })) {
        previous.runtime.replace(input.scene, bindInputCompileOptions(input.scene, input.bindings, options.compile));
        const zIndex = layerZIndex(input);
        if (previous.snapshot.zIndex !== zIndex) previous.snapshot = Object.freeze({ ...previous.snapshot, zIndex });
      } else {
        const next = this.mount(input, options);
        try {
          previous?.runtime.dispose();
          this.assertActive();
        } catch (cause) {
          next.runtime.dispose();
          throw cause;
        }
        this.entries.set(input.name, next);
      }
    });
  }

  /** 调整单层顺序，不重新编译场景 */
  setLayerOrder(name: LayerName, zIndex: number) {
    this.edit(() => {
      const entry = this.getEntry(name);
      if (entry.snapshot.zIndex !== zIndex) entry.snapshot = Object.freeze({ ...entry.snapshot, zIndex });
    });
  }

  /** 移除并释放指定层 */
  removeLayer(name: LayerName) {
    this.edit(() => {
      this.getEntry(name).runtime.dispose();
      this.entries.delete(name);
    });
  }

  /** 订阅整栈结构变化及任一子场景的成功提交 */
  subscribe(listener: (layers: ReadonlyArray<LayerSnapshot>) => void) {
    this.assertActive();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 读取并清空层栈订阅者的异常；单图诊断由对应 runtime 提供 */
  diagnostics(): ReadonlyArray<unknown> {
    return this.failures.splice(0);
  }

  /** 释放层栈拥有的全部会话；保留最后发布的快照 */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.release(this.entries);
    } catch (cause) {
      this.disposed = false;
      if (!this.editing) this.publish();
      throw cause;
    }
    this.listeners.clear();
  }

  private release(entries: Map<LayerName, LayerEntry>) {
    for (const [name, entry] of entries) {
      entry.runtime.dispose();
      entries.delete(name);
    }
  }

  private getEntry(name: LayerName): LayerEntry {
    this.assertActive();
    const entry = this.entries.get(name);
    if (!entry) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Unknown layer: ' + name);
    return entry;
  }

  private mount(input: InputLayer, options: ProcessOptions): LayerEntry {
    const runtime = new SceneRuntime(input.scene, { ...options, bindings: input.bindings });
    try {
      this.assertActive();
      const entry = {
        runtime,
        options,
        snapshot: Object.freeze({ name: input.name, zIndex: layerZIndex(input), result: runtime.current }),
      };
      runtime.subscribe(result => {
        entry.snapshot = Object.freeze({ ...entry.snapshot, result });
        if (!this.editing && !this.disposed) this.publish();
      });
      return entry;
    } catch (cause) {
      runtime.dispose();
      throw cause;
    }
  }

  /** 声明替换可能同时改变子图结果和层序，只发布最终快照 */
  private edit(action: () => void) {
    this.assertActive();
    if (this.editing) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Cannot reenter a layer update');
    this.editing = true;
    try {
      action();
    } finally {
      this.editing = false;
      if (!this.disposed) this.publish();
    }
  }

  private publish() {
    const next = Array.from(this.entries.values(), entry => entry.snapshot).sort((a, b) => a.zIndex - b.zIndex);
    if (next.length === this.snapshot.length && next.every((entry, index) => entry === this.snapshot[index])) return;
    this.snapshot = Object.freeze(next);
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot);
      } catch (cause) {
        this.failures.push(cause);
      }
    }
  }

  private assertActive() {
    if (this.disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Layer stack is disposed');
  }
}
