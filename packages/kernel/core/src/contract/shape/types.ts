import type { Position } from '@retikz/math';
import type { z } from 'zod';

import type {
  IRGraphicStyle,
  IRJsonObject,
  IRPathBase,
  ResolvedDropShadow,
} from '../../schemas';
import type { AnchorValue, Rect, SideValue } from '../../shared';
import type { PaintValue, ScenePrimitive } from '../scene';

/** 从 IR graphic style 复用的已解析 shape 样式字段。 */
type ResolvedShapeStyleFields = Pick<IRGraphicStyle, 'fillOpacity' | 'strokeWidth' | 'drawOpacity' | 'opacity' | 'blendMode'>;

/** Shape provider 接收到的命名 anchor：标准方位名或 shape 自定义扩展名。 */
export type ShapeAnchorName = AnchorValue | (string & {});

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
   * 描边虚线起始偏移；缺省为 0。
   * @default 0
   */
  dashOffset?: IRPathBase['dashOffset'];
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
 * 可注册的 shape 定义。
 * @description 描述第三方作者和内置 shape 共同实现的运行时能力契约；定义本身不进入 IR。
 *   每个能力函数都以实例级 `params` 作为末位参数。
 */
export type ShapeDefinitionInput<TParams extends IRJsonObject> = {
  /** shape 名称，由 IR `node.shape` 引用。 */
  name: string;
  /**
   * 实例参数 schema。
   * @description 解析结果必须是 JSON object；无参 shape 使用 `z.strictObject({})`。
   */
  paramsSchema: z.ZodType<TParams>;
  /**
   * 根据内容半轴和 params 计算完整 shape 的外接 AABB 半轴。
   */
  circumscribe: (
    innerHalfWidth: number,
    innerHalfHeight: number,
    params: TParams,
  ) => { halfWidth: number; halfHeight: number };
  /**
   * 外接 AABB 中心相对 node `position` 的未旋转局部偏移。
   * @default [0, 0]
   */
  circumscribeOffset?: (params: TParams) => Position;
  /**
   * 返回从 rect 中心指向 `toward` 的射线与 shape 边界的交点。
   * @description `rect` 可包含旋转；实现需要按需转换坐标。
   */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /**
   * 解析命名 anchor 的世界坐标；不支持时返回 `undefined`。
   */
  anchor: (rect: Rect, name: ShapeAnchorName, params: TParams) => Position | undefined;
  /**
   * 解析标准 side 上 `t ∈ [0, 1]` 的比例点。
   * @description `rect` 可包含旋转；未实现表示该 shape 不支持 side anchor。
   * @default 不支持
   */
  edgePoint?: (rect: Rect, side: SideValue, t: number, params: TParams) => Position;
  /**
   * 生成轴对齐 rect 内的视觉 primitive。
   */
  emit: (rect: Rect, style: ResolvedShapeStyle, round: (n: number) => number, params: TParams) => Iterable<ScenePrimitive>;
  /**
   * 返回 node scale 后的 params。
   * @description 适用于 params 含角度等非长度字段的 shape。
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
