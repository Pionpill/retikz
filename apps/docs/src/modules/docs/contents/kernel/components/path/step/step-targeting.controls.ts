import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { stepTargetingControlsI18n } from './step-targeting.i18n';

/** Step 目标定位的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = stepTargetingControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.stepTargetPositioning,
    sections: [
      {
        label: i18n.targetForm,
        controls: [
          {
            kind: 'select',
            id: 'targetKind',
            label: i18n.to,
            defaultValue: 'offset',
            options: [
              { value: 'offset', label: i18n.referentOffset },
              { value: 'relative', label: i18n.relative },
              { value: 'relativeAccumulate', label: i18n.relativeAccumulate },
            ],
          },
          { kind: 'range', id: 'offsetX', label: i18n.x, defaultValue: 80, min: -40, max: 120, step: 5 },
          { kind: 'range', id: 'offsetY', label: i18n.y, defaultValue: -35, min: -70, max: 30, step: 5 },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const stepTargetingControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { targetKind: 'offset', offsetX: 80, offsetY: -35 },
    relatedApis: ['Step.to'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
