import type { JsonObject, PropertyPath } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';

import type { BoundaryDefinition, ConnectionEnvelopeKind, ShapeDefinition } from '../../contract';
import type { CanonicalNodeBoundary, CanonicalNodeShape } from '../../resolve';
import type { IRAnchorRef, IRBoundary } from '../../schemas';
import type { CompileWarningCode } from '../shared';

/** 边界查询直接消费的编译产物字段，不要求生成独立投影对象 */
export type CompiledBoundaryGeometry = {
  /** 视觉形状的能力绑定 */
  shape: CanonicalNodeShape;
  /** 默认连接面的能力绑定 */
  boundary: CanonicalNodeBoundary;
  /** 连接查询必需的最终几何 */
  geometry: {
    /** 最终视觉矩形 */
    rect: CenteredBox;
    /** 连接外扩距离 */
    margin: BoundsInsets;
  };
};

/** 连接面消费过程中的缓存和诊断状态 */
export type BoundaryState = {
  /** 按连接面缓存已计算的包络 */
  connectionEnvelopeCache?: Map<string, CenteredBox>;
  /** 已发布回退诊断的连接面种类 */
  connectionEnvelopeWarnings?: Set<ConnectionEnvelopeKind>;
  /** 当前边界所属元素的诊断出口 */
  warn?: (code: CompileWarningCode, message: string) => void;
  /** 当前边界所属元素的来源路径 */
  irPath?: PropertyPath;
};

/** 已按视觉 rect 解析出的连接面几何 */
export type BoundaryResolution = {
  /** 连接面 definition */
  def: ShapeDefinition | BoundaryDefinition;
  /** provider 使用的连接面 rect */
  rect: CenteredBox;
  /** 已校验参数 */
  params: JsonObject;
};

/** 连接面绑定所需的视觉形状及布局几何 */
export type BoundaryVisualResolution = {
  /** 视觉 shape definition */
  def: ShapeDefinition;
  /** 视觉 shape rect */
  rect: CenteredBox;
  /** 视觉 shape 参数 */
  params: JsonObject;
};

/** 编译调用持有的连接面状态查询能力，不进入布局结果 */
export type BoundaryStore = {
  /** 按共享的形状绑定获取或创建状态，布局前与布局投影后使用同一身份 */
  getOrCreateState: (shape: CanonicalNodeShape) => BoundaryState;
  /** 当前编译内缓存最终几何的锚点；诊断覆盖只作用于本次求值，不修改共享状态 */
  getOrCreateAnchor: (
    geometry: CompiledBoundaryGeometry,
    anchor: IRAnchorRef,
    boundary?: IRBoundary,
    canonicalBoundary?: CanonicalNodeBoundary,
    context?: Pick<BoundaryState, 'warn' | 'irPath'>,
  ) => Position;
};
