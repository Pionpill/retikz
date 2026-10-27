import type {
  IRAbsoluteTarget,
  IRBetweenPosition,
  IRNodeTarget,
  IRPosition,
  PolarPosition,
  IRAtPosition,
  IROffsetPosition,
} from '../../schemas';
import type { BoundaryReferenceResolution, NodeReferenceView } from '../node';

/** 引用的布局状态：已完成布局，或暂用作用域占位几何 */
export type PositionReferenceState = 'resolved' | 'scope-placeholder';

/** 位置解析器可读取的引用状态与节点几何 */
export type PositionReferenceView = Readonly<{
  /** 引用当前是否已经完成布局 */
  state: PositionReferenceState;
  /** 由编译阶段提供的只读节点几何 */
  node: NodeReferenceView;
}>;

/** 位置解析所需的引用查询与坐标转换能力 */
export type PositionResolveContext = Readonly<{
  /** 相对定位默认距离 */
  nodeDistance: number;
  /** 按当前命名空间的可见范围查询已注册引用 */
  lookupReference: (id: string) => PositionReferenceView | undefined;
  /** 将世界坐标投影到当前 Scope 局部坐标 */
  toLocal: (world: IRPosition) => IRPosition;
  /** 将当前 Scope 局部坐标投影到世界坐标 */
  toWorld: (local: IRPosition) => IRPosition;
  /** 解析两目标间插值位置的世界坐标；省略此回调时无法解析 between */
  resolveBetweenWorld?: (between: IRBetweenPosition) => IRPosition | null;
}>;

/** 同一位置在当前作用域和世界坐标系中的坐标 */
export type PositionResolution = Readonly<{
  /** 当前 Scope 局部坐标 */
  localPoint: IRPosition;
  /** 世界坐标 */
  worldPoint: IRPosition;
}>;

/** 目标解析额外需要的节点连接面与锚点查询能力 */
export type PositionTargetResolveContext = PositionResolveContext &
  Readonly<{
    /** 解析节点目标选用的连接面 */
    boundaryResolutionOf?: (
      target: IRNodeTarget,
      reference: PositionReferenceView,
    ) => BoundaryReferenceResolution | undefined;
    /** 返回节点目标的世界坐标中心或显式锚点，结果不含 target.offset */
    pointOfNodeTarget: (
      target: IRNodeTarget,
      reference: PositionReferenceView,
      boundaryResolution: BoundaryReferenceResolution | undefined,
    ) => IRPosition;
  }>;

/** 目标的位置及直接引用的节点与连接面 */
export type PositionTargetResolution = Readonly<{
  /** 原始目标配置 */
  target: IRAbsoluteTarget;
  /** 当前作用域的局部坐标，无法定位时为 null */
  point: IRPosition | null;
  /** 世界坐标参考点，无法定位时为 null */
  referencePoint: IRPosition | null;
  /** 直接引用的节点、坐标或作用域；插值和普通坐标目标不携带此字段 */
  reference?: PositionReferenceView;
  /** 节点目标选用的连接面 */
  boundaryResolution?: BoundaryReferenceResolution;
}>;

/** 目标的世界坐标与引用结果，尚未转换为局部坐标 */
export type PositionTargetWorldResolution = Omit<PositionTargetResolution, 'point'>;

/** 位置解析器接受的坐标、引用与定位配置 */
export type ResolvablePosition =
  | IRPosition
  | PolarPosition
  | IRAtPosition
  | IROffsetPosition
  | IRBetweenPosition
  | string;
