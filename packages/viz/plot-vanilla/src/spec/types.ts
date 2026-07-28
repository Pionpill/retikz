import type { IRPlotSpec } from '@retikz/plot';

/** Vanilla Tier2 embed 交给 Plot adapter 的属性 */
export type PlotEmbedProps = Readonly<{
  /** 待下沉的 canonical PlotSpec */
  spec: IRPlotSpec;
}>;

export type { PlotAuthoringInput } from '@retikz/plot';
