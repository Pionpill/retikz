import { PointOpacityStyleSchema, PointSizeStyleSchema } from '@retikz/plot';
import { z } from 'zod';

import { assertChartSpatialRoot, CHART_NAMESPACE, ChartSharedBaseSchema, ChartType } from '../../schemas';
import { omitUndefinedProperties } from '../../shared';

/** 私有 fixture 主 mark 的稀疏 patch */
export const InfrastructureMarkPatchSchema = z
  .strictObject({
    size: PointSizeStyleSchema.optional().describe('Optional main point size patch'),
    opacity: PointOpacityStyleSchema.optional().describe('Optional main point opacity patch'),
  })
  .describe('Sparse style patch for the private infrastructure main mark')
  .refine(patch => patch.size !== undefined || patch.opacity !== undefined, {
    message: 'infrastructure mark patch requires size or opacity',
  });

/** 私有 fixture guide 的稀疏 patch */
export const InfrastructureComponentPatchSchema = z
  .strictObject({
    target: z.string().min(1).describe('Semantic recipe member target'),
    grid: z.boolean().describe('Axis grid visibility patch'),
  })
  .describe('Targeted guide patch for the private infrastructure fixture');

/** 私有基础设施 fixture 的最终输入 schema */
export const InfrastructureChartSpecSchema = ChartSharedBaseSchema.extend({
  namespace: z.literal(CHART_NAMESPACE).describe('Chart composite namespace'),
  type: z.literal(ChartType.InfrastructureFixture).describe('Private infrastructure fixture discriminator'),
  encoding: z
    .strictObject({
      x: z.string().min(1).describe('Field bound to the fixture x channel'),
      y: z.string().min(1).describe('Field bound to the fixture y channel'),
    })
    .describe('Required fixture channel bindings'),
  mark: InfrastructureMarkPatchSchema.optional().describe('Sparse main mark patch'),
  components: z.array(InfrastructureComponentPatchSchema).optional().describe('Sparse target-level component patches'),
})
  .describe('Private infrastructure Chart variant input')
  .superRefine(assertChartSpatialRoot)
  .overwrite(omitUndefinedProperties);

/** 私有基础设施 fixture 的 JSON-safe spec */
export type InfrastructureChartSpec = z.infer<typeof InfrastructureChartSpecSchema>;
