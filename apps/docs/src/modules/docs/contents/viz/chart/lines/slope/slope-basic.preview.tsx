import { SlopeChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import type { SlopeBasicValues } from './slope-basic.controls';
import { slopeData } from './slope-basic.data';

/** 每行独立连接两个阶段，点和标签复用图表能力 */
export const renderSlopeBasic = (values: SlopeBasicValues, dimensions?: PreviewDimensions) => (
  <SlopeChart
    rows={slopeData}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: { entity: 'entity', start: 'previous', end: 'current' },
      properties: {
        point: values.point ? { size: values.pointSize } : false,
        label: values.label
          ? { ...(values.position === 'outward' ? {} : { position: values.position }), distance: values.distance }
          : false,
        path: { strokeWidth: values.strokeWidth },
      },
    }}
  />
);
