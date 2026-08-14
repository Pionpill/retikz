import type { PathGeneratorDefinition, Transform } from '../../contract';
import type { ScenePrimitive } from '../../contract';
import type { StrokePathOwnerOutput } from '../../contract';
import type { IRPosition } from '../../schemas';
import type { PathTargetView } from '../../resolve/path';
import type { PaintResolver } from '../resource';
import type { LowerTex } from '../text';
import type { CompileWarningInput } from '../warning';
import type { ResolvedArrowRegistry } from './stroke';

/** path emit 阶段产出的 Scene primitive 与 bbox 采样点 */
export type PathPrimitiveEmitResult = {
  /** 实际 Scene 输出 */
  primitives: Array<ScenePrimitive>;
  /** layout 与 path 级 rotate / scale 的几何依据 */
  boundsPoints: Array<IRPosition>;
};

/** path emit 阶段的可选服务与诊断上下文 */
export type PathEmitOptions = {
  /**
   * 警告收集器（由 compileToScene 传入）
   * 缺省时不发出警告
   */
  onWarn?: (warning: CompileWarningInput) => void;
  /**
   * 当前 path 在 IR 中的 locator 前缀（如 `'children[3].path'`）
   * @default 'path'
   */
  irPath?: string;
  /** 该 path 所属 scope 的累积 transform 链 */
  scopeChain?: ReadonlyArray<Transform>;
  /**
   * paint 解析器（PaintSpec → resourceRef + 登记资源）；缺省时纯色透传、PaintSpec 退化为无填充 / currentColor
   * @default 透传字符串；无法解析的 spec 变为 undefined
   */
  resolvePaint?: PaintResolver;
  /** 已解析 arrow 注册表 */
  resolvedArrows?: ResolvedArrowRegistry;
  /** 有效 path generator 表 */
  effectivePathGenerators?: ReadonlyMap<string, PathGeneratorDefinition>;
  /** resolving 阶段绑定的 target geometry view（由 emit context 提供） */
  targetView?: PathTargetView;
  /** 注入的 TeX 降级能力 */
  lowerTex?: LowerTex;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
  /** 仅在 owner 明确请求时接收最终 settled command snapshot */
  captureOwnerOutput?: (subject: StrokePathOwnerOutput) => void;
};
