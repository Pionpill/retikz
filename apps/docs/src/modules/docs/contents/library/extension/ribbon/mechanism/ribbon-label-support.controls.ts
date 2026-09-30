import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonLabelSupportI18n } from './ribbon-label-support.i18n';

/** 固定中心线与标签旋转，观察端帽支撑线和文字间距 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = ribbonLabelSupportI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'cap',
              label: t.cap,
              defaultValue: 'round',
              options: [
                { value: 'butt', label: t.butt },
                { value: 'round', label: t.round },
                { value: 'square', label: t.square },
                { value: 'arc', label: t.arc },
              ],
            },
            {
              kind: 'range',
              id: 'arcAngle',
              label: t.arcAngle,
              defaultValue: 90,
              min: 30,
              max: 180,
              step: 5,
              visibleWhen: { controlId: 'cap', oneOf: ['arc'] },
            },
            { kind: 'range', id: 'width', label: t.width, defaultValue: 40, min: 16, max: 64, step: 2 },
            { kind: 'range', id: 'distance', label: t.distance, defaultValue: 8, min: 0, max: 24, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { cap: 'round', arcAngle: 90, width: 40, distance: 8 },
    relatedApis: [
      'Path.kindOptions.start.cap',
      'Path.kindOptions.end.cap',
      'Path.kindOptions.start.cap.params',
      'Path.kindOptions.end.cap.params',
      'Path.kindOptions.width',
      'Path.kindOptions.start.label.distance',
      'Path.kindOptions.end.label.distance',
    ],
  } satisfies PreviewControlContract;
};

/** 端帽支撑线示例的稳定状态 */
export const previewControlContract = createPreviewControlContract('zh');
