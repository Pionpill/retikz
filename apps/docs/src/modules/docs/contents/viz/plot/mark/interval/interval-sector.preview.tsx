import { IntervalMark, Plot } from '@retikz/plot-react';

import { traffic } from './interval-sector.data';

/** 图形参数 */
export type IntervalSectorPreviewValues = {
  pullDistance: number;
  showLabels: boolean;
  innerRadius: number;
  padAngle: number;
};

/** 绘制示例图形 */
export const IntervalSectorPreview = (values: IntervalSectorPreviewValues) => {
  const data = traffic.map(row => (row.source === 'Search' ? { ...row, pull: values.pullDistance } : row));

  return (
    <Plot data={data} width={340} height={270} coordinate={{ type: 'polar2D', innerRadius: values.innerRadius }}>
      <IntervalMark
        angle="value"
        encodings={{ color: 'source', pull: 'pull', ...(values.showLabels ? { label: { text: 'source' } } : {}) }}
        properties={{
          padAngle: values.padAngle,
          stroke: '#ffffff',
          strokeWidth: 1.5,
          label: values.showLabels ? { position: 'right', distance: 8, font: { size: 10, weight: 'bold' } } : undefined,
        }}
      />
    </Plot>
  );
};
