import type { z } from 'zod';

import type { DeepReadonly } from '../../shared';
import type {
  ResolvedTableBorderLineSchema,
  TableBorderContributionSchema,
  TableBorderLocatorEntrySchema,
  TableBorderManifestAtomSchema,
  TableBorderManifestEntrySchema,
  TableBorderPathMetaSchema,
  TableBorderSourceSchema,
  TableCellManifestEntrySchema,
  TableLayoutManifestSchema,
  TableTrackManifestEntrySchema,
} from './schema';

export type TableBorderSource = DeepReadonly<z.infer<typeof TableBorderSourceSchema>>;
export type ResolvedTableBorderLine = DeepReadonly<z.infer<typeof ResolvedTableBorderLineSchema>>;
export type TableBorderContribution = DeepReadonly<z.infer<typeof TableBorderContributionSchema>>;
export type TableBorderManifestAtom = DeepReadonly<z.infer<typeof TableBorderManifestAtomSchema>>;
export type TableBorderManifestEntry = DeepReadonly<z.infer<typeof TableBorderManifestEntrySchema>>;
export type TableBorderPathMeta = DeepReadonly<z.infer<typeof TableBorderPathMetaSchema>>;
export type TableBorderLocatorEntry = DeepReadonly<z.infer<typeof TableBorderLocatorEntrySchema>>;

/** Table row 或 column 的 resolved manifest 条目 */
export type TableTrackManifestEntry = DeepReadonly<z.infer<typeof TableTrackManifestEntrySchema>>;

/** Table Cell 的完整 resolved manifest 条目 */
export type TableCellManifestEntry = DeepReadonly<z.infer<typeof TableCellManifestEntrySchema>>;

/** Table 同次 compile 产出的布局 manifest */
export type TableLayoutManifest = DeepReadonly<z.infer<typeof TableLayoutManifestSchema>>;
