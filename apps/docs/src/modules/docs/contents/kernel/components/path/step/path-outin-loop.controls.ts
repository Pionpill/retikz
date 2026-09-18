import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathOutInLoopControlsI18n } from './path-outin-loop.i18n';

/** Path 出入射角的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathOutInLoopControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.outgoingAndIncomingAngles,
    sections: [
      {
        label: i18n.path,
        controls: [
          {
            kind: 'select',
            id: 'mode',
            label: i18n.mode,
            defaultValue: 'loop',
            options: [
              { value: 'loop', label: i18n.selfLoop },
              { value: 'connect', label: i18n.connectST },
            ],
          },
          { kind: 'range', id: 'outAngle', label: i18n.outgoingAngle, defaultValue: 120, min: -180, max: 180, step: 5 },
          { kind: 'range', id: 'inAngle', label: i18n.incomingAngle, defaultValue: 60, min: -180, max: 180, step: 5 },
          {
            kind: 'range',
            id: 'loopLooseness',
            label: i18n.loopLooseness,
            defaultValue: 72,
            min: 48,
            max: 80,
            step: 8,
            visibleWhen: { controlId: 'mode', oneOf: ['loop'] },
          },
          {
            kind: 'range',
            id: 'looseness',
            label: i18n.connectionLooseness,
            defaultValue: 1,
            min: 0.5,
            max: 2,
            step: 0.1,
            visibleWhen: { controlId: 'mode', oneOf: ['connect'] },
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathOutInLoopControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { mode: 'loop', outAngle: 120, inAngle: 60, loopLooseness: 72, looseness: 1 },
    relatedApis: ['Step.outAngle', 'Step.inAngle', 'Step.looseness'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
