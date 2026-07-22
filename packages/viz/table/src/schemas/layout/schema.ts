import { z } from 'zod';

const PositiveTrackSchema = z.number().positive();
const NonnegativeGapSchema = z.number().nonnegative();

export const TableLayoutSchema = z
  .strictObject({
    columnWidth: PositiveTrackSchema.optional().describe(
      'Uniform positive finite column width. Omitted fields use 120.',
    ),
    rowHeight: PositiveTrackSchema.optional().describe(
      'Uniform positive finite body row height. Omitted fields use 32.',
    ),
    headerHeight: PositiveTrackSchema.optional().describe(
      'Uniform positive finite column-header row height. Omitted fields use the resolved rowHeight.',
    ),
    columnGap: NonnegativeGapSchema.optional().describe(
      'Nonnegative finite gap between adjacent columns. Omitted fields use 0.',
    ),
    rowGap: NonnegativeGapSchema.optional().describe(
      'Nonnegative finite gap between adjacent rows. Omitted fields use 0.',
    ),
  })
  .describe('Fixed-track Table layout options without materialized defaults.');
