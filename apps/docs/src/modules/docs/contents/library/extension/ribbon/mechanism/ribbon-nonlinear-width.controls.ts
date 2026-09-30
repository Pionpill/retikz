import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonNonlinearWidthI18n } from './ribbon-nonlinear-width.i18n';

/** 固定节点位置，只改变三处宽度与节点间的插值 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = ribbonNonlinearWidthI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            { kind: 'range', id: 'startWidth', label: t.start, defaultValue: 24, min: 0, max: 100, step: 2 },
            { kind: 'range', id: 'middleWidth', label: t.middle, defaultValue: 72, min: 0, max: 100, step: 2 },
            { kind: 'range', id: 'endWidth', label: t.end, defaultValue: 36, min: 0, max: 100, step: 2 },
            {
              kind: 'select',
              id: 'interpolation',
              label: t.interpolation,
              defaultValue: 'smooth',
              options: [
                { value: 'linear', label: t.linear },
                { value: 'smooth', label: t.smooth },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { startWidth: 24, middleWidth: 72, endWidth: 36, interpolation: 'smooth' },
    relatedApis: ['Path.kindOptions.width.stops', 'Path.kindOptions.width.interpolation'],
  } satisfies PreviewControlContract;
};

/** 多节点宽度示例的稳定状态 */
export const previewControlContract = createPreviewControlContract('zh');
