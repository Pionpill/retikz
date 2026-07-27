import type { TableBorderContribution } from '../../../contract/manifest';
import type { ResolvedTableBorderAtom, TableBorderAtom } from './types';

import { TableBorderContributionSchema } from '../../../contract/manifest';
import { deepFreeze } from '../../../shared';
import { tableBorderSourceOrderKey } from './types';

/** 按 conflict tuple 把更高优先候选排在前面 */
const compareContributions = (left: TableBorderContribution, right: TableBorderContribution): number => {
  if (left.priority !== right.priority) return left.priority < right.priority ? 1 : -1;
  if (left.specificity !== right.specificity) return right.specificity - left.specificity;
  const leftKindRank = left.kind === 'none' ? 1 : 0;
  const rightKindRank = right.kind === 'none' ? 1 : 0;
  if (leftKindRank !== rightKindRank) return rightKindRank - leftKindRank;
  const leftWidth = left.kind === 'line' ? left.line.width : 0;
  const rightWidth = right.kind === 'line' ? right.line.width : 0;
  if (leftWidth !== rightWidth) return rightWidth - leftWidth;
  if (left.ownerSideRank !== right.ownerSideRank) return right.ownerSideRank - left.ownerSideRank;
  return left.sourceOrderKey.localeCompare(right.sourceOrderKey);
};

/** 验证 atom 几何为 finite 正向轴对齐线段 */
const validateAtomGeometry = (atom: TableBorderAtom): void => {
  const values = [atom.start.x, atom.start.y, atom.end.x, atom.end.y];
  if (!values.every(Number.isFinite)) {
    throw new Error(`table: Border Graph atom "${atom.key}" geometry must be finite`);
  }
  const valid =
    atom.orientation === 'horizontal'
      ? atom.start.y === atom.end.y && atom.end.x >= atom.start.x
      : atom.start.x === atom.end.x && atom.end.y >= atom.start.y;
  if (!valid) {
    throw new Error(`table: Border Graph atom "${atom.key}" must be a positive ${atom.orientation} segment`);
  }
};

const SideRank = { top: 0, right: 1, bottom: 2, left: 3 } as const;

/** 按 collapse numeric key 或 separate row/column/side 形成 canonical atom 顺序 */
const compareAtoms = (left: TableBorderAtom, right: TableBorderAtom): number => {
  const leftParts = left.key.split(':');
  const rightParts = right.key.split(':');
  if (leftParts[0] === 'c' && rightParts[0] === 'c') {
    if (leftParts[1] !== rightParts[1]) return leftParts[1] === 'h' ? -1 : 1;
    const boundary = Number(leftParts[2]) - Number(rightParts[2]);
    return boundary === 0 ? Number(leftParts[3]) - Number(rightParts[3]) : boundary;
  }
  if (leftParts[0] === 's' && rightParts[0] === 's') {
    const row = Number(leftParts[1]) - Number(rightParts[1]);
    if (row !== 0) return row;
    const column = Number(leftParts[2]) - Number(rightParts[2]);
    if (column !== 0) return column;
    return SideRank[leftParts[3] as keyof typeof SideRank] - SideRank[rightParts[3] as keyof typeof SideRank];
  }
  return left.key.localeCompare(right.key);
};

/** 按 canonical conflict tuple 解析 Border Graph atom winners */
export const resolveTableBorderAtoms = (
  atoms: ReadonlyArray<TableBorderAtom>,
): ReadonlyArray<ResolvedTableBorderAtom> => {
  const seenContributionKeys = new Set<string>();
  const seenAtomKeys = new Set<string>();
  const resolved = [...atoms].sort(compareAtoms).map(atom => {
    if (seenAtomKeys.has(atom.key)) {
      throw new Error(`table: duplicate Border Graph atom key "${atom.key}"`);
    }
    seenAtomKeys.add(atom.key);
    validateAtomGeometry(atom);
    if (atom.contributors.length === 0) {
      throw new Error(`table: Border Graph atom "${atom.key}" must have at least one contributor`);
    }
    const contributors = atom.contributors
      .map(raw => {
        const parsed = TableBorderContributionSchema.parse(raw);
        const expectedSourceOrderKey = tableBorderSourceOrderKey(parsed.source);
        if (parsed.sourceOrderKey !== expectedSourceOrderKey) {
          throw new Error(`table: Border contribution sourceOrderKey must equal "${expectedSourceOrderKey}"`);
        }
        const expectedKey = `${expectedSourceOrderKey}@${atom.key}`;
        if (parsed.key !== expectedKey) {
          throw new Error(`table: Border contribution key must equal "${expectedKey}"`);
        }
        if (seenContributionKeys.has(parsed.key)) {
          throw new Error(`table: duplicate Border contribution key "${parsed.key}"`);
        }
        seenContributionKeys.add(parsed.key);
        return parsed;
      })
      .sort((left, right) => left.sourceOrderKey.localeCompare(right.sourceOrderKey));
    const winner = [...contributors].sort(compareContributions)[0];
    const visible = winner.kind === 'line' && winner.line.width > 0 && winner.line.strokeOpacity > 0;
    return {
      key: atom.key,
      orientation: atom.orientation,
      start: { ...atom.start },
      end: { ...atom.end },
      contributors,
      winner,
      visible,
    };
  });
  return deepFreeze(resolved);
};
