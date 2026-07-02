import type { PathGeneratorDefinition } from '../../contract';
import type { Transform } from '../../contract';
import type { CompileWarning } from '../constant';
import type { LowerTex } from '../lower-tex';
import type { PaintResolver } from '../paint';
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
  /**
   * 该 path 所属 scope 的累积 Cartesian-only transform 链
   * @description step.to 内的 polar/at/offset 字面量按"当前 scope 局部度量 + 末端 apply chain"
   *   投影回全局；顶层 path / 无 scope chain 时为 `[]`（恒等，全局坐标）
   * @default []
   */
  scopeChain?: ReadonlyArray<Transform>;
  /**
   * paint 解析器（PaintSpec → resourceRef + 登记资源）；缺省时纯色透传、PaintSpec 退化为无填充 / currentColor
   * @default 透传字符串；无法解析的 spec 变为 undefined
   */
  resolvePaint?: PaintResolver;
  /**
   * 已解析 arrow 注册表（内置 8 + 注入）；缺省 = 仅内置 8
   * @description compileToScene 合并 `{ ...BUILTIN_ARROWS, ...options.arrows }` 传入；
   *   endpoint arrow marks 据此查表算 shrink / 调 def.emit；未注册名编译期 throw
   * @default resolveArrowRegistry()
   */
  resolvedArrows?: ResolvedArrowRegistry;
  /**
   * 有效 path generator 表（注入即全部，core 无内置）；缺省 = 空表
   * @description compileToScene 传 `options.pathGenerators ?? {}`；generator step 据此查表（未注册名
   *   编译期 throw，错误列出可用名）→ 双 parse 护栏 → targetParams resolve → 调 generate splice 命令。
   * @default EMPTY_PATH_GENERATORS
   */
  effectivePathGenerators?: ReadonlyMap<string, PathGeneratorDefinition>;
  /**
   * 注入的 TeX 降解能力（来自 @retikz/tex）；供边标注里的 `$...$` 行内公式降解
   * @description 缺省 = 无 tex 能力，边标注 `$...$` 字面（gating off）；注入后边标注可写行内公式
   * @default undefined；禁用行内 TeX
   */
  lowerTex?: LowerTex;
};
