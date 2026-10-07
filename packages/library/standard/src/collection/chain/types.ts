import type { MeasuredCell } from '../_cell';
import type { CanonicalChainItem, CanonicalChainConnection, CanonicalChainLayout } from './resolve';

/** 保持输入层次的测量结果，不包含布局坐标 */
export type MeasuredChainItem =
  | {
      /** 单格测量叶节点 */
      kind: 'cell';
      /** 供布局与最终回放共享的测量结果 */
      measured: MeasuredCell;
    }
  | (Omit<Extract<CanonicalChainItem, { kind: 'parallel' }>, 'branches'> & {
      /** 保留原有分支与步骤顺序的测量子树 */
      branches: Array<Array<MeasuredChainItem>>;
    });

/** 已确定端点与自动通道比例的连接，几何路径由 Core 生成 */
export type ChainConnectionPlacement = {
  /** 前一块的出口格子 */
  from: ChainCellPlacement;
  /** 后一块的入口格子 */
  to: ChainCellPlacement;
  /** 已解析的连接参数 */
  options: CanonicalChainConnection;
  /** 自动通道在两格中心间的主轴比例；省略时自动路由为直线 */
  autoFraction?: number;
};

/** 主轴坐标中的单元位置 */
export type ChainCellPlacement = {
  /** 用于最终内容回放的单格测量结果 */
  measured: MeasuredCell;
  /** 格子左上角沿链主轴的坐标 */
  x: number;
  /** 格子左上角沿链交叉轴的坐标 */
  y: number;
  /** 格子沿链主轴占用的尺寸 */
  width: number;
  /** 格子沿链交叉轴占用的尺寸 */
  height: number;
};

/** 保留主轴基线的完整布局块 */
export type ChainBlock = {
  /** 布局块沿主轴占用的总尺寸 */
  width: number;
  /** 布局块沿交叉轴占用的总尺寸 */
  height: number;
  /** 块顶边到主轴对齐基线的交叉轴偏移 */
  baseline: number;
  /** 块内已放置的格子，端点列表引用其中的同一对象 */
  cells: Array<ChainCellPlacement>;
  /** 块内连接关系，端点与 cells 共享对象 */
  connections: Array<ChainConnectionPlacement>;
  /** 供前一串行块连接的入口格子 */
  entries: Array<ChainCellPlacement>;
  /** 供后一串行块连接的出口格子 */
  exits: Array<ChainCellPlacement>;
  /** 并行块自身的布局与连接配置；普通格子或序列块不设置 */
  parallel?: {
    /** 当前并行块已解析的分支排布参数 */
    layout: CanonicalChainLayout;
    /** 当前并行块已解析的连接线参数 */
    connection: CanonicalChainConnection;
  };
};
