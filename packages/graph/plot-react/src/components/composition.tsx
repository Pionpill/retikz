import type { PlotSpec } from '@retikz/plot';
import type { FC, ReactNode } from 'react';

type CompositionSpec = NonNullable<PlotSpec['composition']>;
type FacetGridSpec = NonNullable<CompositionSpec['facets']>[number];
type SharedScaffoldSpec = NonNullable<CompositionSpec['scaffolds']>[number];
type ScaffoldTrackSpec = SharedScaffoldSpec['tracks'][number];

export type FacetDimensionInput = string | NonNullable<FacetGridSpec['row']>;

export type FacetProps = Omit<FacetGridSpec, 'row' | 'column'> & {
  row?: FacetDimensionInput;
  column?: FacetDimensionInput;
  scopeId?: string;
  layout?: CompositionSpec['layout'];
  guidePolicy?: CompositionSpec['guidePolicy'];
};

export type ScaffoldProps = Omit<SharedScaffoldSpec, 'coordinate' | 'tracks'> & {
  coordinate?: SharedScaffoldSpec['coordinate'];
  tracks?: Array<ScaffoldTrackSpec>;
  layout?: CompositionSpec['layout'];
  guidePolicy?: CompositionSpec['guidePolicy'];
  children?: ReactNode;
};

export type TrackProps = ScaffoldTrackSpec;

export const Facet: FC<FacetProps> = () => null;

export const Scaffold: FC<ScaffoldProps> = () => null;

export const Track: FC<TrackProps> = () => null;
