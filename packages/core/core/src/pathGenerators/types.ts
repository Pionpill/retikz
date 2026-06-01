import type { ZodType } from 'zod';
import type { Position } from '../geometry/point';
import type { IRJsonObject } from '../ir/json';
import type { PathCommand } from '../primitive/path';

/**
 * generate 拿到的运行时上下文
 * @description compile 解析 generator step 时构造：`from` = 当前游标世界坐标；`to` = step.to resolve 后的
 *   世界坐标（step 无 `to` 时缺省）；`params` = `paramsSchema.parse` 后的参数对象；`resolvedTargets` =
 *   `targetParams` 列出的顶层 key 经 target lookup 解析成的世界坐标；`round` = 与 compile/render 同一精度
 *   取整函数。坐标均为世界坐标（scope transform 已在调用前折算）。
 */
export type PathGeneratorContext = {
  /** 当前游标世界坐标（上一段终点 / sub-path 起点） */
  from: Position;
  /** step.to resolve 后的世界坐标；step 未给 `to` 时为 undefined */
  to?: Position;
  /** paramsSchema 校验后的参数对象（运行时仍标 unknown 值，generator 自行收窄） */
  params: Record<string, unknown>;
  /** targetParams 顶层 key → 世界坐标（NodeTarget 已 resolve） */
  resolvedTargets: Record<string, Position>;
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * 一个 path generator 的可注册定义：JSON params schema + 顶层 Target 声明 + generate
 * @description plain object（factory 友好），含函数、**不进 IR**，走 `CompileOptions.pathGenerators` 运行时注入。
 *   core 不内置任何曲线生成器；parabola / sin 等由外部包注册。
 *
 *   - `paramsSchema`：类型约束输出为 JSON-safe（`ZodType<IRJsonObject>`）。这是类型层约束，不是运行时唯一保证——
 *     compile 在 `paramsSchema.parse(params)` 之后还会对结果跑一次 `JsonObjectSchema.parse`，
 *     即便外部传了宽松 schema，最终非 JSON 输出（function / undefined 等）也被第二道 parse 拦下。
 *   - `targetParams`：哪些 params 顶层 key 是 NodeTarget（compile 把它们 resolve 成世界坐标喂 `resolvedTargets`）。
 *     仅支持顶层 key；嵌套 / 数组内的 Target 不解析，须放 params 顶层。
 *   - `generate`：返回低层 `PathCommand[]`（line / curve / cubic / move 等），不再走 step 编译（无二次递归）；
 *     允许产含 `move` 的 sub-path（多段波形）。
 */
export type PathGeneratorDefinition = {
  /** params 的 zod schema；类型约束输出 JSON-safe（运行时双 parse 才是真正护栏） */
  paramsSchema: ZodType<IRJsonObject>;
  /** 哪些 params 顶层 key 是 NodeTarget（compile resolve 成世界坐标）；仅顶层，嵌套不支持 */
  targetParams?: Array<string>;
  /** 据 from / to / params / resolvedTargets 产低层 path 命令；可含 move 形成 sub-path */
  generate: (ctx: PathGeneratorContext) => Array<PathCommand>;
};
