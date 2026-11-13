import { SlopeChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { slopeGapsRows } from './slope-basic.data';
import type { SlopeGapsValues } from './slope-gaps.controls';

/** 每行独立连接两个阶段，点和标签复用图表能力 */
export const renderSlopeGaps = (values: SlopeGapsValues, dimensions?: PreviewDimensions) => (
  <SlopeChart
    rows={slopeGapsRows(values.missing)}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{ encodings: { entity: 'entity', start: 'previous', end: 'current' }, properties: { label: values.label } }}
  />
);
