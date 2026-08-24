import { PathMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { densityControls, densityOperationOf, previewControlContract } from './transform-density.controls';
import { measurements } from './transform-density.data';

/** 注册回退使用的密度控件 */
export const previewControls = densityControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={measurements} width={440} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...densityOperationOf(values)} />
    <PlotScale dimension="x" type="linear" domain={[1, 10]} />
    <PlotScale dimension="y" type="linear" domain={[0, 0.7]} />
    <PathMark
      x="densityX"
      y="density"
      series="group"
      color="group"
      order="densityX"
      closure={{ kind: 'baseline', baseline: 0 }}
      fill="dodgerblue"
      strokeWidth={2.2}
    />
    <PlotAxis dimension="x" title="测量值" />
    <PlotAxis dimension="y" title="密度" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较 KDE 带宽与采样数的动态试验场 */
export default controlledPreview.Component;
