import type { TableBorderContribution, TableBorderSource } from '../../../contract/manifest';
import type { TableTrackLayout } from '../types';
import type {
  BuildTableBorderGraphInput,
  ResolvedTableBorderCandidate,
  TableBorderAtom,
  TableBorderCellInput,
  TableBorderGraph,
  TableBorderSide,
  TableBorderVertex,
} from './types';

import { ResolvedTableBorderLineSchema, TableBorderContributionOrigin } from '../../../contract/manifest';
import { RetikzTableError } from '../../../error';
import { deepFreeze } from '../../../shared';
import { mergeTableBorderAtoms } from './merge';
import { resolveTableBorderAtoms } from './resolve';
import { tableBorderSourceOrderKey } from './types';

type Occupancy = ReadonlyArray<ReadonlyArray<TableBorderCellInput | undefined>>;

const SideOrder: ReadonlyArray<TableBorderSide> = ['top', 'right', 'bottom', 'left'];

/** 验证 canonical track 几何并拒绝重叠或非有限 endpoint */
const validateTracks = (tracks: ReadonlyArray<TableTrackLayout>, axis: 'row' | 'column'): void => {
  tracks.forEach((track, index) => {
    if (track.index !== index) {
      throw new RetikzTableError(`table: ${axis} track ${index} has non-canonical index ${track.index}`);
    }
    if (
      !Number.isFinite(track.offset) ||
      !Number.isFinite(track.size) ||
      track.size < 0 ||
      !Number.isFinite(track.offset + track.size)
    ) {
      throw new RetikzTableError(`table: ${axis} track ${index} geometry must be finite and nonnegative`);
    }
    if (index > 0 && track.offset < tracks[index - 1].offset + tracks[index - 1].size) {
      throw new RetikzTableError(`table: ${axis} track ${index} overlaps the previous canonical track`);
    }
  });
};

/** 判断运行时输入是否为 Border Graph 支持的 mode */
const isTableBorderMode = (value: unknown): value is 'collapse' | 'separate' =>
  value === 'collapse' || value === 'separate';

/** 从未知 candidate 读取 runtime discriminator */
const candidateKindOf = (candidate: unknown): unknown =>
  typeof candidate === 'object' && candidate !== null ? Reflect.get(candidate, 'kind') : undefined;

/** 物化 candidate 的有限 priority 与完整 resolved line */
const validateCandidate = (candidate: ResolvedTableBorderCandidate): ResolvedTableBorderCandidate => {
  const kind = candidateKindOf(candidate);
  if (kind !== 'none' && kind !== 'line') {
    throw new RetikzTableError('table: Border candidate kind must be none or line');
  }
  if (!Number.isFinite(candidate.priority) || !Number.isInteger(candidate.priority)) {
    throw new RetikzTableError('table: Border candidate priority must be a finite integer');
  }
  if (candidate.kind === 'none') return { kind: 'none', priority: candidate.priority };
  if (candidate.styleToken !== undefined && candidate.priority !== -100) {
    throw new RetikzTableError('table: style token Border candidate priority must be -100');
  }
  return {
    kind: 'line',
    priority: candidate.priority,
    line: ResolvedTableBorderLineSchema.parse(candidate.line),
    ...(candidate.styleToken === undefined ? {} : { styleToken: structuredClone(candidate.styleToken) }),
  };
};

/** 构造 atom-local、transaction-unique contribution */
const contributionOf = (
  atomKey: string,
  source: TableBorderSource,
  candidateInput: ResolvedTableBorderCandidate,
  ownerSideRank: number,
): TableBorderContribution => {
  const candidate = validateCandidate(candidateInput);
  const sourceOrderKey = tableBorderSourceOrderKey(source);
  const base = {
    key: `${sourceOrderKey}@${atomKey}`,
    source,
    priority: candidate.priority,
    specificity: source.kind === 'cell' ? (1 as const) : (0 as const),
    ownerSideRank,
    sourceOrderKey,
  };
  if (candidate.kind === 'none') {
    return { kind: 'none', origin: TableBorderContributionOrigin.Explicit, ...base };
  }
  if (candidate.styleToken === undefined) {
    return { kind: 'line', origin: TableBorderContributionOrigin.Explicit, ...base, line: candidate.line };
  }
  return {
    kind: 'line',
    origin: TableBorderContributionOrigin.StyleToken,
    ...base,
    priority: -100,
    line: candidate.line,
    styleToken: candidate.styleToken,
  };
};

/** 建立 canonical occupancy 并验证 Cell span 不越界或重叠 */
const buildOccupancy = (
  rowCount: number,
  columnCount: number,
  cellsInput: ReadonlyArray<TableBorderCellInput>,
): Readonly<{ cells: ReadonlyArray<TableBorderCellInput>; occupancy: Occupancy }> => {
  const occupancy: Array<Array<TableBorderCellInput | undefined>> = Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }),
  );
  const cells = [...cellsInput].sort((left, right) => {
    if (left.rowIndex !== right.rowIndex) return left.rowIndex - right.rowIndex;
    if (left.columnIndex !== right.columnIndex) return left.columnIndex - right.columnIndex;
    return (left.cellId ?? '').localeCompare(right.cellId ?? '');
  });
  cells.forEach(cell => {
    const label = cell.cellId ?? `${cell.rowIndex}:${cell.columnIndex}`;
    if (
      !Number.isInteger(cell.rowIndex) ||
      !Number.isInteger(cell.columnIndex) ||
      cell.rowIndex < 0 ||
      cell.columnIndex < 0
    ) {
      throw new RetikzTableError(`table: Border Graph Cell "${label}" origin must use nonnegative integer indexes`);
    }
    if (
      !Number.isInteger(cell.rowSpan) ||
      !Number.isInteger(cell.columnSpan) ||
      cell.rowSpan <= 0 ||
      cell.columnSpan <= 0
    ) {
      throw new RetikzTableError(`table: Border Graph Cell "${label}" spans must be positive integers`);
    }
    if (cell.rowIndex + cell.rowSpan > rowCount || cell.columnIndex + cell.columnSpan > columnCount) {
      throw new RetikzTableError(`table: Border Graph Cell "${label}" span range exceeds canonical tracks`);
    }
    for (let row = cell.rowIndex; row < cell.rowIndex + cell.rowSpan; row += 1) {
      for (let column = cell.columnIndex; column < cell.columnIndex + cell.columnSpan; column += 1) {
        const occupied = occupancy[row][column];
        if (occupied !== undefined) {
          throw new RetikzTableError(
            `table: Border Graph Cell "${label}" overlaps Cell "${occupied.cellId ?? `${occupied.rowIndex}:${occupied.columnIndex}`}" at ${row}:${column}`,
          );
        }
        occupancy[row][column] = cell;
      }
    }
  });
  return { cells, occupancy };
};

/** 计算 collapse logical boundary 坐标 */
const boundaryCoordinates = (tracks: ReadonlyArray<TableTrackLayout>): ReadonlyArray<number> => {
  if (tracks.length === 0) return [];
  const coordinates = [tracks[0].offset];
  for (let index = 1; index < tracks.length; index += 1) {
    const previousEnd = tracks[index - 1].offset + tracks[index - 1].size;
    coordinates.push((previousEnd + tracks[index].offset) / 2);
  }
  coordinates.push(tracks.at(-1)!.offset + tracks.at(-1)!.size);
  if (!coordinates.every(Number.isFinite)) {
    throw new RetikzTableError('table: Border Graph logical boundaries must be finite');
  }
  return coordinates;
};

const cellSource = (cell: TableBorderCellInput, side: TableBorderSide): TableBorderSource => ({
  kind: 'cell',
  ...(cell.cellId === undefined ? {} : { cellId: cell.cellId }),
  row: cell.rowIndex,
  column: cell.columnIndex,
  side,
});

/** 为 collapse atom 收集 default 与相邻真实 Cell side 候选 */
const collapseContributors = (
  input: BuildTableBorderGraphInput,
  atomKey: string,
  orientation: 'horizontal' | 'vertical',
  boundaryIndex: number,
  before: TableBorderCellInput | undefined,
  after: TableBorderCellInput | undefined,
): ReadonlyArray<TableBorderContribution> => {
  const contributors: Array<TableBorderContribution> = [];
  const outer =
    orientation === 'horizontal'
      ? boundaryIndex === 0 || boundaryIndex === input.rows.length
      : boundaryIndex === 0 || boundaryIndex === input.columns.length;
  if (outer) {
    const side: TableBorderSide =
      orientation === 'horizontal' ? (boundaryIndex === 0 ? 'top' : 'bottom') : boundaryIndex === 0 ? 'left' : 'right';
    const candidate = input.defaults.outer?.[side];
    if (candidate !== undefined) {
      contributors.push(contributionOf(atomKey, { kind: 'default', scope: 'outer', side }, candidate, 0));
    }
  } else {
    const candidate = orientation === 'horizontal' ? input.defaults.horizontal : input.defaults.vertical;
    if (candidate !== undefined) {
      contributors.push(contributionOf(atomKey, { kind: 'default', scope: orientation, boundaryIndex }, candidate, 0));
    }
  }

  const beforeSide: TableBorderSide = orientation === 'horizontal' ? 'bottom' : 'right';
  const afterSide: TableBorderSide = orientation === 'horizontal' ? 'top' : 'left';
  const beforeCandidate = before?.borders?.[beforeSide];
  const afterCandidate = after?.borders?.[afterSide];
  if (before !== undefined && beforeCandidate !== undefined) {
    contributors.push(contributionOf(atomKey, cellSource(before, beforeSide), beforeCandidate, 1));
  }
  if (after !== undefined && afterCandidate !== undefined) {
    contributors.push(contributionOf(atomKey, cellSource(after, afterSide), afterCandidate, 0));
  }
  return contributors;
};

/** 构造 collapse logical atoms */
const buildCollapseAtoms = (
  input: BuildTableBorderGraphInput,
  occupancy: Occupancy,
): ReadonlyArray<TableBorderAtom> => {
  const rowBoundaries = boundaryCoordinates(input.rows);
  const columnBoundaries = boundaryCoordinates(input.columns);
  const atoms: Array<TableBorderAtom> = [];
  for (let boundary = 0; boundary <= input.rows.length; boundary += 1) {
    for (let interval = 0; interval < input.columns.length; interval += 1) {
      const before = boundary > 0 ? occupancy[boundary - 1][interval] : undefined;
      const after = boundary < input.rows.length ? occupancy[boundary][interval] : undefined;
      if (before !== undefined && before === after) continue;
      const key = `c:h:${boundary}:${interval}`;
      const contributors = collapseContributors(input, key, 'horizontal', boundary, before, after);
      if (contributors.length === 0) continue;
      atoms.push({
        key,
        orientation: 'horizontal',
        start: { x: columnBoundaries[interval], y: rowBoundaries[boundary] },
        end: { x: columnBoundaries[interval + 1], y: rowBoundaries[boundary] },
        contributors,
      });
    }
  }
  for (let boundary = 0; boundary <= input.columns.length; boundary += 1) {
    for (let interval = 0; interval < input.rows.length; interval += 1) {
      const before = boundary > 0 ? occupancy[interval][boundary - 1] : undefined;
      const after = boundary < input.columns.length ? occupancy[interval][boundary] : undefined;
      if (before !== undefined && before === after) continue;
      const key = `c:v:${boundary}:${interval}`;
      const contributors = collapseContributors(input, key, 'vertical', boundary, before, after);
      if (contributors.length === 0) continue;
      atoms.push({
        key,
        orientation: 'vertical',
        start: { x: columnBoundaries[boundary], y: rowBoundaries[interval] },
        end: { x: columnBoundaries[boundary], y: rowBoundaries[interval + 1] },
        contributors,
      });
    }
  }
  return atoms;
};

/** 返回 separate side 缺省候选及其 canonical source */
const separateFallback = (
  input: BuildTableBorderGraphInput,
  cell: TableBorderCellInput,
  side: TableBorderSide,
): Readonly<{ candidate: ResolvedTableBorderCandidate; source: TableBorderSource }> | undefined => {
  const rowEnd = cell.rowIndex + cell.rowSpan;
  const columnEnd = cell.columnIndex + cell.columnSpan;
  const outer =
    (side === 'top' && cell.rowIndex === 0) ||
    (side === 'bottom' && rowEnd === input.rows.length) ||
    (side === 'left' && cell.columnIndex === 0) ||
    (side === 'right' && columnEnd === input.columns.length);
  if (outer) {
    const candidate = input.defaults.outer?.[side];
    return candidate === undefined ? undefined : { candidate, source: { kind: 'default', scope: 'outer', side } };
  }
  if (side === 'top' || side === 'bottom') {
    const boundaryIndex = side === 'top' ? cell.rowIndex : rowEnd;
    return input.defaults.horizontal === undefined
      ? undefined
      : {
          candidate: input.defaults.horizontal,
          source: { kind: 'default', scope: 'horizontal', boundaryIndex },
        };
  }
  const boundaryIndex = side === 'left' ? cell.columnIndex : columnEnd;
  return input.defaults.vertical === undefined
    ? undefined
    : { candidate: input.defaults.vertical, source: { kind: 'default', scope: 'vertical', boundaryIndex } };
};

/** 计算 spanning Cell 的物理 side segment */
const separateSegment = (
  input: BuildTableBorderGraphInput,
  cell: TableBorderCellInput,
  side: TableBorderSide,
): Readonly<{ orientation: 'horizontal' | 'vertical'; start: TableBorderVertex; end: TableBorderVertex }> => {
  const firstRow = input.rows[cell.rowIndex];
  const lastRow = input.rows[cell.rowIndex + cell.rowSpan - 1];
  const firstColumn = input.columns[cell.columnIndex];
  const lastColumn = input.columns[cell.columnIndex + cell.columnSpan - 1];
  const left = firstColumn.offset;
  const right = lastColumn.offset + lastColumn.size;
  const top = firstRow.offset;
  const bottom = lastRow.offset + lastRow.size;
  switch (side) {
    case 'top':
      return { orientation: 'horizontal', start: { x: left, y: top }, end: { x: right, y: top } };
    case 'right':
      return { orientation: 'vertical', start: { x: right, y: top }, end: { x: right, y: bottom } };
    case 'bottom':
      return { orientation: 'horizontal', start: { x: left, y: bottom }, end: { x: right, y: bottom } };
    case 'left':
      return { orientation: 'vertical', start: { x: left, y: top }, end: { x: left, y: bottom } };
  }
};

/** 构造 separate per-Cell side atoms */
const buildSeparateAtoms = (
  input: BuildTableBorderGraphInput,
  cells: ReadonlyArray<TableBorderCellInput>,
): ReadonlyArray<TableBorderAtom> =>
  cells.flatMap(cell =>
    SideOrder.flatMap(side => {
      const explicit = cell.borders?.[side];
      const fallback = explicit === undefined ? separateFallback(input, cell, side) : undefined;
      const candidate = explicit ?? fallback?.candidate;
      if (candidate === undefined) return [];
      const key = `s:${cell.rowIndex}:${cell.columnIndex}:${side}`;
      const source = explicit === undefined ? fallback!.source : cellSource(cell, side);
      const segment = separateSegment(input, cell, side);
      return [
        {
          key,
          ...segment,
          contributors: [contributionOf(key, source, candidate, side === 'bottom' || side === 'right' ? 1 : 0)],
        },
      ];
    }),
  );

/** 从 canonical tracks、occupancy 与 border candidates 构造确定 Border Graph */
export const buildTableBorderGraph = (input: BuildTableBorderGraphInput): TableBorderGraph => {
  validateTracks(input.rows, 'row');
  validateTracks(input.columns, 'column');
  if (!isTableBorderMode(input.mode)) {
    throw new RetikzTableError('table: Border Graph mode must be collapse or separate');
  }
  const { cells, occupancy } = buildOccupancy(input.rows.length, input.columns.length, input.cells);
  Object.values(input.defaults.outer ?? {}).forEach(candidate => validateCandidate(candidate));
  if (input.defaults.horizontal !== undefined) validateCandidate(input.defaults.horizontal);
  if (input.defaults.vertical !== undefined) validateCandidate(input.defaults.vertical);
  cells.forEach(cell => Object.values(cell.borders ?? {}).forEach(candidate => validateCandidate(candidate)));
  if (input.rows.length === 0 || input.columns.length === 0) return deepFreeze({ atoms: [], edges: [] });
  const rawAtoms = input.mode === 'collapse' ? buildCollapseAtoms(input, occupancy) : buildSeparateAtoms(input, cells);
  const atoms = resolveTableBorderAtoms(rawAtoms);
  const edges = mergeTableBorderAtoms(atoms, input.mode);
  return deepFreeze({ atoms, edges });
};
