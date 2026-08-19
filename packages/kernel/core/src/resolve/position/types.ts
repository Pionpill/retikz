import type { IRAbsoluteTarget, IRBetweenPosition, IRNodeTarget, IRPosition } from '../../schemas';
import type { BoundaryReferenceResolution, NodeReferenceView } from '../node';

/** 位置引用的布局生命周期 */
export type PositionReferenceState = 'resolved' | 'scope-placeholder';

/** Position resolver 可读取的纯引用视图 */
export type PositionReferenceView = Readonly<{
  /** 引用当前是否已经完成布局 */
  state: PositionReferenceState;
  /** 已从 compile layout 投影出的不可变 Node 几何视图 */
  node: NodeReferenceView;
}>;

/** Position Source IR 确定化所需的窄上下文 */
export type PositionResolveContext = Readonly<{
  /** 相对定位默认距离 */
  nodeDistance: number;
  /** 按当前 namespace 可见性查询已注册引用 */
  lookupReference: (id: string) => PositionReferenceView | undefined;
  /** 将世界坐标投影到当前 Scope 局部坐标 */
  toLocal: (world: IRPosition) => IRPosition;
  /** 将当前 Scope 局部坐标投影到世界坐标 */
  toWorld: (local: IRPosition) => IRPosition;
  /** 解析 between 表达式的世界坐标，由 absolute-target resolver 注入 */
  resolveBetweenWorld?: (between: IRBetweenPosition) => IRPosition | null;
}>;

/** Position Source IR 的局部与世界坐标确定结果 */
export type PositionResolution = Readonly<{
  /** 当前 Scope 局部坐标 */
  localPoint: IRPosition;
  /** 世界坐标 */
  worldPoint: IRPosition;
}>;

/** Absolute target 确定化额外需要的 Node 几何能力 */
export type PositionTargetResolveContext = PositionResolveContext &
  Readonly<{
    /** 绑定 target 选择的连接面 */
    boundaryResolutionOf?: (
      target: IRNodeTarget,
      reference: PositionReferenceView,
    ) => BoundaryReferenceResolution | undefined;
    /** 在世界坐标中解析 NodeTarget 的中心或显式 anchor，不叠加 target.offset */
    pointOfNodeTarget: (
      target: IRNodeTarget,
      reference: PositionReferenceView,
      boundaryResolution: BoundaryReferenceResolution | undefined,
    ) => IRPosition;
  }>;

/** Absolute target 的位置、引用生命周期与边界绑定结果 */
export type PositionTargetResolution = Readonly<{
  /** 原始 absolute target */
  target: IRAbsoluteTarget;
  /** 当前 Scope 局部点 */
  point: IRPosition | null;
  /** 世界坐标参考点 */
  referencePoint: IRPosition | null;
  /** Node/Coordinate/Scope 引用视图 */
  reference?: PositionReferenceView;
  /** target 选择的连接面 */
  boundaryResolution?: BoundaryReferenceResolution;
}>;

/** Absolute target 尚未投影到当前 Scope 局部空间的世界绑定结果 */
export type PositionTargetWorldResolution = Omit<PositionTargetResolution, 'point'>;
