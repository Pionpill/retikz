import type { PropertyPath } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox } from '@retikz/math';

import type { CanonicalNodeBoundary, CanonicalNodeShape } from '../../resolve';
import type {
  IRAbsoluteTarget,
  IRAtPosition,
  IRBetweenPosition,
  IRNodeTarget,
  IROffsetPosition,
  IRPosition,
  PolarPosition,
} from '../../schemas';
import type { CompiledCoordinate } from '../coordinate';

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

/** 引用查询直接消费的位置或边界编译结果 */
export type CompiledReferenceGeometry = CompiledBoundaryGeometry | CompiledCoordinate;

/** 引用消费者实际读取的几何能力 */
export type ReferenceReadKind =
  | 'position'
  | 'boundary'
  | {
      /** 实际读取的命名、角度或边比例锚点 */
      anchor: NonNullable<IRNodeTarget['anchor']>;
      /** 视觉形状或默认连接面；额外覆盖保持完整边界依赖 */
      boundary?: 'shape';
    };

/** 引用的布局状态：已完成布局，或暂用作用域占位几何 */
export type PositionReferenceState = 'resolved' | 'scope-placeholder';

/** 位置解析器可读取的引用状态与节点几何 */
export type PositionReferenceView = Readonly<{
  /** 引用当前是否已经完成布局 */
  state: PositionReferenceState;
  /** 引用目标的几何编译产物 */
  geometry: CompiledReferenceGeometry;
  /** 引用声明来源 */
  irPath?: PropertyPath;
}>;

/** 位置解析所需的引用查询与坐标转换能力 */
export type PositionEvaluateContext = Readonly<{
  /** 相对定位默认距离 */
  nodeDistance: number;
  /** 按当前命名空间的可见范围查询已注册引用 */
  lookupReference: (id: string, kind?: ReferenceReadKind) => PositionReferenceView | undefined;
  /** 将世界坐标投影到当前 Scope 局部坐标 */
  toLocal: (world: IRPosition) => IRPosition;
  /** 将当前 Scope 局部坐标投影到世界坐标 */
  toWorld: (local: IRPosition) => IRPosition;
  /** 解析两目标间插值位置的世界坐标；省略此回调时无法解析 between */
  evaluateBetweenWorld?: (between: IRBetweenPosition) => IRPosition | null;
}>;

/** 同一位置在当前作用域和世界坐标系中的坐标 */
export type PositionEvaluation = Readonly<{
  /** 当前 Scope 局部坐标 */
  localPoint: IRPosition;
  /** 世界坐标 */
  worldPoint: IRPosition;
}>;

/** 目标解析额外需要的节点连接面与锚点查询能力 */
export type PositionTargetEvaluateContext = PositionEvaluateContext &
  Readonly<{
    /** 解析目标额外指定的连接面；沿用布局或视觉形状时可省略结果 */
    canonicalBoundaryOf?: (target: IRNodeTarget, reference: PositionReferenceView) => CanonicalNodeBoundary | undefined;
    /** 返回节点目标的世界坐标中心或显式锚点，结果不含 target.offset */
    pointOfNodeTarget: (
      target: IRNodeTarget,
      reference: PositionReferenceView,
      canonicalBoundary: CanonicalNodeBoundary | undefined,
    ) => IRPosition;
  }>;

/** 目标的位置及直接引用的节点与连接面 */
export type PositionTargetEvaluation = Readonly<{
  /** 原始目标配置 */
  target: IRAbsoluteTarget;
  /** 当前作用域的局部坐标，无法定位时为 null */
  point: IRPosition | null;
  /** 世界坐标参考点，无法定位时为 null */
  referencePoint: IRPosition | null;
  /** 直接引用的节点、坐标或作用域；插值和普通坐标目标不携带此字段 */
  reference?: PositionReferenceView;
  /** 节点目标选用的连接面 */
  canonicalBoundary?: CanonicalNodeBoundary;
}>;

/** 目标的世界坐标与引用结果，尚未转换为局部坐标 */
export type PositionTargetWorldEvaluation = Omit<PositionTargetEvaluation, 'point'>;

/** 位置解析器接受的坐标、引用与定位配置 */
export type EvaluablePosition =
  | IRPosition
  | PolarPosition
  | IRAtPosition
  | IROffsetPosition
  | IRBetweenPosition
  | string;
