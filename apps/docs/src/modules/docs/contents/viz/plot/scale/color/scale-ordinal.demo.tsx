import { PathMark, Plot, PlotAxis, PlotLegend } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleOrdinalControls } from './scale-ordinal.controls';
import { climate } from './scale-ordinal.data';

/** 注册回退使用的 ordinal 颜色比例尺 controls */
export const previewControls = scaleOrdinalControls;

const palettes = {
  default: ['#2563eb', '#f97316'],
  cool: ['#0891b2', '#7c3aed'],
  warm: ['#dc2626', '#eab308'],
} as const;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={climate}
    plotTheme={{ palette: { categorical: [...palettes[values.palette]] } }}
    width={400}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="month" y="temp" color="city" order="month" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
    {values.showLegend ? <PlotLegend channel="color" /> : null}
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在类别 domain 不变时切换 ordinal range 与图例 */
export default controlledPreview.Component;
