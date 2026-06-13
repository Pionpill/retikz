import type { z } from 'zod';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import type { IRJsonObject } from '../ir/json';
import type { PaintValue, ScenePrimitive } from '../primitive';

/**
 * emit 需要的视觉样式子集
 * @description 从 NodeLayout 的样式字段收敛（不含几何 / 文本）；独立 type，不耦合内部 NodeLayout。
 *   字段名与 NodeLayout 样式字段一致（单一词汇表）。
 */
export type ShapeStyle = {
  fill?: PaintValue;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  dashPattern?: Array<number>;
  cornerRadius?: number;
  opacity?: number;
};

/**
 * 一个 shape 的参数化可注册定义（定义点 typed 形态）
 * @description plain object（factory 友好：`createPolygonShape(6)` 这类普通函数返回它即可）；含函数与
 *   `paramsSchema`，**不进 IR**，走 `CompileOptions.shapes` 运行时注入。内置 shape（rectangle / ellipse /
 *   sector / arc / polygon / star，circle / diamond 为 preset 别名）也是注册项（无内置特权）。
 *   每个计算函数末位收 per-instance `params`（类型由 `paramsSchema.parse` 在编译期保证），无参形状用
 *   `z.strictObject({})` 并忽略 `params`。
 *
 *   - `paramsSchema`：类型约束输出 JSON-safe（`z.ZodType<TParams>`）。这是类型层约束，不是运行时唯一保证——
 *     compile 在 `paramsSchema.parse(params)` 之后还会对结果跑一次 `JsonObjectSchema.parse`，拦下宽松
 *     schema 放过的非 JSON 输出（function / undefined 等）。
 *
 *   坐标语义两套，第三方最易写错：
 *   - `boundaryPoint` / `anchor` 收**带 `rotate` 的 Rect**——用 re-export 的 `worldToLocal` / `localToWorld` 写局部系几何。
 *   - `emit` 收**轴对齐 Rect（rotate=0）**——旋转由编译器在外层 `GroupPrim` 统一施加。
 */
export type ShapeDefinitionInput<TParams extends IRJsonObject> = {
  /** params 的 zod schema；类型约束输出 JSON-safe（运行时双 parse 才是真正护栏，见编译期桥接） */
  paramsSchema: z.ZodType<TParams>;
  /**
   * 外接：内容半轴（text + padding）+ params → 外接框半轴。
   * @description 必返回**包含完整 shape 的精确 AABB 半轴**（compile 的 viewBox / scope bbox 只累积该 AABB
   *   四角）。rectangle: identity；circle: √(hw²+hh²) 两轴相等；ellipse: ×√2；diamond: ×2；参数化形状据 params 算。
   */
  circumscribe: (
    innerHalfWidth: number,
    innerHalfHeight: number,
    params: TParams,
  ) => { halfWidth: number; halfHeight: number };
  /**
   * AABB 中心相对 node `position` 的偏移（可选；缺省 `[0, 0]` = AABB 中心即 position）。
   * @description 多数 shape 的视觉 AABB 以 position 为中心（rectangle / ellipse / diamond）；但 sector 等
   *   形状的语义锚点（圆心 apex）才是 position，其外接 AABB 中心偏在一侧——此 hook 让 compile 把
   *   `rect.center` 放到 `position + offset`，使 bbox / viewBox 罩住完整形状、anchor 以 AABB 中心 rect 计算时
   *   apex 落回 position。返回**未旋转**局部偏移（compile 在施加 node rotate 前用于定位 rect 中心）。
   */
  circumscribeOffset?: (params: TParams) => Position;
  /** 中心 → toward 射线 ∩ 边界（rect 带 rotate）；params 喂参数化边界。 */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /**
   * 命名 anchor 世界坐标；shape 不认识的名字返回 `undefined`（调用方据此抛清晰错误）。
   * @description compass 方位名（north / south / ... / center）的约定（与 TikZ 一致）：默认连接面下 compile 先调本函数，
   *   shape 返回真实形状上的点即采用（如 ellipse 落真实周长、polygon 落外接 AABB）；返回 `undefined` 则 compile
   *   回退到外接 AABB 矩形。故 shape 作者可只实现 shape 专属命名 anchor（tip-N / apex 等），compass 名交回退即可；
   *   要让 compass 贴真实形状边界（圆 / 椭圆类）才需自行处理 compass。
   */
  anchor: (rect: Rect, name: string, params: TParams) => Position | undefined;
  /**
   * 边上比例点：side 真实边界从约定起点起 t∈[0,1] 处（轴对齐空间求出后由 layout 投回世界系）。
   * @description 可选——目前仅 rectangle / ellipse 实现；未实现的 shape（polygon / sector / arc / star）收到 `{ side, t }` 时编译期（resolveEdgePoint）抛明确错。
   *   与 `anchor` 同坐标语义：收**带 rotate 的 Rect**，自行用 worldToLocal/localToWorld 处理旋转。
   */
  edgePoint?: (
    rect: Rect,
    side: 'north' | 'south' | 'east' | 'west',
    t: number,
    params: TParams,
  ) => Position;
  /** 视觉 primitive，**轴对齐空间**（rotate 由编译器外层 GroupPrim 统一施加）；params 喂参数化几何。 */
  emit: (
    rect: Rect,
    style: ShapeStyle,
    round: (n: number) => number,
    params: TParams,
  ) => Iterable<ScenePrimitive>;
  /**
   * node scale 作用于 params 的方式（可选）。
   * @description 给定原始 params 与水平 / 垂直缩放因子 `sx` / `sy`，返回缩放后的 params。
   *   缺省时编译器沿用默认行为——深度缩放 params 里所有数值叶子（uniform 几何均值因子）。
   *   适用于 params 含「非长度」语义字段（如角度）的形状：sector / arc 只缩半径、不缩角度，
   *   通过本 hook 把 startAngle / endAngle 排除在缩放外。不缩放任何 params 的形状不必实现。
   */
  scaleParams?: (params: TParams, sx: number, sy: number) => TParams;
};

/**
 * shape 定义的擦除形态：registry 存这个
 * @description 所有函数收 `IRJsonObject`（实际类型由 `paramsSchema.parse` 在编译期保证）；registry 同构
 *   `Record<string, ShapeDefinition>`、不泛型化（避免逆变 / 落 any）。定义点用 `defineShape<TParams>` 拿类型安全。
 */
export type ShapeDefinition = ShapeDefinitionInput<IRJsonObject>;
