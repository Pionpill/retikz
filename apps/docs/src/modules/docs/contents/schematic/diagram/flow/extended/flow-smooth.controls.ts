import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowSmoothI18n } from './flow-smooth.i18n';

/** 固定节点，仅调整经过点高度与控制臂倍率 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowSmoothI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'count', label: copy.count, defaultValue: 2, min: 1, max: 3, step: 1 },
          { kind: 'range', id: 'height', label: copy.height, defaultValue: 80, min: 20, max: 120, step: 10 },
          { kind: 'range', id: 'tension', label: copy.tension, defaultValue: 1, min: 0.2, max: 2, step: 0.2 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { count: 2, height: 80, tension: 1 },
    relatedApis: ['FlowRelation.routing.points', 'FlowRelation.routing.tension'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;
