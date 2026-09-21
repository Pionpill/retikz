import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { wayCycleControlsI18n } from './way-cycle.i18n';

/** Way 闭合状态的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = wayCycleControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.closure,
    sections: [
      {
        label: i18n.path,
        controls: [
          {
            kind: 'select',
            id: 'state',
            label: i18n.pathState,
            defaultValue: 'open',
            options: [
              { value: 'open', label: i18n.openPath },
              { value: 'closed', label: i18n.closedPath },
            ],
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const wayCycleControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { state: 'open' },
    relatedApis: ['Draw.way'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
