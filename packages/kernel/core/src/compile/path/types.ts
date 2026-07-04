import type { PathGeneratorDefinition } from '../../contract';
import type { Transform } from '../../contract';
import type { CompileWarning } from '../constant';
import type { PaintResolver } from '../resource';
import type { LowerTex } from '../text';
import type { ResolvedArrowRegistry } from './shrink';

/** emitPathPrimitive 可选 warn 钩子 */
export type EmitPathWarnHook = {
  /**
   * 警告收集器（由 compileToScene 传入）
   * @default undefined；不发出警告
   */
  onWarn?: (warning: CompileWarning) => void;
  /**
   * 当前 path 在 IR 中的 locator 前缀（如 `'children[3].path'`）
   * @default 'path'
   */
  irPath?: string;
  /** 该 path 所属 scope 的累积 transform 链。 */
  scopeChain?: ReadonlyArray<Transform>;
  /**
   * paint 解析器（PaintSpec → resourceRef + 登记资源）；缺省时纯色透传、PaintSpec 退化为无填充 / currentColor
   * @default 透传字符串；无法解析的 spec 变为 undefined
   */
  resolvePaint?: PaintResolver;
  /** 已解析 arrow 注册表。 */
  resolvedArrows?: ResolvedArrowRegistry;
  /** 有效 path generator 表。 */
  effectivePathGenerators?: ReadonlyMap<string, PathGeneratorDefinition>;
  /** 注入的 TeX 降解能力。 */
  lowerTex?: LowerTex;
};
