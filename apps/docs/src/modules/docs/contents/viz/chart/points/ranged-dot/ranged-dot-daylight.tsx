import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './ranged-dot-daylight.controls';
import { rangedDotDaylightData } from './ranged-dot-daylight.data';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (_values, dimensions) => (
  <RangedDotChart
    rows={rangedDotDaylightData}
    layout={dimensions}
    coordinate={{
      type: 'polar2D',
      startAngle: -90,
      endAngle: 270,
      innerRadius: 0.25,
      interpolation: 'polar',
    }}
  >
    <RangedDotEncodings
      category="month"
      start={{ field: 'sunriseHour', scale: { operation: { type: 'linear', name: 'dayHour', domain: [0, 24] } } }}
      end={{ field: 'sunsetHour', scale: { reference: 'dayHour' } }}
    />
    <RangedDotProperties
      point={{ size: 5 }}
      startPoint={{ color: '#2563eb' }}
      endPoint={{ color: '#f97316' }}
      range={{ stroke: '#64748b', strokeWidth: 2 }}
    />
  </RangedDotChart>
));

/** 环形白昼预览的语言参数 */
export type RangedDotDaylightProps = { lang?: Lang };

/** 环形白昼的受控预览 */
const RangedDotDaylight: FC<RangedDotDaylightProps> = controlled.Component;
export default RangedDotDaylight;
export { createPreviewControlContract } from './ranged-dot-daylight.controls';
export const previewControls = contract.controls;
export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotDaylightData', from: './ranged-dot-daylight.data' } },
};
