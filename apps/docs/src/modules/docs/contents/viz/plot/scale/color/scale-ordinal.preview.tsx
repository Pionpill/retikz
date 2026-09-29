import { PathMark, Plot, PlotAxis, PlotLegend } from '@retikz/plot-react';

import { climate } from './scale-ordinal.data';

const palettes = {
  default: ['#2563eb', '#f97316'],
  cool: ['#0891b2', '#7c3aed'],
  warm: ['#dc2626', '#eab308'],
} as const;

/** 图形参数 */
export type ScaleOrdinalPreviewValues = {
  palette: 'default' | 'cool' | 'warm';
  showLegend: boolean;
};

/** 绘制示例图形 */
export const ScaleOrdinalPreview = (values: ScaleOrdinalPreviewValues) => (
  <Plot
    data={climate}
    plotDefaults={{ palette: { categorical: [...palettes[values.palette]] } }}
    width={400}
    height={250}
  >
    <PathMark x="month" y="temp" color="city" order="month" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
    {values.showLegend ? <PlotLegend channel="color" /> : null}
  </Plot>
);
