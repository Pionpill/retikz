import { PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, smoothControls, smoothOperationsOf } from './transform-smooth.controls';
import { trendSamples } from './transform-smooth.data';

/** 注册回退使用的趋势控件 */
export const previewControls = smoothControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const smoothTransform = smoothOperationsOf(values);

  return (
    <Plot data={trendSamples} width={440} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <PlotScale dimension="x" type="linear" domain={[-1, 5]} />
      <PlotScale dimension="y" type="linear" domain={[0, 10]} />
      <PointMark color="series" fillOpacity={0.72} x="time" y="value" />
      <PathMark
        color="series"
        order="trendX"
        series="series"
        strokeWidth={2.4}
        transform={smoothTransform}
        x="trendX"
        y="trendY"
      />
      <PointMark
        fill={{ kind: 'constant', value: 'white' }}
        size={3.5}
        stroke="series"
        strokeWidth={1}
        transform={smoothTransform}
        x="trendX"
        y="trendY"
      />
      <PlotAxis dimension="x" title="时间" />
      <PlotAxis dimension="y" title="数值" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整预测点数和外推范围的线性趋势试验场 */
export default controlledPreview.Component;
