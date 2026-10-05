import { NonNegativeIntegerSchema, NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, discriminatedUnion, enum as zodEnum, literal, strictObject, union } from 'zod';

import { TableBordersSchema } from '../border';
import { TableTrackSizeKind } from './constants';

const NonnegativeGapSchema = NonNegativeNumberSchema;

/** 校验表格轨道尺寸的判别种类 */
export const TableTrackSizeKindSchema = zodEnum(TableTrackSizeKind).describe(
  'Discriminator for a Table track sizing variant.',
);

/** 校验使用显式非负尺寸的固定轨道 */
export const TableFixedTrackSizeSchema = strictObject({
  kind: literal(TableTrackSizeKind.Fixed).describe('Discriminator for an explicit fixed track size.'),
  value: NonNegativeNumberSchema.describe('Nonnegative fixed track size.'),
}).describe('Table track with an explicit nonnegative size.');

/** 校验根据内容贡献决定尺寸的自适应轨道 */
export const TableAutoTrackSizeSchema = strictObject({
  kind: literal(TableTrackSizeKind.Auto).describe('Discriminator for a content-sized track.'),
}).describe('Table track sized from its canonical content contribution.');

/** 校验按权重分配受约束剩余空间的轨道 */
export const TableFractionTrackSizeSchema = strictObject({
  kind: literal(TableTrackSizeKind.Fraction).describe('Discriminator for a fractional track.'),
  weight: PositiveNumberSchema.optional().describe('Positive flex weight. Omitted fields use 1 at runtime.'),
}).describe('Table track that receives a weighted share of constrained remaining space.');

const TableMinTrackSizeSchema = union([TableFixedTrackSizeSchema, TableAutoTrackSizeSchema]);

const TableMaxTrackSizeSchema = union([
  TableFixedTrackSizeSchema,
  TableAutoTrackSizeSchema,
  TableFractionTrackSizeSchema,
]);

/** 校验同时受最小与最大尺寸策略约束的轨道 */
export const TableMinmaxTrackSizeSchema = strictObject({
  kind: literal(TableTrackSizeKind.Minmax).describe('Discriminator for a bounded Table track.'),
  min: TableMinTrackSizeSchema.describe('Fixed or content-derived lower track bound.'),
  max: TableMaxTrackSizeSchema.describe('Fixed, content-derived, or fractional upper track bound.'),
})
  .superRefine((track, context) => {
    if (
      track.min.kind === TableTrackSizeKind.Fixed &&
      track.max.kind === TableTrackSizeKind.Fixed &&
      track.min.value > track.max.value
    ) {
      context.addIssue({
        code: 'custom',
        path: ['max', 'value'],
        message: 'fixed max must be greater than or equal to fixed min',
      });
    }
  })
  .describe('Table track constrained by explicit minimum and maximum sizing variants.');

/** 校验固定、自适应、比例分配或最小最大约束的轨道尺寸 */
export const TableTrackSizeSchema = discriminatedUnion('kind', [
  TableFixedTrackSizeSchema,
  TableAutoTrackSizeSchema,
  TableFractionTrackSizeSchema,
  TableMinmaxTrackSizeSchema,
]).describe('Table track size: fixed, auto, fraction, or minmax.');

/** 校验按规范下标替换轴默认尺寸的单轨道覆盖 */
export const TableTrackOverrideSchema = strictObject({
  index: NonNegativeIntegerSchema.describe('Canonical zero-based track index.'),
  size: TableTrackSizeSchema.describe('Track size that replaces the axis default at this index.'),
}).describe('Sparse Table track-size override addressed by canonical index.');

/** 校验按唯一规范下标定位的稀疏轨道尺寸覆盖集合 */
export const TableTrackOverridesSchema = array(TableTrackOverrideSchema)
  .superRefine((overrides, context) => {
    const indexes = new Set<number>();
    overrides.forEach((override, index) => {
      if (indexes.has(override.index)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'index'],
          message: `duplicate Table track override index ${override.index}`,
        });
      }

      indexes.add(override.index);
    });
  })
  .describe('Sparse Table track-size overrides with unique canonical indexes.');

/** 校验轨道尺寸、间距与边框布局选项，不物化运行时默认值 */
export const TableLayoutSchema = strictObject({
  columnSize: TableTrackSizeSchema.optional().describe('Default column track size. Omitted fields use fixed 120.'),
  rowSize: TableTrackSizeSchema.optional().describe('Default body row track size. Omitted fields use fixed 32.'),
  headerRowSize: TableTrackSizeSchema.optional().describe(
    'Default column-header row size. Omitted fields use the resolved rowSize.',
  ),
  columns: TableTrackOverridesSchema.optional().describe('Sparse canonical column-size overrides.'),
  rows: TableTrackOverridesSchema.optional().describe('Sparse canonical row-size overrides.'),
  columnGap: NonnegativeGapSchema.optional().describe(
    'Nonnegative finite gap between adjacent columns. Omitted fields use 0.',
  ),
  rowGap: NonnegativeGapSchema.optional().describe(
    'Nonnegative finite gap between adjacent rows. Omitted fields use 0.',
  ),
  borders: TableBordersSchema.optional().describe('Optional Table border topology and defaults.'),
}).describe('Table track sizing, gaps, and border layout options without materialized defaults.');
