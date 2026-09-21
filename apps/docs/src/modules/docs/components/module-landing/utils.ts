/** 演示卡参与网格排布所需的最小信息。 */
export type ModuleLandingLayoutDemo = {
  /** 演示卡的稳定标识。 */
  id: string;
  /** 演示占据的列数与行数。 */
  span: { columns: number; rows: number };
};

/** 演示卡在网格中的实际位置与占用范围。 */
export type ModuleLandingPlacement = { column: number; row: number; columnSpan: number; rowSpan: number };

/** 已完成定位的演示卡。 */
export type ModuleLandingPlacementEntry<TDemo extends ModuleLandingLayoutDemo = ModuleLandingLayoutDemo> = {
  demo: TDemo;
  placement: ModuleLandingPlacement;
};

type ModuleLandingPlacementCandidate<TDemo extends ModuleLandingLayoutDemo> = ModuleLandingPlacementEntry<TDemo>;

const MAX_MODULE_LANDING_ROW_SPAN = 4;
const MAX_MODULE_LANDING_SEARCH_STATES = 25_000;
const MAX_MODULE_LANDING_EXTRA_ROWS = 4;

/** 解析卡片在当前网格中的列跨度。 */
const resolveColumnSpan = (span: number, columns: number): number => Math.min(Math.max(1, span), columns);

/**
 * 在四列及以下网格中，按宽度收敛比例同步压缩超宽卡片的行跨度
 *
 * 容器的最小列数为四，因此 x×y 的卡片在此断点收敛为
 * 4×floor(4 / x × y)，避免单纯压宽而保留过高的空白区域
 */
const resolveRowSpan = (span: ModuleLandingLayoutDemo['span'], columns: number): number => {
  const requestedColumns = Math.max(1, span.columns);
  const requestedRows = Math.max(1, span.rows);
  const compressedRows =
    columns <= 4 && requestedColumns > 4 ? Math.floor((4 / requestedColumns) * requestedRows) : requestedRows;
  return Math.min(Math.max(1, compressedRows), MAX_MODULE_LANDING_ROW_SPAN);
};

/** 根据稳定标识生成可复现的散列排序值。 */
const getStableHash = (value: string): number => {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

/** 将卡片归为用于交错排布的尺寸级别。 */
const getPlacementSize = (placement: ModuleLandingPlacement): 'small' | 'medium' | 'large' => {
  const area = placement.columnSpan * placement.rowSpan;
  if (area >= 8) return 'large';
  if (area >= 3) return 'medium';
  return 'small';
};

/** 计算当前候选对本行剩余格的占用风险。 */
const getRowFillPenalty = <TDemo extends ModuleLandingLayoutDemo>(
  candidate: ModuleLandingPlacementCandidate<TDemo>,
  pendingDemos: ReadonlyArray<TDemo>,
  columns: number,
): number => {
  const remainingColumns = columns - (candidate.placement.column + candidate.placement.columnSpan);
  if (remainingColumns === 0) return 0;
  return pendingDemos.some(
    demo => demo.id !== candidate.demo.id && resolveColumnSpan(demo.span.columns, columns) <= remainingColumns,
  )
    ? 0
    : 10;
};

/** 为可放置卡片评分，优先保留完整行，并交替尺寸。 */
const getPlacementScore = <TDemo extends ModuleLandingLayoutDemo>(
  candidate: ModuleLandingPlacementCandidate<TDemo>,
  placements: ReadonlyArray<ModuleLandingPlacementEntry<TDemo>>,
  pendingDemos: ReadonlyArray<TDemo>,
  columns: number,
): number => {
  const candidateSize = getPlacementSize(candidate.placement);
  const recentPlacements = placements.slice(-2);
  const repeatedSizeCount = recentPlacements.filter(
    ({ placement }) => getPlacementSize(placement) === candidateSize,
  ).length;
  const previousPlacement = recentPlacements.at(-1)?.placement;
  const repeatedShapePenalty =
    previousPlacement &&
    previousPlacement.columnSpan === candidate.placement.columnSpan &&
    previousPlacement.rowSpan === candidate.placement.rowSpan
      ? 1
      : 0;

  return (
    getRowFillPenalty(candidate, pendingDemos, columns) * 10_000 +
    repeatedSizeCount * 100 +
    repeatedShapePenalty * 10 +
    (getStableHash(candidate.demo.id) % 10)
  );
};

const isPlacementAvailable = (
  occupied: Array<Array<boolean>>,
  placement: ModuleLandingPlacement,
  columns: number,
  maximumRows: number,
): boolean => {
  if (placement.column + placement.columnSpan > columns || placement.row + placement.rowSpan > maximumRows)
    return false;
  for (let row = placement.row; row < placement.row + placement.rowSpan; row += 1) {
    for (let column = placement.column; column < placement.column + placement.columnSpan; column += 1) {
      if (occupied[row]?.[column]) return false;
    }
  }
  return true;
};

const occupyPlacement = (occupied: Array<Array<boolean>>, placement: ModuleLandingPlacement): void => {
  for (let row = placement.row; row < placement.row + placement.rowSpan; row += 1) {
    occupied[row] ??= [];
    for (let column = placement.column; column < placement.column + placement.columnSpan; column += 1) {
      occupied[row][column] = true;
    }
  }
};

const releasePlacement = (occupied: Array<Array<boolean>>, placement: ModuleLandingPlacement): void => {
  for (let row = placement.row; row < placement.row + placement.rowSpan; row += 1) {
    for (let column = placement.column; column < placement.column + placement.columnSpan; column += 1) {
      occupied[row][column] = false;
    }
  }
};

const findFirstVacantCell = (
  occupied: Array<Array<boolean>>,
  columns: number,
  maximumRows: number,
): { column: number; row: number } | undefined => {
  for (let row = 0; row < maximumRows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!occupied[row]?.[column]) return { column, row };
    }
  }
  return undefined;
};

/** 在限定高度内回溯寻找没有中间空腔的排布。 */
const findCompactPlacements = <TDemo extends ModuleLandingLayoutDemo>(
  demos: ReadonlyArray<TDemo>,
  columns: number,
  maximumRows: number,
): Array<ModuleLandingPlacementEntry<TDemo>> | undefined => {
  const occupied: Array<Array<boolean>> = [];
  let searchedStateCount = 0;

  const search = (
    pendingDemos: ReadonlyArray<TDemo>,
    placements: Array<ModuleLandingPlacementEntry<TDemo>>,
  ): Array<ModuleLandingPlacementEntry<TDemo>> | undefined => {
    searchedStateCount += 1;
    if (searchedStateCount > MAX_MODULE_LANDING_SEARCH_STATES) return undefined;
    if (pendingDemos.length === 0) return placements;

    const vacantCell = findFirstVacantCell(occupied, columns, maximumRows);
    if (!vacantCell) return undefined;
    const candidates = pendingDemos
      .map(demo => ({
        demo,
        placement: {
          column: vacantCell.column,
          row: vacantCell.row,
          columnSpan: resolveColumnSpan(demo.span.columns, columns),
          rowSpan: resolveRowSpan(demo.span, columns),
        },
      }))
      .filter(candidate => isPlacementAvailable(occupied, candidate.placement, columns, maximumRows))
      .sort(
        (leftCandidate, rightCandidate) =>
          getPlacementScore(leftCandidate, placements, pendingDemos, columns) -
          getPlacementScore(rightCandidate, placements, pendingDemos, columns),
      );

    for (const candidate of candidates) {
      occupyPlacement(occupied, candidate.placement);
      const nextPlacements = search(
        pendingDemos.filter(demo => demo.id !== candidate.demo.id),
        [...placements, candidate],
      );
      if (nextPlacements) return nextPlacements;
      releasePlacement(occupied, candidate.placement);
    }
    return undefined;
  };

  return search(demos, []);
};

/** 搜索达到上限时，使用安全的顺序回填算法保证卡片不重叠。 */
const resolveSequentialPlacements = <TDemo extends ModuleLandingLayoutDemo>(
  demos: ReadonlyArray<TDemo>,
  columns: number,
): Array<ModuleLandingPlacementEntry<TDemo>> => {
  const pendingDemos = [...demos];
  const occupied: Array<Array<boolean>> = [];
  const placements: Array<ModuleLandingPlacementEntry<TDemo>> = [];
  let row = 0;
  let column = 0;

  while (pendingDemos.length > 0) {
    const candidates = pendingDemos
      .map(demo => ({
        demo,
        placement: {
          column,
          row,
          columnSpan: resolveColumnSpan(demo.span.columns, columns),
          rowSpan: resolveRowSpan(demo.span, columns),
        },
      }))
      .filter(candidate => isPlacementAvailable(occupied, candidate.placement, columns, Number.MAX_SAFE_INTEGER));
    const selectedCandidate = candidates.reduce<ModuleLandingPlacementCandidate<TDemo> | undefined>(
      (currentCandidate, nextCandidate) => {
        if (!currentCandidate) return nextCandidate;
        return getPlacementScore(nextCandidate, placements, pendingDemos, columns) <
          getPlacementScore(currentCandidate, placements, pendingDemos, columns)
          ? nextCandidate
          : currentCandidate;
      },
      undefined,
    );

    if (selectedCandidate) {
      pendingDemos.splice(pendingDemos.indexOf(selectedCandidate.demo), 1);
      occupyPlacement(occupied, selectedCandidate.placement);
      placements.push(selectedCandidate);
    } else {
      occupied[row] ??= [];
      occupied[row][column] = true;
    }

    column += 1;
    if (column === columns) {
      column = 0;
      row += 1;
    }
  }
  return placements;
};

/** 从左上依次选择空位，并在搜索上限内消除中间空腔。 */
export const resolveModuleLandingPlacements = <TDemo extends ModuleLandingLayoutDemo>(
  demos: ReadonlyArray<TDemo>,
  columns: number,
): Array<ModuleLandingPlacementEntry<TDemo>> => {
  const occupiedCellCount = demos.reduce(
    (cellCount, demo) => cellCount + resolveColumnSpan(demo.span.columns, columns) * resolveRowSpan(demo.span, columns),
    0,
  );
  const minimumRows = Math.ceil(occupiedCellCount / columns);

  for (let maximumRows = minimumRows; maximumRows <= minimumRows + MAX_MODULE_LANDING_EXTRA_ROWS; maximumRows += 1) {
    const placements = findCompactPlacements(demos, columns, maximumRows);
    if (placements) return placements;
  }

  return resolveSequentialPlacements(demos, columns);
};
