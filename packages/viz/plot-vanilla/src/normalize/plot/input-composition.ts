import type { IRPlotSpec } from '@retikz/plot';

type ArrangementSpec = NonNullable<NonNullable<IRPlotSpec['composition']>['arrangements']>[number];
type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;
type ScaffoldTrackSpec = SharedScaffoldSpec['tracks'][number];

/** 分面维度输入：字段名简写或完整的分面维度配置 */
export type InputPlotFacetDimension = string | NonNullable<FacetGridSpec['row']>;

/** 单条共享轨道声明属性 */
export type InputPlotTrack = ScaffoldTrackSpec;
