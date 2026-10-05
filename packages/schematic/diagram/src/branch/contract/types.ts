import type { GraphDefinitionOptions } from '@retikz/graph';
import type { BoundsRect, Position } from '@retikz/math';

import type { DiagramDefinitionOptions } from '../../_diagram';
import type { IRBranch } from '../schemas';

/** Branch 布局所需的真实节点测量 */
export type BranchLayoutNodeInput = Readonly<{
  /** 作者节点 id */
  id: string;
  /** 原点处标记占位 */
  markerBounds: Readonly<BoundsRect>;
  /** 原点处含标注的可见包络 */
  visualBounds: Readonly<BoundsRect>;
}>;

/** 同步布局的输入；节点保持稳定拓扑序，分支保持声明序 */
export type BranchLayoutInput = Readonly<{
  /** 已解析的布局意图 */
  layout: Readonly<{ direction: 'right' | 'left' | 'down' | 'up'; nodeGap: number; laneGap: number }>;
  /** 共享节点只出现一次 */
  nodes: ReadonlyArray<BranchLayoutNodeInput>;
  /** 唯一有序连接事实源 */
  branches: ReadonlyArray<Pick<IRBranch, 'id' | 'nodes'>>;
  /** 显式主分支 */
  mainBranch?: string;
}>;

/** 一个节点的 drawing-local 布局位置 */
export type BranchLayoutNodeOutput = Readonly<{
  /** 作者节点 id */
  id: string;
  /** Core Node position */
  position: Readonly<Position>;
  /** 非负轨道编号；不是作者分支身份 */
  lane: number;
}>;

/** 唯一有向相邻段的参考路由 */
export type BranchLayoutSegmentOutput = Readonly<{
  /** 起点节点 id */
  source: string;
  /** 终点节点 id */
  target: string;
  /** 包含端点中心的参考折线 */
  points: ReadonlyArray<Readonly<Position>>;
  /** Core 圆角请求半径 */
  cornerRadius: number;
}>;

/** 原子布局结果，最终路径裁剪由 Core 执行 */
export type BranchLayoutOutput = Readonly<{
  /** 每个节点恰好一份几何 */
  nodes: ReadonlyArray<BranchLayoutNodeOutput>;
  /** 每个有向相邻段恰好一份路由 */
  segments: ReadonlyArray<BranchLayoutSegmentOutput>;
}>;

/** 内置和自定义 Branch 布局的统一同步协议 */
export type BranchLayoutDefinition = Readonly<{
  /** 全局唯一布局名称 */
  name: string;
  /** 布局语义说明 */
  description: string;
  /** 完整支持有序分支、主线与测量占位的同步确定性布局 */
  layout: (input: BranchLayoutInput) => BranchLayoutOutput;
}>;

/** Branch 与基础 Diagram / Graph 的运行时定义选项 */
export type BranchDiagramDefinitionOptions = DiagramDefinitionOptions &
  GraphDefinitionOptions &
  Readonly<{
    /** 追加的命名布局，不能覆盖其他定义 */
    branchLayouts?: ReadonlyArray<BranchLayoutDefinition>;
    /** 缺省使用 lanes */
    defaultBranchLayout?: string;
  }>;

/** 定义与内置项共享调用和验证链的 Branch 布局 */
export const defineBranchLayout = (definition: BranchLayoutDefinition): BranchLayoutDefinition => definition;
