import type { SceneResource, Transform } from '../../contract';
import type { PathTargetView } from '../../resolve';
import type { PaintResolver } from '../resource';
import type { TexLowerer } from '../text';
import type { InputCompileWarning } from '../warning';

/** path emit 阶段的可选服务与诊断上下文 */
export type PathEmitOptions = {
  /** 当前编译资源，用于标记可视边界计算 */
  resources?: () => ReadonlyArray<SceneResource>;
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
