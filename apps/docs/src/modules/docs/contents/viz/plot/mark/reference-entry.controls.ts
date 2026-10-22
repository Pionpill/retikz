import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { annotationCoordinateControl } from './shared/reference-coordinate.controls';
import { annotationCoordinateI18n } from './shared/reference-coordinate.i18n';

/** 概览中的坐标切换 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  ({
    controls: definePreviewControls({
      presentation: 'panel',
      title: annotationCoordinateI18n[lang].title,
      sections: [{ controls: [annotationCoordinateControl(lang)] }],
    }),
    canonicalValues: { coordinate: 'cartesian' },
    relatedApis: ['Plot.coordinate', 'PlotScale.type'],
  }) satisfies PreviewControlContract;
/** 概览的稳定状态 */
export const previewControlContract = createPreviewControlContract();
