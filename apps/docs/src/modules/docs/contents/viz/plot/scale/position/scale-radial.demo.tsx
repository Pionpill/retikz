import type { FC } from 'react';

import { IntervalMark, Plot, PlotScale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleRadialControls } from './scale-radial.controls';
import { evenSteps, rainfall, squareSteps } from './scale-radial.data';

/** 注册回退使用的径向位置比例尺 controls */
export const previewControls = scaleRadialControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const data = values.dataPreset === 'rainfall' ? rainfall : values.dataPreset === 'even' ? evenSteps : squareSteps;

  return (
    <div className="grid w-full max-w-[400px] grid-cols-2 items-start gap-3">
      <figure className="grid justify-items-center gap-1">
        <figcaption className="text-center text-xs text-muted-foreground">
          <code>linear</code> · r ∝ value
        </figcaption>
        <Plot
          data={data}
          width={190}
          height={190}
          coordinate={{ type: 'polar2D' }}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <IntervalMark x="category" y="value" color="category" />
          <PlotScale dimension="y" type="linear" domainPadding={0} />
        </Plot>
      </figure>
      <figure className="grid justify-items-center gap-1">
        <figcaption className="text-center text-xs text-muted-foreground">
          <code>radial</code> · r² ∝ value
        </figcaption>
        <Plot
          data={data}
          width={190}
          height={190}
          coordinate={{ type: 'polar2D' }}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          <IntervalMark x="category" y="value" color="category" />
          <PlotScale dimension="y" type="radial" domainPadding={0} />
        </Plot>
      </figure>
    </div>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 并排比较同一数据在半径线性与面积线性下的极坐标构图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
