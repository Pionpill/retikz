import type { PropertyPath } from '@retikz/foundation';

import type {
  CompileOccurrenceLocator,
  GroupPrimitive,
  LayoutProposal,
  ScenePrimitive,
  SceneResource,
  Transform,
} from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { SharedCompileContext } from '../context';
import type { CompiledNodeLayout, NodeCompilation } from '../node';
import type { CompileWarning } from '../warning';

/** 元素接收到的有效样式与主题，不包含资源工作区 */
export type ElementCompileContext = Readonly<{
  /** 按 Core 继承规则解析的默认配置 */
  defaults: MergedScopeDefaults;
  /** 有效主题 */
  theme: CanonicalTheme;
}>;

/** 单次引用查询结果；不携带调用方的名称 frame 或节点身份 */
export type ElementCompileReference =
  | Readonly<{ state: 'pending' }>
  | Readonly<{ state: 'ancestor' }>
  | Readonly<{
      state: 'ready';
      /** 被引用元素的来源路径 */
      irPath?: PropertyPath;
      layout: CompiledNodeLayout;
    }>;

/** 单元素调用共享的显式输入，不拥有调度器 */
export type ElementCompileOptions = Readonly<{
  /** 稳定编译配置、能力定义与服务 */
  shared: SharedCompileContext;
  /** 父级有效上下文 */
  context: ElementCompileContext;
  /** 诊断位置，不作为元素身份 */
  irPath: PropertyPath;
  /** 查询声明位置可见的引用；缺失返回 undefined，读取追踪由调用方负责 */
  lookupReference?: (name: string) => ElementCompileReference | undefined;
  /** 已就绪的父变换 */
  transforms?: ReadonlyArray<Transform>;
  /** 布局分配约束 */
  proposal?: LayoutProposal;
  /** 存在 Composite 展开时的完整出现位置 */
  occurrence?: CompileOccurrenceLocator;
}>;

/** 元素本地可见边界的一项贡献，独立保留阴影语义 */
export type CompileBounds = Readonly<{
  /** 本地边界点 */
  boundsPoints: ReadonlyArray<IRPosition>;
  /** 本项阴影 */
  shadow?: CanonicalDropShadow;
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
  irPath: PropertyPath;
  /** 供名称登记的作者 id */
  id: string;
  /** 本地位置 */
  position: IRPosition;
}>;

/** Path 完整编译状态，自定义路径不要求具有单一中心线 */
export type CompiledPath = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: PropertyPath;
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
  irPath: PropertyPath;
  /** 局部内容包络，包含空内容时的既有退化布局 */
  envelope: CompiledNodeLayout;
  /** Scope 输出的包装属性，不包含 children */
  group: Omit<GroupPrimitive, 'children'>;
  /** 自身装饰及其资源，不重复持有子输出 */
  output: CompileOutput;
}>;

/** 完成与未就绪明确区分；未就绪不携带半成品或诊断 */
export type ElementCompileResult<TCompiled> =
  | Readonly<{
      status: 'compiled';
      compiled: TCompiled;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  | Readonly<{ status: 'pending' }>;
