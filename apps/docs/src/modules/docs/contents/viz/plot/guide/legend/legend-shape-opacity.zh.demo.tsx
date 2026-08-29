import { Plot, PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { cities } from './legend.data';
import { legendShapeOpacityControls, previewControlContract } from './legend-shape-opacity.controls';

/** 注册回退使用的形状与透明度图例控件 */
export const previewControls = legendShapeOpacityControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={cities}
    model={[
      { name: 'lng', type: 'continuous' },
      { name: 'lat', type: 'continuous' },
      { name: 'region', type: 'categorical' },
      { name: 'pop', type: 'continuous' },
    ]}
    width={380}
    height={280}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="lng" y="lat" shape="region" opacity="pop" />
    {values.showShape ? <PlotLegend channel="shape" position={values.shapePosition} title="区域" /> : null}
    {values.showOpacity ? (
      <PlotLegend
        channel="opacity"
        position={values.opacityPosition}
        ticks={{ count: values.tickCount }}
        title="人口"
      />
    ) : null}
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** shape + opacity：分类形状和连续透明度各自生成独立图例 */
export default controlledPreview.Component;
