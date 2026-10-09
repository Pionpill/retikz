import { IntervalMark, Plot, BuiltinPlotScale } from '@retikz/plot-react';

import { evenSteps, rainfall, squareSteps } from './scale-radial.data';

/** 图形参数 */
export type ScaleRadialPreviewValues = {
  dataPreset: 'square' | 'even' | 'rainfall';
};

/** 绘制示例图形 */
export const ScaleRadialPreview = (values: ScaleRadialPreviewValues) => {
  const data = values.dataPreset === 'rainfall' ? rainfall : values.dataPreset === 'even' ? evenSteps : squareSteps;

  return (
    <div className="grid w-full max-w-[400px] grid-cols-2 items-start gap-3">
      <figure className="grid justify-items-center gap-1">
        <figcaption className="text-center text-xs text-muted-foreground">
          <code>linear</code> · r ∝ value
        </figcaption>
        <Plot data={data} width={190} height={190} coordinate={{ type: 'polar2D' }}>
          <IntervalMark x="category" y="value" color="category" />
          <BuiltinPlotScale dimension="y" type="linear" domainPadding={0} />
        </Plot>
      </figure>
      <figure className="grid justify-items-center gap-1">
        <figcaption className="text-center text-xs text-muted-foreground">
          <code>radial</code> · r² ∝ value
        </figcaption>
        <Plot data={data} width={190} height={190} coordinate={{ type: 'polar2D' }}>
          <IntervalMark x="category" y="value" color="category" />
          <BuiltinPlotScale dimension="y" type="radial" domainPadding={0} />
        </Plot>
      </figure>
    </div>
  );
};
