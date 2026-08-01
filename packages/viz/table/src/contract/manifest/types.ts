import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { DeepReadonly } from '../../shared';
import type { TableBorderContributionOrigin } from './constants';
import type {
  ResolvedTableBorderLineSchema,
  TableBorderContributionSchema,
  TableBorderLocatorEntrySchema,
  TableBorderManifestAtomSchema,
  TableBorderManifestEntrySchema,
  TableBorderPathMetaSchema,
  TableBorderSourceSchema,
  TableBorderStyleTokenKeySchema,
  TableCellManifestEntrySchema,
  TableLayoutManifestSchema,
  TableTrackManifestEntrySchema,
} from './schema';

/** Border Graph style token provenance key */
export type TableBorderStyleTokenKey = z.infer<typeof TableBorderStyleTokenKeySchema>;

/** Table border contribution 的闭合来源类型值 */
export type TableBorderContributionOriginValue = ValueOf<typeof TableBorderContributionOrigin>;

/** Border Graph candidate 的几何来源 */
export type TableBorderSource = DeepReadonly<z.infer<typeof TableBorderSourceSchema>>;
/** Border Graph lowering 消费的完整 line style */
export type ResolvedTableBorderLine = DeepReadonly<z.infer<typeof ResolvedTableBorderLineSchema>>;
/** 单个 Border Graph atom 的候选贡献 */
export type TableBorderContribution = DeepReadonly<z.infer<typeof TableBorderContributionSchema>>;
/** manifest 中保留 winner 与候选集合的 Border Graph atom */
export type TableBorderManifestAtom = DeepReadonly<z.infer<typeof TableBorderManifestAtomSchema>>;
/** manifest 中可见且合并后的 border edge */
export type TableBorderManifestEntry = DeepReadonly<z.infer<typeof TableBorderManifestEntrySchema>>;
/** emitted border Path 使用的 Table metadata */
export type TableBorderPathMeta = DeepReadonly<z.infer<typeof TableBorderPathMetaSchema>>;
/** border locator 使用的 edge 与 Path 对应项 */
export type TableBorderLocatorEntry = DeepReadonly<z.infer<typeof TableBorderLocatorEntrySchema>>;

/** Table row 或 column 的 resolved manifest 条目 */
export type TableTrackManifestEntry = DeepReadonly<z.infer<typeof TableTrackManifestEntrySchema>>;

/** Table Cell 的完整 resolved manifest 条目 */
export type TableCellManifestEntry = DeepReadonly<z.infer<typeof TableCellManifestEntrySchema>>;

/** Table 同次 compile 产出的布局 manifest */
export type TableLayoutManifest = DeepReadonly<z.infer<typeof TableLayoutManifestSchema>>;
