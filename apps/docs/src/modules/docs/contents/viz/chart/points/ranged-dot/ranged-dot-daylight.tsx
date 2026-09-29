import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './ranged-dot-daylight.controls';
import { renderRangedDotDaylightPreview } from './ranged-dot-daylight.preview';

const contract = createPreviewControlContract();
const controlled = defineControlledPreview(contract, (_values, dimensions) =>
  renderRangedDotDaylightPreview(dimensions),
);

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
