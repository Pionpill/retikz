import type { PropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator, SceneResource, Transform } from '../../contract';
import type { MergedScopeDefaults, PathTargetView } from '../../resolve';
import type { IRPathBase } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompileOutput } from '../output';
import type { PaintRegistry, PaintResolver } from '../resource';
import type { TexLowerer } from '../text';
import type { InputCompileWarning } from '../warning';

/** path emit 阶段的可选服务与诊断上下文 */
export type PathEmitOptions = {
  /** 当前编译资源，用于标记可视边界计算 */
  resources?: () => ReadonlyArray<SceneResource>;
  /** 在标记输出处保留引用的宿主诊断位置 */
  collectResourceReferences?: PaintRegistry['collectReferences'];
  /**
   * 警告收集器（由 compileToScene 传入）
   * 缺省时不发出警告
   */
  onWarn?: (warning: InputCompileWarning) => void;
  /** 该 path 所属 scope 的累积 transform 链 */
  scopeChain?: ReadonlyArray<Transform>;
  /**
   * paint 解析器（IRPaint → resourceRef + 登记资源）；缺省时纯色透传、IRPaint 退化为无填充 / currentColor
   * @default undefined
   */
  resolvePaint?: PaintResolver;
  /** resolving 阶段绑定的 target geometry view（由 emit context 提供） */
  targetView?: PathTargetView;
  /** 注入的 TeX 降级能力 */
  lowerTex?: TexLowerer;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
};

/** Path 完整编译状态，自定义路径不要求具有单一中心线 */
export type CompiledPath = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: PropertyPath;
  /** 完成宿主处理后的本地输出，空输出也是合法完成状态 */
  output: CompileOutput;
}>;

/** 引用就绪后的路径编译输入，不包含遍历队列或输出容器 */
export type InputPathCompilation = {
  /** 当前路径声明 */
  path: IRPathBase;
  /** 当前变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** 诊断位置 */
  irPath: PropertyPath;
  /** 路径出现位置 */
  occurrence: CompileOccurrenceLocator;
  /** 有效样式默认值 */
  scopeDefaults: MergedScopeDefaults;
  /** 当前主题 */
  theme: CanonicalTheme;
};
