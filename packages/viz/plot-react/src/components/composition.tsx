import type { PlotSpec } from '@retikz/plot';
import type { FC, ReactNode } from 'react';

type CompositionSpec = NonNullable<PlotSpec['composition']>;
type ArrangementSpec = NonNullable<CompositionSpec['arrangements']>[number];
type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;
type ScaffoldTrackSpec = SharedScaffoldSpec['tracks'][number];

export type FacetDimensionInput = string | NonNullable<FacetGridSpec['row']>;

export type FacetProps = Omit<FacetGridSpec, 'kind' | 'view' | 'row' | 'column'> & {
  row?: FacetDimensionInput;
  column?: FacetDimensionInput;
  view?: string;
  spacing?: CompositionSpec['spacing'];
  resolve?: CompositionSpec['resolve'];
  children?: ReactNode;
};

export type ScaffoldProps = Omit<SharedScaffoldSpec, 'kind' | 'coordinate' | 'tracks'> & {
  coordinate?: SharedScaffoldSpec['coordinate'];
  tracks?: Array<ScaffoldTrackSpec>;
  spacing?: CompositionSpec['spacing'];
  resolve?: CompositionSpec['resolve'];
  children?: ReactNode;
};

export type TrackProps = ScaffoldTrackSpec & {
  children?: ReactNode;
};

export const Facet: FC<FacetProps> = () => null;

export const Scaffold: FC<ScaffoldProps> = () => null;

export const Track: FC<TrackProps> = () => null;
