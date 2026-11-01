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
  SceneClipPath,
} from '../../../contract';
import type { CompositeInputScope } from '../../../contract/composite';
import type { MergedScopeDefaults } from '../../../resolve';
import type { IRChild } from '../../../schemas';
import type { CanonicalTheme } from '../../../shared';
import type { CompileProvenanceSnapshot, CompileOwnerKey } from '../../provenance';
import type { CompositeArtifact } from '../../types';
import type { InputCompileWarning } from '../../warning';
import type { CompileExecutionContext } from '../context';
import type { TreeCompileFrame } from '../frame';
import type { NamespaceFrameChange } from '../namespace';
import type { CompiledNodeLayout } from '../node';
import type { LayoutBoundsContribution, ScopeChild, SubtreeOutputContribution, SubtreeCompileHost } from '../types';

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
  /** probe 中由 fork baseline collision 产生的 duplicate warning */
  namespaceBaselineWarnings: Array<{
    /** 与探测起始命名空间发生冲突的标识 */
    id: string;
    /** 重放时需要重新判断是否发布的重名诊断 */
    warning: InputCompileWarning;
  }>;
  /** probe 已解析资源 */
  resources: Array<SceneResource>;
  /** 仅在 replay 时发布的 warning */
  warnings: Array<InputCompileWarning>;
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

/** 完成预检的重放事务及外层裁剪 */
export type PreparedReplay = Readonly<{
  /** 选中的隔离试编译贡献 */
  transaction: CompositeReplayTransaction;
  /** 预检阶段解析的包装裁剪 */
  wrapperClipPath?: SceneClipPath;
}>;

/** 完成归属检查的组件输出子项 */
export type PreparedRuntimeOutput = Readonly<{
  /** 绑定输入、重放或生成 Scope */
  output: CompositeRuntimeOutputChild;
  /** 生成 Scope 预先解析的裁剪 */
  scopeClipPath?: SceneClipPath;
}>;

/** 预检成功后供输出提交使用的句柄索引 */
export type PreparedCompositeOutputs = Readonly<{
  /** 输出句柄对应的完整子项 */
  outputs: ReadonlyMap<object, PreparedRuntimeOutput>;
  /** 重放凭证对应的事务 */
  replays: ReadonlyMap<CompositeReplay, PreparedReplay>;
}>;

/** Composite 执行所需的遍历操作，不持有遍历器的私有状态 */
export type CompositeCompileHost = SubtreeCompileHost & {
  /** 接受已选择和重映射的子树贡献，输出容器由宿主维护 */
  acceptContribution: (frame: TreeCompileFrame, contribution: SubtreeOutputContribution) => void;
  /** 编译一个已绑定输入或生成的子项 */
  compileChild: (
    child: IRChild,
    index: number,
    frame: TreeCompileFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
  ) => void;
  /** 编译生成的 Scope，允许其内容使用已预检的输出句柄 */
  compileScopeChild: (
    child: ScopeChild,
    index: number,
    frame: TreeCompileFrame,
    occurrence?: CompileOccurrenceLocator,
    compositeDepth?: number,
    semanticOwner?: CompileOwnerKey,
    compileNested?: (frame: TreeCompileFrame, preliminaryTransforms: ReadonlyArray<Transform> | undefined) => void,
    clipPath?: SceneClipPath,
  ) => void;
};

/** 重放与输出提交的显式依赖 */
export type CompositeExecutionContext = {
  /** 当前编译的工作区与名称环境 */
  context: CompileExecutionContext;
  /** 递归与诊断调度能力 */
  host: CompositeCompileHost;
};
