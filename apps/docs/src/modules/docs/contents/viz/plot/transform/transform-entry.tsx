import { Plot, PlotAxis, PlotScale, PlotTransform, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { previewControlContract } from './transform-entry.controls';
import { entryOperation, entryRows } from './transform-entry.data';

/** 数据视图的注册回退 */
export const previewControls = previewControlContract.controls;

/** 将共享归一化结果绑定到三个点的纵坐标 */
const TransformEntry: FC = () => {
  const dimensions = usePreviewDimensions();
  return (
    <Plot
      data={entryRows}
      width={360}
      height={220}
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
    >
      <PlotTransform operation={entryOperation} />
      <PlotScale dimension="x" type="linear" domain={[0.5, 3.5]} />
      <PlotScale dimension="y" type="linear" domain={[0, 1]} />
      <PointMark x="month" y="share" size={6} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  );
};

export default TransformEntry;
