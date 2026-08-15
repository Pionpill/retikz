import type { DataLineageOptions } from '@retikz/data';

import type { PlotLineageOptions, PlotRowValueOptions } from '../../contract';

/** Plot lineage option defaults resolved for one runtime invocation */
export type EffectivePlotLineageOptions = {
  data: DataLineageOptions;
  markIdentity: boolean;
  markEncoding: boolean;
  transformScopes: boolean;
  scaleMappings: boolean;
  layoutContext: boolean;
  locatorAnchors: boolean;
  rowValues: false | PlotRowValueOptions;
  hostMetadata: false | NonNullable<PlotLineageOptions['hostMetadata']>;
};
