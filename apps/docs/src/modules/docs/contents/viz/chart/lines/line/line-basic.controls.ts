import { PathCurve } from '@retikz/plot';

import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { lineData } from './line-basic.data';
import { lineBasicI18n } from './line-basic.i18n';

/** 在固定数据与位置尺度下比较路径连接和观测点 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = lineBasicI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.data,
              rows: lineData,
              columns: Object.keys(lineData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'point', label: text.point, defaultValue: false },
            {
              kind: 'range',
              id: 'pointSize',
              label: text.pointSize,
              defaultValue: 4,
              min: 0,
              max: 10,
              step: 0.5,
              visibleWhen: { controlId: 'point', oneOf: [true] },
            },
            { kind: 'switch', id: 'connectNulls', label: text.connectNulls, defaultValue: false },
            {
              kind: 'select',
              id: 'curve',
              label: text.curve,
              defaultValue: 'linear',
              options: Object.values(PathCurve).map(value => ({ value, label: text[value] })),
            },
            { kind: 'range', id: 'strokeWidth', label: text.width, defaultValue: 2, min: 0, max: 6, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: {
      point: false,
      pointSize: 4,
      connectNulls: false,
      curve: 'linear',
      strokeWidth: 2,
    } as const,
    relatedApis: ['LineProperties'],
  } satisfies PreviewControlContract;
};

/** 当前交互控件的值 */
export type LineDemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
