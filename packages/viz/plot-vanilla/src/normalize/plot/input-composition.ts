import type { IRPlot } from '@retikz/plot';

type Arrangement = NonNullable<NonNullable<IRPlot['composition']>['arrangements']>[number];
type FacetGrid = Extract<Arrangement, { kind: 'facet' }>;
type SharedScaffold = Extract<Arrangement, { kind: 'tracks' }>;
type ScaffoldTrack = SharedScaffold['tracks'][number];

/** 分面维度输入：字段名简写或完整的分面维度配置 */
export type InputPlotFacetDimension = string | NonNullable<FacetGrid['row']>;

/** 单条共享轨道声明属性 */
export type InputPlotTrack = ScaffoldTrack;
