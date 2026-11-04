import type { JsonObject, OpenString } from '@retikz/foundation';
import type { CenteredBox, Position } from '@retikz/math';
import type { ZodType } from 'zod';

import type { CanonicalDropShadow, IRGraphicStyle, IRPathBase } from '../../schemas';
import type { Anchor, Side } from '../../shared';
import type { PaintValue, ScenePrimitive } from '../scene';

/** 从 IR graphic style 复用的已解析 shape 样式字段 */
type CompiledShapeStyleFields = Pick<IRGraphicStyle, 'strokeWidth' | 'blendMode'> & {
  opacity?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
};

/** Shape provider 接收到的命名 anchor：标准方位名或 shape 自定义扩展名 */
export type ShapeAnchorName = OpenString<Anchor>;

/** Shape 可为之提供安全包络的规则连接面种类 */
export type ConnectionEnvelopeKind = 'circle' | 'ellipse' | 'rectangle';

/** 与视觉 rect 同心、同旋转的规则连接面半轴 */
export type ConnectionEnvelope = {
  /** 局部 x 轴半径 */
  halfWidth: number;
  /** 局部 y 轴半径 */
  halfHeight: number;
};

/**
 * emit 需要的已解析视觉样式子集
 * @description 从 CompiledNodeLayout 的样式字段收敛（不含几何 / 文本），作为 shape provider 的 runtime 输入。
 *   与 IR style schema 同语义的标量字段通过 `IRGraphicStyle` 复用类型；paint / shadow 等 compile 后字段显式组合
 */
export type CompiledShapeStyle = {
  /** 描边线帽 */
  lineCap?: IRGraphicStyle['lineCap'];
  /** 描边拐角连接 */
  lineJoin?: IRGraphicStyle['lineJoin'];
  /**
   * 已解析填充 paint；缺省由 shape emit 按透明填充处理
   * @default 'transparent'
   */
  fill?: PaintValue;
  /**
   * 填充不透明度
   * @default 1
   */
  fillOpacity?: CompiledShapeStyleFields['fillOpacity'];
  /**
   * 已解析描边 paint；缺省由 shape emit 按当前文字色处理
   * @default 'currentColor'
   */
  stroke?: PaintValue;
  /**
   * 描边不透明度
   * @default 1
   */
  strokeOpacity?: CompiledShapeStyleFields['strokeOpacity'];
  /**
   * 描边宽度
   * @default 1
   */
  strokeWidth?: CompiledShapeStyleFields['strokeWidth'];
  /**
   * 描边虚线模式；缺省为实线
   * @default []
   */
  dashPattern?: Array<number>;
  /**
   * 描边虚线起始偏移；缺省为 0
   * @default 0
   */
  dashOffset?: NonNullable<IRPathBase['style']>['dashOffset'];
  /**
   * 圆角半径
   * @default 0
   */
  cornerRadius?: number;
  /**
   * 整体不透明度
   * @default 1
   */
  opacity?: CompiledShapeStyleFields['opacity'];
  /**
   * 投影：解析后对象（compile 已把预设展开 + 显式字段覆盖合并；缺省无投影）
   * @default undefined
   */
  shadow?: CanonicalDropShadow;
  /**
   * 混合模式：解析后值（compile 透传；缺省 / normal 等价普通 source-over）
   * @default 'normal'
   */
  blendMode?: CompiledShapeStyleFields['blendMode'];
};

/** 形状包围内容所需的未旋转外接盒几何 */
export type ShapeCircumscribedGeometry = {
  /** 外接盒的局部 x 轴半宽，须为有限非负数 */
  halfWidth: number;
  /** 外接盒的局部 y 轴半高，须为有限非负数 */
  halfHeight: number;
  /**
   * 外接盒中心相对 node position 的未旋转局部偏移
   * @default [0, 0]
   */
  offset?: Position;
};

/**
 * 可注册的 shape 定义
 * @description 描述第三方作者和内置 shape 共同实现的运行时能力契约；定义本身不进入 IR。
 *   每个能力函数都以实例级 `params` 作为末位参数
 * @template TParams 由 paramsSchema 解析得到的 JSON 对象类型，各形状回调接收同一参数类型
 */
export type InputShapeDefinition<TParams extends JsonObject> = {
  /** shape 名称，由 IR `node.shape` 引用 */
  name: string;
  /**
   * 实例参数 schema
   * @description 解析结果必须是 JSON object；无参 shape 使用 `z.strictObject({})`
   */
  paramsSchema: ZodType<TParams>;
  /**
   * 根据包含 padding 的内容半轴和 params，计算完整形状的未旋转外接盒半轴及中心偏移
   */
  computeCircumscribedGeometry: (
    innerHalfWidth: number,
    innerHalfHeight: number,
    params: TParams,
  ) => ShapeCircumscribedGeometry;
  /**
   * 返回从 rect 中心指向 `toward` 的射线与 shape 边界的交点
   * @description `rect` 可包含旋转；实现需要按需转换坐标
   */
  computeBoundaryPoint: (rect: CenteredBox, toward: Position, params: TParams) => Position;
  /**
   * 解析命名 anchor 的世界坐标；不支持时返回 `undefined`
   */
  resolveAnchor: (rect: CenteredBox, name: ShapeAnchorName, params: TParams) => Position | undefined;
  /**
   * 返回安全包含视觉几何轮廓的规则连接面半轴
   * @description 结果与 `rect` 同心、同旋转；不含 stroke、shadow、filter 或 label 的视觉外扩。未提供时 tight boundary 回退到 bounds 并发出 warning
   * @default undefined
   */
  computeConnectionEnvelope?: (
    rect: CenteredBox,
    kind: ConnectionEnvelopeKind,
    params: TParams,
  ) => ConnectionEnvelope | undefined;
  /**
   * 解析标准 side 上 `t ∈ [0, 1]` 的比例点
   * @description `rect` 可包含旋转；未实现表示该 shape 不支持 side anchor
   * @default undefined
   */
  computeEdgePoint?: (rect: CenteredBox, side: Side, t: number, params: TParams) => Position;
  /**
   * 生成轴对齐 rect 内的视觉 primitive
   */
  emit: (
    rect: CenteredBox,
    style: CompiledShapeStyle,
    round: (n: number) => number,
    params: TParams,
  ) => Iterable<ScenePrimitive>;
  /**
   * 返回 node scale 后的 params
   * @description 适用于 params 含角度等非长度字段的 shape；省略时按 Math.sqrt(sx * sy) 深度缩放 params 中的数值叶子
   * @default scaleJsonObjectNumbers
   */
  scaleParams?: (params: TParams, sx: number, sy: number) => TParams;
};

/**
 * shape 定义的擦除形态：registry 存这个
 * @description 所有函数收 `JsonObject`（实际类型由 `paramsSchema.parse` 在编译期保证）；registry 同构
 *   不泛型化（避免逆变 / 落 any）。定义点用 `defineShape<TParams>` 拿类型安全
 */
export type ShapeDefinition = InputShapeDefinition<JsonObject>;

/**
 * 创建可注入编译配置的形状定义，保留定义时的参数类型检查
 * @description 将返回值加入 CompileOptions.shapes 后，节点可通过 shape 引用其 name。此函数不注册形状，也不解析实例参数
 * @template TParams 由 paramsSchema 解析得到的 JSON 对象类型，各形状回调接收同一参数类型
 * @param def 形状名称、参数 schema 与几何及绘制回调
 * @returns 原定义对象，类型转换为可存入形状注册表的 ShapeDefinition；不复制或修改输入
 */
export const defineShape = <TParams extends JsonObject>(def: InputShapeDefinition<TParams>): ShapeDefinition =>
  def as unknown as ShapeDefinition;
