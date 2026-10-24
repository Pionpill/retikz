import type {
  CompileObservationAncestor,
  CompileOccurrenceLocator,
  GroupPrim,
  LayoutProposal,
  ScenePrimitive,
  SceneResource,
  Transform,
} from '../../contract';
import type { EffectiveScopeDefaults } from '../../resolve';
import type { IRPosition, ResolvedDropShadow } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
import type { CompileEnvironment } from '../environment';
import type { NodeCompilation, NodeLayout } from '../node';
import type {
  CompileObservationContribution,
  CompileObservationRuntime,
  PendingNodeLayoutObservation,
} from '../orchestration';
import type { CompileWarning } from '../warning';

/** 元素接收到的有效样式与主题，不包含资源工作区 */
export type ElementCompileContext = Readonly<{
  /** 按 Core 继承规则解析的默认配置 */
  defaults: EffectiveScopeDefaults;
  /** 有效主题 */
  theme: ResolvedTheme;
}>;

/** 一个版本中的名称绑定；对象身份由调用者映射到其节点 */
export type CompileBinding =
  | Readonly<{ state: 'pending'; binding: object }>
  | Readonly<{
      state: 'ready';
      binding: object;
      /** 被引用元素的来源路径 */
      irPath?: string;
      layout: NodeLayout;
    }>;

/** 声明位置可见的名称空间；父引用形成 inside-out 查找链 */
export type CompileNamespace = Readonly<{
  /** 当前命名空间的可见绑定，同名覆盖由声明顺序决定 */
  bindings: ReadonlyMap<string, CompileBinding>;
  /** 外层命名空间 */
  parent?: CompileNamespace;
}>;

/** 包含未命中的一次名称读取，用于绑定与状态失效 */
export type CompileRead = Readonly<{
  /** 本次实际访问的命名空间 */
  namespace: CompileNamespace;
  /** 作者引用的名称 */
  name: string;
  /** 缺失、待计算或完成 */
  state: 'missing' | 'pending' | 'ready';
  /** 命中时的版本内绑定 */
  binding?: object;
}>;

/** 单元素调用共享的显式输入，不拥有调度器 */
export type ElementCompileOptions = Readonly<{
  /** 稳定编译配置、能力定义与服务 */
  environment: CompileEnvironment;
  /** 父级有效上下文 */
  context: ElementCompileContext;
  /** 诊断位置，不作为元素身份 */
  irPath: string;
  /** 当前声明位置可见的名称空间 */
  namespace?: CompileNamespace;
  /** 禁止后代几何引用的祖先 Scope 绑定 */
  ancestorScopes?: ReadonlySet<object>;
  /** 已就绪的父变换 */
  transforms?: ReadonlyArray<Transform>;
  /** 布局分配约束 */
  proposal?: LayoutProposal;
  /** 本批独占的观察会话，不可跨次复用 */
  observation?: CompileObservationRuntime;
  /** 存在 Composite 展开时的完整出现位置 */
  occurrence?: CompileOccurrenceLocator;
  /** 逻辑容器祖先，供观察者读取 */
  ancestors?: ReadonlyArray<CompileObservationAncestor>;
}>;

/** 元素本地可见边界的一项贡献，独立保留阴影语义 */
export type CompileBounds = Readonly<{
  /** 本地边界点 */
  boundsPoints: ReadonlyArray<IRPosition>;
  /** 本项阴影 */
  shadow?: ResolvedDropShadow;
  /** 外框等装饰边界，祖先 clip 可裁减其可见范围 */
  decoration?: boolean;
}>;

/** 与本地资源配套的输出片段，不包含重复的子树 */
export type CompileOutput = Readonly<{
  /** 本元素绘制贡献 */
  primitives: Array<ScenePrimitive>;
  /** 同层输出排序值 */
  zIndex?: number;
  /** 图元引用的局部资源 */
  resources: Array<SceneResource>;
  /** 可见边界贡献 */
  bounds: ReadonlyArray<CompileBounds>;
  /** 选中的节点布局事实，组装时应用最终 Scope 变换 */
  nodeLayouts?: ReadonlyArray<Readonly<PendingNodeLayoutObservation>>;
  /** 选中的 owner 输出事实，组装时才调用观察会话 */
  observations?: ReadonlyArray<Readonly<CompileObservationContribution>>;
}>;

/** 节点完整编译状态，布局与绘制使用同一次解析结果 */
export type CompiledNode = Readonly<
  NodeCompilation & {
    /** 本地绘制输出 */
    output: CompileOutput;
  }
>;

/** 坐标编译状态，不创建虚构的可见图元 */
export type CompiledCoordinate = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: string;
  /** 供名称登记的作者 id */
  id: string;
  /** 本地位置 */
  position: IRPosition;
  /** 仅存在观察贡献时提供 */
  output?: CompileOutput;
}>;

/** Path 完整编译状态，自定义路径不要求具有单一中心线 */
export type CompiledPath = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: string;
  /** 完成宿主处理后的本地输出，空输出也是合法完成状态 */
  output: CompileOutput;
}>;

/** Scope 子元素计算前的准备状态，不代表包络已就绪 */
export type ScopeCompilationPreparation = Readonly<{
  /** 子元素有效继承上下文 */
  scope: ElementCompileContext;
  /** 已在父坐标系解析的放置目标 */
  positionTarget?: IRPosition;
  /** 不依赖包络时可提前使用的自身变换 */
  preliminaryTransforms?: Array<Transform>;
}>;

/** Scope 编译状态，仅持有自身包络、输出与组装属性 */
export type CompiledScope = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: string;
  /** 局部内容包络，包含空内容时的既有退化布局 */
  envelope: NodeLayout;
  /** Scope 输出的包装属性，不包含 children */
  group: Omit<GroupPrim, 'children'>;
  /** 自身装饰及其资源，不重复持有子输出 */
  output: CompileOutput;
}>;

/** 完成与未就绪明确区分；未就绪不携带半成品或诊断 */
export type ElementCompileResult<TCompiled> =
  | Readonly<{
      status: 'compiled';
      compiled: TCompiled;
      reads: ReadonlyArray<CompileRead>;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  | Readonly<{ status: 'pending'; reads: ReadonlyArray<CompileRead> }>;
