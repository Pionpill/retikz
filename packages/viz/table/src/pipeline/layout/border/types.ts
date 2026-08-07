import type { TableThemeTokenSourceKindValue } from '../../../contract';
import type {
  ResolvedTableBorderLine,
  TableBorderContribution,
  TableBorderSource,
  TableBorderStyleTokenKey,
} from '../../../contract/manifest';
import type { TableTrackLayout } from '../types';

/** resolved Border Graph 输入候选 */
export type ResolvedTableBorderCandidate =
  | Readonly<{ kind: 'none'; priority: number }>
  | Readonly<{
      kind: 'line';
      priority: number;
      line: ResolvedTableBorderLine;
      styleToken?: Readonly<{ key: TableBorderStyleTokenKey; source: TableThemeTokenSourceKindValue; path: string }>;
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
  /** semantic Cell id */
  cellId: string;
  /** canonical origin row index */
  rowIndex: number;
  /** canonical origin column index */
  columnIndex: number;
  /** 连续覆盖的 row 数量 */
  rowSpan: number;
  /** 连续覆盖的 column 数量 */
  columnSpan: number;
  /** 可选 resolved Cell side 候选 */
  borders?: Readonly<Partial<Record<TableBorderSide, ResolvedTableBorderCandidate>>>;
}>;

/** Border Graph resolved Table defaults */
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
  /** canonical row tracks */
  rows: ReadonlyArray<TableTrackLayout>;
  /** canonical column tracks */
  columns: ReadonlyArray<TableTrackLayout>;
  /** canonical non-overlapping Cells */
  cells: ReadonlyArray<TableBorderCellInput>;
  /** collapse 或 separate 拓扑 */
  mode: 'collapse' | 'separate';
  /** resolved Table 默认候选 */
  defaults: TableBorderDefaultsInput;
}>;

/** resolve 前的单个 Border Graph atom */
export type TableBorderAtom = Readonly<{
  /** canonical atomic key */
  key: string;
  /** atom orientation */
  orientation: 'horizontal' | 'vertical';
  /** Table-local start */
  start: TableBorderVertex;
  /** Table-local end */
  end: TableBorderVertex;
  /** 至少一个 canonical contribution */
  contributors: ReadonlyArray<TableBorderContribution>;
}>;

/** conflict resolution 后的 Border Graph atom */
export type ResolvedTableBorderAtom = Readonly<
  TableBorderAtom & {
    /** conflict winner */
    winner: TableBorderContribution;
    /** 是否需要 emit Path */
    visible: boolean;
  }
>;

/** lowering 消费的可见 merged border edge */
export type TableBorderEdge = Readonly<{
  /** canonical merged edge key */
  key: string;
  /** edge orientation */
  orientation: 'horizontal' | 'vertical';
  /** Table-local start */
  start: TableBorderVertex;
  /** Table-local end */
  end: TableBorderVertex;
  /** 完整 resolved line style */
  style: ResolvedTableBorderLine;
  /** 按 canonical key 保留的逐 atom provenance */
  atoms: ReadonlyArray<
    Readonly<{
      /** canonical atomic key */
      key: string;
      /** atom winner */
      winner: TableBorderContribution;
      /** canonical ordered contributors */
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
