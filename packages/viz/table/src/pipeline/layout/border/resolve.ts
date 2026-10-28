import { TableBorderContributionSchema } from '../../../contract/manifest';
import { resolveCanonicalTableBorderAtoms } from './atom-resolution';
import type { CompiledTableBorderAtom, TableBorderAtom } from './types';

/** 独立调用时先解析贡献，再确定原子边段的关系约束 */
export const resolveTableBorderAtoms = (
  atoms: ReadonlyArray<TableBorderAtom>,
): ReadonlyArray<CompiledTableBorderAtom> =>
  resolveCanonicalTableBorderAtoms(
    atoms.map(atom => ({
      ...atom,
      contributors: atom.contributors.map(contribution => TableBorderContributionSchema.parse(contribution)),
    })),
  );
