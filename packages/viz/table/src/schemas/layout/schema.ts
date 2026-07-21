import { z } from 'zod';

const PositiveFiniteTrackSchema = z.number().finite().positive();
const NonnegativeFiniteGapSchema = z.number().finite().nonnegative();

/** 固定轨道 Table layout schema */
export const TableLayoutSchema = z
  .strictObject({
    columnWidth: PositiveFiniteTrackSchema.optional().describe(
      'Uniform positive finite column width. Omitted fields use 120.',
    ),
    rowHeight: PositiveFiniteTrackSchema.optional().describe(
      'Uniform positive finite body row height. Omitted fields use 32.',
    ),
    headerHeight: PositiveFiniteTrackSchema.optional().describe(
      'Uniform positive finite column-header row height. Omitted fields use the resolved rowHeight.',
    ),
    columnGap: NonnegativeFiniteGapSchema.optional().describe(
      'Nonnegative finite gap between adjacent columns. Omitted fields use 0.',
    ),
    rowGap: NonnegativeFiniteGapSchema.optional().describe(
      'Nonnegative finite gap between adjacent rows. Omitted fields use 0.',
    ),
  })
  .describe('Fixed-track Table layout options without materialized defaults.');
