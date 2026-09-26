import type { JsonObject } from '@retikz/foundation';
import type { Position } from '@retikz/math';
import type { ZodType } from 'zod';

import type { AnchorValue, Rect } from '../../shared';
import type { PathCommand } from '../scene';
import type { ConnectionEnvelopeKind } from '../shape';

/**
 * 连接面命名 anchor 的名字
 * @description 类型接受字符串；Node 引用解析仅将非中心的标准方位名交给 boundary，中心与形状专属名称由视觉 shape 解析
 */
export type BoundaryAnchorName = AnchorValue | (string & {});

/** Boundary provider 解析实例连接矩形时可用的视觉几何上下文 */
export type BoundaryFitContext = {
  /** 节点视觉 shape 的外接矩形 */
  visualRect: Rect;
  /** 获取视觉 shape 对指定规则连接面的安全包络 */
  connectionEnvelope: (kind: ConnectionEnvelopeKind) => Rect;
};

/** boundary definition 的作者侧输入形态 */
export type BoundaryDefinitionInput<TParams extends JsonObject> = {
  /** 注册表 key，由 IR `boundary` 引用 */
  name: string;
  /** 运行时连接面参数的 schema */
  paramsSchema: ZodType<TParams>;
  /**
   * 根据视觉 shape 和实例 params 解析本连接面使用的矩形
   * @description 未提供时使用视觉矩形
   * @default context.visualRect
   */
  resolveRect?: (context: BoundaryFitContext, params: TParams) => Rect;
  /** 返回与解析后 rect 同坐标系的精确闭合连接面轮廓；空数组表示合法空几何 */
  outline?: (rect: Rect, params: TParams) => ReadonlyArray<PathCommand>;
  /** 从中心指向 toward 的射线与连接面的交点 */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /**
   * 可选的标准方位 anchor 支持；Node 引用中的中心与形状专属名称不调用此回调
   * @description 未提供时由调用方回退或报告不支持该 anchor
   * @default undefined
   */
  anchor?: (rect: Rect, name: BoundaryAnchorName, params: TParams) => Position | undefined;
};

/** Boundary 定义的擦除形态：registry 存这个 */
export type BoundaryDefinition = BoundaryDefinitionInput<JsonObject>;
