import { z } from 'zod';

import { ChartPresentationPreset } from './constants';

/** 单个 canonical Chart presentation item 的 inspection */
export const ChartPresentationItemInspectionSchema = z.strictObject({
  key: z.string().min(1),
  kind: z.enum(['plot', 'preset']),
  preset: z.enum(ChartPresentationPreset).optional(),
  sourcePath: z.string().min(1),
});

/** Chart presentation authored-order inspection */
export const ChartPresentationInspectionSchema = z.strictObject({
  kind: z.enum(['plot', 'flex-layout']),
  items: z.array(ChartPresentationItemInspectionSchema).min(1),
});

/** 单个 canonical Chart presentation item inspection */
export type IRChartPresentationItemInspection = z.infer<typeof ChartPresentationItemInspectionSchema>;

/** Chart presentation inspection */
export type IRChartPresentationInspection = z.infer<typeof ChartPresentationInspectionSchema>;
