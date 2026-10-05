import type { ResolvedTableBorderLine, TableBorderContribution, TableBorderSource } from '../../../contract/manifest';
import type { TableTrackLayout } from '../types';

/** resolved Border Graph 输入候选 */
export type ResolvedTableBorderCandidate =
  | Readonly<{
      /** 显式关闭边框或使用线条的判别值 */
      kind: 'none';
      /** 边框冲突决策采用的优先级 */
      priority: number;
      /** 当前边框候选对应的默认值来源 */
      defaults?: Readonly<{
        /** 用于诊断与溯源的默认值路径 */
        path: string;
      }>;
    }>
  | Readonly<{
      /** 显式关闭边框或使用线条的判别值 */
      kind: 'line';
      /** 边框冲突决策采用的优先级 */
      priority: number;
      /** 已解析的边框线条样式 */
      line: ResolvedTableBorderLine;
      /** 当前边框候选对应的默认值来源 */
      defaults?: Readonly<{
        /** 用于诊断与溯源的默认值路径 */
        path: string;
      }>;
    }>;

/** Border Graph 支持的物理 Cell side */
export type TableBorderSide = 'top' | 'right' | 'bottom' | 'left';

/** Border Graph 私有的 Table-local 顶点 */
export type TableBorderVertex = Readonly<{
  /** Table-local x 坐标 */
  x: number;
  /** Table-local y 坐标 */
  y: number;
}>;

/** 单个 canonical Cell 的 Border Graph 输入 */
export type TableBorderCellInput = Readonly<{
  /** 可选的单元格语义标识 */
  cellId?: string;
  /** 单元格起始位置的规范行下标 */
  rowIndex: number;
  /** 单元格起始位置的规范列下标 */
  columnIndex: number;
  /** 连续覆盖的 row 数量 */
  rowSpan: number;
  /** 连续覆盖的 column 数量 */
  columnSpan: number;
  /** 可选 resolved Cell side 候选 */
  borders?: Readonly<Partial<Record<TableBorderSide, ResolvedTableBorderCandidate>>>;
}>;

/** 边框图使用的已解析表格默认样式 */
export type TableBorderDefaultsInput = Readonly<{
  /** Table 外轮廓默认候选 */
  outer?: Readonly<Partial<Record<TableBorderSide, ResolvedTableBorderCandidate>>>;
  /** row 间默认候选 */
  horizontal?: ResolvedTableBorderCandidate;
  /** column 间默认候选 */
  vertical?: ResolvedTableBorderCandidate;
}>;

/** Border Graph 构造输入 */
export type BuildTableBorderGraphInput = Readonly<{
  /** 规范化后的行轨道 */
  rows: ReadonlyArray<TableTrackLayout>;
  /** 规范化后的列轨道 */
  columns: ReadonlyArray<TableTrackLayout>;
  /** 规范化后互不重叠的单元格 */
  cells: ReadonlyArray<TableBorderCellInput>;
  /** collapse 或 separate 拓扑 */
  mode: 'collapse' | 'separate';
  /** resolved Table 默认候选 */
  defaults: TableBorderDefaultsInput;
}>;

/** resolve 前的单个 Border Graph atom */
export type TableBorderAtom = Readonly<{
  /** 原子边段的规范键 */
  key: string;
  /** 原子边段的方向 */
  orientation: 'horizontal' | 'vertical';
  /** 表格局部坐标中的起点 */
  start: TableBorderVertex;
  /** 表格局部坐标中的终点 */
  end: TableBorderVertex;
  /** 至少一个 canonical contribution */
  contributors: ReadonlyArray<TableBorderContribution>;
}>;

/** conflict resolution 后的 Border Graph atom */
export type ResolvedTableBorderAtom = Readonly<
  TableBorderAtom & {
    /** 边框冲突决策选中的样式 */
    winner: TableBorderContribution;
    /** 是否需要 emit Path */
    visible: boolean;
  }
>;

/** lowering 消费的可见 merged border edge */
export type TableBorderEdge = Readonly<{
  /** 合并后边段的规范键 */
  key: string;
  /** 边段的方向 */
  orientation: 'horizontal' | 'vertical';
  /** 表格局部坐标中的起点 */
  start: TableBorderVertex;
  /** 表格局部坐标中的终点 */
  end: TableBorderVertex;
  /** 完整 resolved line style */
  style: ResolvedTableBorderLine;
  /** 按 canonical key 保留的逐 atom provenance */
  atoms: ReadonlyArray<
    Readonly<{
      /** 原子边段的规范键 */
      key: string;
      /** 原子边段选中的样式 */
      winner: TableBorderContribution;
      /** 按规范顺序排列的贡献来源 */
      contributors: ReadonlyArray<TableBorderContribution>;
    }>
  >;
}>;

/** 完整 Border Graph 纯数据结果 */
export type TableBorderGraph = Readonly<{
  /** 所有有候选的 resolved atoms，包括隐藏 winner */
  atoms: ReadonlyArray<ResolvedTableBorderAtom>;
  /** 确定 draw order 的可见 edges */
  edges: ReadonlyArray<TableBorderEdge>;
}>;

/** 根据 source 构造 canonical sourceOrderKey */
export const tableBorderSourceOrderKey = (source: TableBorderSource): string => {
  if (source.kind === 'cell') return `cell:${source.row}:${source.column}:${source.side}`;
  if (source.scope === 'outer') return `default:outer:${source.side}`;
  return `default:${source.scope}:${source.boundaryIndex}`;
};
