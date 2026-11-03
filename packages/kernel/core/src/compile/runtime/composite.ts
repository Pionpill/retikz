import type { PropertyPath } from '@retikz/foundation';

import type {
  CompileOccurrenceLocator,
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeReplay,
  CompositeReplayWrapper,
  ScenePrimitive,
  SceneResource,
  Transform,
  LayoutContribution,
  CompositeInputScope,
} from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import type { IRChild } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompiledNodeLayout, LayoutBoundsContribution } from '../layout';
import type { CompileProvenanceSnapshot } from '../provenance';
import type { CompileWarning, CompositeArtifact } from '../shared';
import type { NamespaceFrameChange } from './namespace';

/** layout-aware child probe 保存的全部可提交贡献 */
export type CompositeReplayMaterializeContext = Readonly<{
  /** replay child 在最终 authored Scope 中继承的有效默认配置 */
  scopeDefaults: MergedScopeDefaults;
  /** replay child 在最终 authored Scope 中继承的 Theme */
  theme: CanonicalTheme;
  /** replay child 所处 Scope 的 preliminary transform chain */
  scopeChain: ReadonlyArray<Transform>;
}>;

/** 保存布局探测的完整副作用快照，使成功结果可在最终位置仅重放一次 */
export type CompositeReplayTransaction = {
  /** 创建 transaction 的 layout-aware composite callback owner */
  owner: CompositeCompileOwner;
  /** probe 根 occurrence，用于 replay 时保留 probe 内部路径后缀 */
  originOccurrence: CompileOccurrenceLocator;
  /** 防止同一个 token 重复 placement */
  used: boolean;
  /** probe 完成的 primitive tree */
  primitives: Array<ScenePrimitive>;
  /** 与 primitives 对齐的父层 zIndex */
  primitiveZIndices: Array<number | undefined>;
  /** probe 的父布局输入 */
  layouts: Array<CompiledNodeLayout>;
  /** probe 自动 layout 几何贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** probe allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** probe namespace 当前 frame 变更 */
  namespaceChanges: Array<NamespaceFrameChange>;
  /** 与 namespaceChanges 对齐的最终注册 occurrence */
  namespaceChangeOccurrences: Array<CompileOccurrenceLocator>;
  /** 与 probe 图元树配对的完整来源，仅在选中重放时导入 */
  provenance?: CompileProvenanceSnapshot;
  /** probe 已解析资源 */
  resources: Array<SceneResource>;
  /** 仅在 replay 时发布的 warning */
  warnings: Array<CompileWarning>;
  /** 仅在 replay 时发布的 artifacts */
  artifacts: Array<CompositeArtifact>;
  /** probe 时的有效样式语义指纹，用于判断 replay 是否需要在新 Scope 中重新物化 */
  styleFingerprint: string;
  /** probe 时的有效 Theme 语义指纹，用于判断 replay 是否需要在新 Scope 中重新物化 */
  themeFingerprint: string;
  /** replay transaction 是否已经在当前 Scope preliminary chain 中完成 layout publication 投影 */
  scopeChainApplied?: boolean;
  /** 在 authored Scope 样式 / Theme 改变时重新走 Core probe channel 的内部物化器 */
  materialize?: (context: CompositeReplayMaterializeContext) => CompositeReplayTransaction;
};

/** context output tree 中的递归节点 */
export type CompositeRuntimeOutputChild =
  | Readonly<{
      /** 区分绑定输入的子项、布局重放与作用域输出 */
      kind: 'bound';
      /** 绑定局部运行时输入的子项 IR */
      child: IRChild;
      /** 仅交给绑定子项消费的运行时输入 */
      runtimeInputs: CompositeInputScope;
    }>
  | Readonly<{
      /** 区分绑定输入的子项、布局重放与作用域输出 */
      kind: 'replay';
      /** 同次编译中布局探测结果的重放凭证 */
      replay: CompositeReplay;
      /** 应用于重放结果的外层变换或包装 */
      wrapper?: CompositeReplayWrapper;
    }>
  | Readonly<{
      /** 区分绑定输入的子项、布局重放与作用域输出 */
      kind: 'scope';
      /** 生成作用域的继承、变换与布局属性 */
      props: CompositeCompileScopeProps;
      /** 按输出顺序排列的作用域子项 */
      children: ReadonlyArray<IRChild | CompositeCompileChild | CompositeBoundChild>;
    }>;

/** 单个 layout-aware composite callback 的 context owner */
export type CompositeCompileOwner = Readonly<{
  /** 错误消息使用的 composite key 与 occurrence */
  label: string;
}>;

/** opaque output handle 对应的 callback-local context entry */
export type CompositeRuntimeOutputEntry = Readonly<{
  /** 创建该输出句柄的复合组件回调身份 */
  owner: CompositeCompileOwner;
  /** 句柄对应的实际输出子树 */
  child: CompositeRuntimeOutputChild;
}> & {
  /** 输出句柄是否已经被消费，防止重复放置 */
  used: boolean;
};

/** layoutChild 返回对象对应的 callback-local replay identity */
export type CompositeLayoutResultEntry = Readonly<{
  /** 创建布局结果的复合组件回调身份 */
  owner: CompositeCompileOwner;
  /** 与该布局结果绑定的重放凭证 */
  replay: CompositeReplay;
}>;

/** compile-local WeakMap 保存的 opaque failure 快照 */
export type LayoutProbeFailureEntry = Readonly<{
  /** 创建失败凭证的回调身份，限制跨回调使用 */
  owner: CompositeCompileOwner;
  /** 最接近失败位置的 provider 标识 */
  providerKey: string;
  /** 失败子项在原始 IR 中的路径 */
  sourcePath: PropertyPath;
  /** 保留复合展开路径的完整失败位置 */
  occurrence: CompileOccurrenceLocator;
  /** 用于重新抛出时构造诊断的失败详情 */
  detail: string;
  /** 原始抛出值，作为最终错误的原因保留 */
  cause: unknown;
}> & {
  /** 该失败是否已被提升抛出，防止重复使用 */
  consumed: boolean;
};

/** 单次顶层编译共享的组件句柄和有界测量缓存，隔离试编译复用同一会话 */
export class CompositeCompileState {
  /** 有界的编译内成功贡献缓存 */
  private measurements: Map<string, LayoutContribution> = new Map();

  /** 对象依赖的编译内身份 */
  private measurementIdentities: WeakMap<object, number> = new WeakMap();

  /** 不可 JSON 编码的原始运行时输入也按值身份区分 */
  private measurementPrimitiveIdentities: Map<unknown, number> = new Map();

  /** 下一个局部身份序号 */
  private nextMeasurementIdentity = 0;

  /** token → 隔离 probe 结果；不跨 compile 共享 */
  readonly replayTransactions: WeakMap<object, CompositeReplayTransaction> = new WeakMap();

  /** LayoutChildResult identity → replay token；拒绝复制或伪造 result */
  readonly layoutResults: WeakMap<object, CompositeLayoutResultEntry> = new WeakMap();

  /** opaque handle → context output 节点；不跨 compile 共享 */
  readonly outputChildren: WeakMap<object, CompositeRuntimeOutputEntry> = new WeakMap();

  /** 以不透明布局失败标识索引当前回调或编译内的失败元数据 */
  readonly failures: WeakMap<object, LayoutProbeFailureEntry> = new WeakMap();

  /** 为运行时依赖分配编译内身份，不将其写入作者输入 */
  identityOf(dependency: unknown): number {
    if ((typeof dependency !== 'object' || dependency === null) && typeof dependency !== 'function') {
      const existing = this.measurementPrimitiveIdentities.get(dependency);
      if (existing !== undefined) return existing;
      const identity = this.nextMeasurementIdentity++;
      if (this.measurementPrimitiveIdentities.size >= 4096) this.measurementPrimitiveIdentities.clear();
      this.measurementPrimitiveIdentities.set(dependency, identity);
      return identity;
    }
    const existing = this.measurementIdentities.get(dependency);
    if (existing !== undefined) return existing;
    const identity = this.nextMeasurementIdentity++;
    this.measurementIdentities.set(dependency, identity);
    return identity;
  }

  /** 读取成功测量并更新最近使用顺序 */
  getMeasurement(key: string): LayoutContribution | undefined {
    const result = this.measurements.get(key);
    if (result !== undefined) {
      this.measurements.delete(key);
      this.measurements.set(key, result);
    }
    return result;
  }

  /** 保存成功贡献并限制同次编译的缓存规模 */
  setMeasurement(key: string, result: LayoutContribution): void {
    this.measurements.set(key, result);
    if (this.measurements.size > 4096) {
      const oldest = this.measurements.keys().next();
      if (!oldest.done) this.measurements.delete(oldest.value);
    }
  }
}
