import type { PropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator, LayoutProposal, Transform } from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import type { CanonicalTheme } from '../../shared';
import type { CompiledNodeLayout } from '../layout';
import type { CompileWarning } from '../shared';
import type { SharedCompileContext } from './shared';

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

/** 完成与未就绪明确区分；未就绪不携带半成品或诊断 */
export type ElementCompileResult<TCompiled> =
  | Readonly<{
      status: 'compiled';
      compiled: TCompiled;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  | Readonly<{ status: 'pending' }>;
