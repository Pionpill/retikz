import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { stepActionsControlsI18n } from './step-actions.i18n';

/** Step 基本动作的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = stepActionsControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.stepBasicActions,
    sections: [
      {
        label: i18n.action,
        controls: [
          {
            kind: 'select',
            id: 'actionKind',
            label: i18n.kind,
            defaultValue: 'line',
            options: [
              { value: 'line', label: i18n.line },
              { value: 'move', label: i18n.multipleSubpaths },
              { value: 'fold', label: i18n.fold },
              { value: 'cycle', label: i18n.cycle },
              { value: 'rectangle', label: i18n.rectangle },
            ],
          },
          {
            kind: 'select',
            id: 'via',
            label: i18n.via,
            defaultValue: '-|',
            visibleWhen: { controlId: 'actionKind', oneOf: ['fold'] },
            options: [
              { value: '-|', label: i18n.horizontalThenVertical },
              { value: '|-', label: i18n.verticalThenHorizontal },
              { value: '-|-', label: i18n.horizontalVerticalHorizontal },
              { value: '|-|', label: i18n.verticalHorizontalVertical },
            ],
          },
          {
            kind: 'range',
            id: 'fraction',
            label: i18n.fraction,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
            visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
          },
          {
            kind: 'range',
            id: 'cornerRadius',
            label: i18n.cornerradius,
            defaultValue: 12,
            min: 0,
            max: 40,
            step: 2,
            visibleWhen: { controlId: 'actionKind', oneOf: ['rectangle'] },
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const stepActionsControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { actionKind: 'line', via: '-|', fraction: 0.5, cornerRadius: 12 },
    relatedApis: ['Step.kind', 'Step.via', 'Step.fraction', 'Step.to'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
