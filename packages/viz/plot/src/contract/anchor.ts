import type { IRCoordinate, IRTarget } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import type { AnchorIdSpec } from '../schemas';
import type { MarkProvenance } from './provenance';

export type AnchorIdGeneratorContext = {
  plotId?: string;
  markId?: string;
  markIndex: number;
  transformedIndex: number;
  prefix: string;
  role?: string;
};

export type AnchorIdGenerator = (row: ExternalRow, context: AnchorIdGeneratorContext) => string;

export type AnchorOwner = {
  markType: string;
  markId?: string;
  markIndex: number;
  transformedIndex: number;
  role?: string;
};

export type AnchorRegistry = {
  makeId: (spec: AnchorIdSpec, row: ExternalRow, owner: AnchorOwner) => string;
  register: (id: string, owner: AnchorOwner) => void;
  reference: (id: string, owner: AnchorOwner) => void;
  coordinate: (id: string, position: [number, number], owner: AnchorOwner) => IRCoordinate;
  assertResolved: () => void;
};

export type MarkLoweringContext = {
  markIndex: number;
  plotId?: string;
  provenance?: MarkProvenance;
  anchors?: AnchorRegistry;
};

export type ResolvedPlotTarget = IRTarget;
