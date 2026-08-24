import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

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
export type TableBorderStyleTokenKey = ZodInfer<typeof TableBorderStyleTokenKeySchema>;

/** Table border contribution 的闭合来源类型值 */
export type TableBorderContributionOriginValue = ValueOf<typeof TableBorderContributionOrigin>;

/** Border Graph candidate 的几何来源 */
export type TableBorderSource = DeepReadonly<ZodInfer<typeof TableBorderSourceSchema>>;
/** Border Graph lowering 消费的完整 line style */
export type ResolvedTableBorderLine = DeepReadonly<ZodInfer<typeof ResolvedTableBorderLineSchema>>;
/** 单个 Border Graph atom 的候选贡献 */
export type TableBorderContribution = DeepReadonly<ZodInfer<typeof TableBorderContributionSchema>>;
/** manifest 中保留 winner 与候选集合的 Border Graph atom */
export type TableBorderManifestAtom = DeepReadonly<ZodInfer<typeof TableBorderManifestAtomSchema>>;
/** manifest 中可见且合并后的 border edge */
export type TableBorderManifestEntry = DeepReadonly<ZodInfer<typeof TableBorderManifestEntrySchema>>;
/** emitted border Path 使用的 Table metadata */
export type TableBorderPathMeta = DeepReadonly<ZodInfer<typeof TableBorderPathMetaSchema>>;
/** border locator 使用的 edge 与 Path 对应项 */
export type TableBorderLocatorEntry = DeepReadonly<ZodInfer<typeof TableBorderLocatorEntrySchema>>;

/** Table row 或 column 的 resolved manifest 条目 */
export type TableTrackManifestEntry = DeepReadonly<ZodInfer<typeof TableTrackManifestEntrySchema>>;

/** Table Cell 的完整 resolved manifest 条目 */
export type TableCellManifestEntry = DeepReadonly<ZodInfer<typeof TableCellManifestEntrySchema>>;

/** Table 同次 compile 产出的布局 manifest */
export type TableLayoutManifest = DeepReadonly<ZodInfer<typeof TableLayoutManifestSchema>>;
