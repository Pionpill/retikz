import type { CenteredBox, Position } from '@retikz/math';

import type { PathCommand, SceneClipPath } from '../scene';
import type { GeometryKeyPoint } from '../shape';

/** Node 最终 occurrence 的局部几何与正文布局产物 */
export type NodeOwnerOutput = {
  /** 最终节点外框 */
  rect: CenteredBox;
  /** 节点形状的轮廓与关键点 */
  shape: {
    /** 形状注册名 */
    name: string;
    /** 闭合轮廓，未提供时为 null */
    outline: Array<PathCommand> | null;
    /** 命名关键点，未提供时为 null */
    keyPoints: Array<GeometryKeyPoint> | null;
  };
  /** 节点连接边界的轮廓 */
  boundary: {
    /** 边界注册名 */
    name: string;
    /** 闭合轮廓，未提供时为 null */
    outline: Array<PathCommand> | null;
  };
  /** 正文角点与物理文本行基线，无正文时为 null */
  content: {
    /** 正文四角，按轮廓顺序排列 */
    corners: [Position, Position, Position, Position];
    /** 各物理文本行的基线端点 */
    baselines: Array<{ from: Position; to: Position }>;
  } | null;
};

/** Scope 最终 occurrence 的固有包络产物 */
export type ScopeOwnerOutput = {
  /** 子节点决定的固有包络，无贡献时为 null */
  envelope: {
    /** 包络形状 */
    shape: 'rectangle' | 'circle';
    /** 包络外框 */
    rect: CenteredBox;
  } | null;
};

/** Coordinate 最终 occurrence 的已解析点产物 */
export type CoordinateOwnerOutput = {
  /** 坐标标识 */
  id: string;
  /** occurrence 局部坐标 */
  position: Position;
};

/** 一次 Clip 应用的最终 lowering 路径产物 */
export type ClipOwnerOutput = {
  /** 最终裁剪路径 */
  path: SceneClipPath;
};
