import type { z } from 'zod';

import type { Position } from '../../geometry/point';
import type { Rect } from '../../geometry/rect';
import type { PaintValue, ScenePrimitive } from '../../primitive';
import type { ResolvedDropShadow } from '../../schemas/effects';
import type { IRJsonObject } from '../../schemas/json';
import type { IRGraphicStyle } from '../../schemas/style';
import type { WebSideValue } from '../../shared';

/** 从 IR graphic style 复用的已解析 shape 样式字段。 */
type ResolvedShapeStyleFields = Pick<IRGraphicStyle, 'fillOpacity' | 'strokeWidth' | 'drawOpacity' | 'opacity' | 'blendMode'>;

/**
 * emit 需要的已解析视觉样式子集。
 * @description 从 NodeLayout 的样式字段收敛（不含几何 / 文本），作为 shape provider 的 runtime 输入。
 *   与 IR style schema 同语义的标量字段通过 `IRGraphicStyle` 复用类型；paint / shadow 等 compile 后字段显式组合。
 */
export type ResolvedShapeStyle = {
  /**
   * 已解析填充 paint；缺省由 shape emit 按透明填充处理。
   * @default 'transparent'
   */
  fill?: PaintValue;
  /**
   * 填充不透明度。
   * @default 1
   */
  fillOpacity?: ResolvedShapeStyleFields['fillOpacity'];
  /**
   * 已解析描边 paint；缺省由 shape emit 按当前文字色处理。
   * @default 'currentColor'
   */
  stroke?: PaintValue;
  /**
   * 描边不透明度；来自 IR 的 `drawOpacity`，进入 provider 前按 primitive 字段语义改名。
   * @default 1
   */
  strokeOpacity?: ResolvedShapeStyleFields['drawOpacity'];
  /**
   * 描边宽度。
   * @default 1
   */
  strokeWidth?: ResolvedShapeStyleFields['strokeWidth'];
  /**
   * 描边虚线模式；缺省为实线。
   * @default []
   */
  dashPattern?: Array<number>;
  /**
   * 圆角半径。
   * @default 0
   */
  cornerRadius?: number;
  /**
   * 整体不透明度。
   * @default 1
   */
  opacity?: ResolvedShapeStyleFields['opacity'];
  /**
   * 投影：解析后对象（compile 已把预设展开 + 显式字段覆盖合并；缺省无投影）
   * @default 无投影
   */
  shadow?: ResolvedDropShadow;
  /**
   * 混合模式：解析后值（compile 透传；缺省 / normal 等价普通 source-over）
   * @default 'normal'
   */
  blendMode?: ResolvedShapeStyleFields['blendMode'];
};

/**
 * 一个 shape 的参数化可注册定义（定义点 typed 形态）
 * @description plain object（factory 友好：`createPolygonShape(6)` 这类普通函数返回它即可）；含函数与
 *   `paramsSchema`，**不进 IR**，走 `CompileOptions.shapes` 运行时注入。内置 shape（rectangle / ellipse /
 *   sector / arc / polygon / star，circle / diamond 为 preset 别名）也是注册项（无内置特权）。
 *   每个计算函数末位收 per-instance `params`（类型由 `paramsSchema.parse` 在编译期保证），无参形状用
 *   `z.strictObject({})` 并忽略 `params`。
 */
export type ShapeDefinitionInput<TParams extends IRJsonObject> = {
  /** 注册表 key，由 IR `node.shape` 引用。 */
  name: string;
  /**
   * params 的 zod schema。
   * @description 类型约束输出 JSON-safe（`z.ZodType<TParams>`）。这是类型层约束，不是运行时唯一保证：
   *   compile 在 `paramsSchema.parse(params)` 之后还会对结果跑一次 `JsonObjectSchema.parse`，
   *   拦下宽松 schema 放过的非 JSON 输出（function / undefined 等）。
   */
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
   * @default [0, 0]
   */
  circumscribeOffset?: (params: TParams) => Position;
  /**
   * 中心 → toward 射线 ∩ 边界。
   * @description rect 带 rotate；需要局部系几何时从 `geometry/transform` 使用 `worldToLocal` / `localToWorld`。
   */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /**
   * 命名 anchor 世界坐标；shape 不认识的名字返回 `undefined`（调用方据此抛清晰错误）。
   * @description 标准方位名使用 Web/CSS canonical 值（top / right / ...）：默认连接面下 compile 先调本函数，
   *   shape 返回真实形状上的点即采用（如 ellipse 落真实周长、polygon 落外接 AABB）；返回 `undefined` 则 compile
   *   回退到外接 AABB 矩形。故 shape 作者可只实现 shape 专属命名 anchor（tip-N / apex 等），标准方位名交回退即可；
   *   要让标准方位贴真实形状边界（圆 / 椭圆类）才需自行处理。`center` 由 compile 特殊处理，不传给 provider。
   */
  anchor: (rect: Rect, name: string, params: TParams) => Position | undefined;
  /**
   * 边上比例点：Web side 真实边界从约定起点起 t∈[0,1] 处（轴对齐空间求出后由 layout 投回世界系）。
   * @description 可选——目前仅 rectangle / ellipse 实现；未实现的 shape（polygon / sector / arc / star）收到 `{ side, t }` 时编译期（resolveEdgePoint）抛明确错。
   *   side 使用 Web/CSS canonical 值：top/right/bottom/left。与 `anchor` 同坐标语义：收**带 rotate 的 Rect**，自行用 `worldToLocal` / `localToWorld` 处理旋转。
   * @default 不支持；该 shape 的 side anchor 会抛错
   */
  edgePoint?: (rect: Rect, side: WebSideValue, t: number, params: TParams) => Position;
  /**
   * 视觉 primitive。
   * @description emit 收轴对齐空间（rotate=0）的 rect；旋转由编译器在外层 `GroupPrim` 统一施加。
   *   params 喂参数化几何。
   */
  emit: (rect: Rect, style: ResolvedShapeStyle, round: (n: number) => number, params: TParams) => Iterable<ScenePrimitive>;
  /**
   * node scale 作用于 params 的方式（可选）。
   * @description 给定原始 params 与水平 / 垂直缩放因子 `sx` / `sy`，返回缩放后的 params。
   *   缺省时编译器沿用默认行为——深度缩放 params 里所有数值叶子（uniform 几何均值因子）。
   *   适用于 params 含「非长度」语义字段（如角度）的形状：sector / arc 只缩半径、不缩角度，
   *   通过本 hook 把 startAngle / endAngle 排除在缩放外。不缩放任何 params 的形状不必实现。
   * @default 按 `Math.sqrt(sx * sy)` 深度缩放 params 中的数值叶子
   */
  scaleParams?: (params: TParams, sx: number, sy: number) => TParams;
};

/**
 * shape 定义的擦除形态：registry 存这个
 * @description 所有函数收 `IRJsonObject`（实际类型由 `paramsSchema.parse` 在编译期保证）；registry 同构
 *   不泛型化（避免逆变 / 落 any）。定义点用 `defineShape<TParams>` 拿类型安全。
 */
export type ShapeDefinition = ShapeDefinitionInput<IRJsonObject>;
