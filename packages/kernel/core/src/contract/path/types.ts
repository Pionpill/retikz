import type { z, ZodType } from 'zod';

import type { Position } from '../../geometry/point';
import type { ScenePrimitive } from '../../primitive';
import type { PathCommand } from '../../primitive/path';
import type { IRJsonObject, IRPathBase, IRPosition } from '../../schemas';

/**
 * generate 拿到的运行时上下文
 * @description compile 解析 generator step 时构造。坐标均为世界坐标（scope transform 已在调用前折算）。
 */
export type PathGeneratorGenerateContext = {
  /** 当前游标世界坐标（上一段终点 / sub-path 起点） */
  from: Position;
  /**
   * step.to resolve 后的世界坐标。
   * @default undefined；step 未给 `to`
   */
  to?: Position;
  /** paramsSchema 校验后的参数对象（运行时仍标 unknown 值，generator 自行收窄） */
  params: Record<string, unknown>;
  /** targetParams 顶层 key → 世界坐标（NodeTarget 已 resolve） */
  resolvedTargets: Record<string, Position>;
  /**
   * 精度取整函数（与 compile/render 同一 round，保几何一致）。
   * @description generator 会自行派生控制点 / 采样点，compile 只能把当前精度策略作为函数注入，
   *   由 generator 在产生命令时决定哪些坐标需要取整。默认由 compile 注入
   *   `createRound(options.precision ?? DEFAULT_PRECISION)`，generator 作者不需要提供 fallback。
   */
  round: (n: number) => number;
};

/**
 * 一个 path generator 的可注册定义：JSON params schema + 顶层 Target 声明 + generate
 * @description plain object（factory 友好），含函数、**不进 IR**，走 `CompileOptions.pathGenerators` 运行时注入。
 *   core 不内置任何曲线生成器；parabola / sin 等由外部包注册。
 */
export type PathGeneratorDefinition = {
  /** 注册表 key，由 generator step 的 `name` 引用。 */
  name: string;
  /**
   * params 的 zod schema。
   * @description 类型约束输出 JSON-safe（`ZodType<IRJsonObject>`）。这是类型层约束，不是运行时唯一保证：
   *   compile 在 `paramsSchema.parse(params)` 之后还会对结果跑一次 `JsonObjectSchema.parse`，
   *   即便外部传了宽松 schema，最终非 JSON 输出（function / undefined 等）也被第二道 parse 拦下。
   */
  paramsSchema: ZodType<IRJsonObject>;
  /**
   * 哪些 params 顶层 key 是 NodeTarget（compile resolve 成世界坐标）；仅顶层，嵌套不支持
   * @default []
   */
  targetParams?: Array<string>;
  /**
   * 据 from / to / params / resolvedTargets 产低层 path 命令。
   * @description 返回 line / curve / cubic / move 等 `PathCommand`，不再走 step 编译（无二次递归）；
   *   可含 `move` 形成 sub-path（多段波形）。
   */
  generate: (ctx: PathGeneratorGenerateContext) => Array<PathCommand>;
};

/**
 * path kind 编译结果
 * @description path kind definition 把高层 path 形态编译成 Scene primitive，并返回参与 bbox / transform
 *   计算的关键点集合。
 */
export type PathKindCompileResult = {
  /** 实际渲染输出。 */
  primitives: Array<ScenePrimitive>;
  /** layout 与路径级 rotate / scale 的几何依据。 */
  points: Array<IRPosition>;
};

/**
 * path kind 编译上下文
 * @description compile 把已解析的 IR path、该 kind 的 options，以及复用默认 stroke / ribbon emission 的回调传入。
 *   自定义 kind 可以完全接管输出，也可以调用回调复用 core 的标准描边或 ribbon 逻辑。
 */
export type PathKindCompileContext<TOptions = IRJsonObject> = {
  /** 正在编译的 IR path。 */
  path: IRPathBase;
  /** 经 `optionsSchema` 解析后的 kind 配置项。 */
  options: TOptions;
  /**
   * 复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`。
   * @default 使用当前 `path`
   */
  emitStroke: (path?: IRPathBase) => PathKindCompileResult | null;
  /**
   * 复用 core 标准 ribbon 编译逻辑；不传 path 时使用当前 `path`。
   * @default 使用当前 `path`
   */
  emitRibbon: (path?: IRPathBase) => PathKindCompileResult | null;
};

/**
 * path kind 注册项
 * @description 扩展 path 的 `kind` 编译能力。definition 含函数，不进入 IR。
 */
export type PathKindDefinition<TOptions = IRJsonObject> = {
  /** 该 path kind 的 IR schema；`kind` 字段必须是非空 `z.literal(...)`。 */
  schema: z.ZodObject<{ kind: z.ZodLiteral<string> }>;
  /**
   * kind 配置项的额外校验 schema；缺省直接使用原始 `kindOptions ?? {}`。
   * @default 原始 `kindOptions ?? {}`
   */
  optionsSchema?: z.ZodType<TOptions>;
  /** 把该 path kind 编译成 Scene primitive；返回 null 表示该 path 不产生输出。 */
  compile: (context: PathKindCompileContext<TOptions>) => PathKindCompileResult | null;
};

/**
 * path kind 作者侧输入形态
 * @description 当前与 `PathKindDefinition` 相同；保留独立别名是为了对齐其它 define-registry API，
 *   也方便未来在定义点增加默认值归一或泛型收敛。
 */
export type PathKindDefinitionInput<TOptions = IRJsonObject> = PathKindDefinition<TOptions>;
