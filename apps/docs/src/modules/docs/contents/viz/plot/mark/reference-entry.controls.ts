import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { referenceCoordinateControl } from './shared/reference-coordinate.controls';
import { referenceCoordinateI18n } from './shared/reference-coordinate.i18n';

/** 概览中的坐标切换 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  ({
    controls: definePreviewControls({
      presentation: 'panel',
      title: referenceCoordinateI18n[lang].title,
      sections: [{ controls: [referenceCoordinateControl(lang)] }],
    }),
    canonicalValues: { coordinate: 'cartesian' },
    relatedApis: ['Plot.coordinate', 'PlotScale.type'],
  }) satisfies PreviewControlContract;
/** 概览的稳定状态 */
export const previewControlContract = createPreviewControlContract();
