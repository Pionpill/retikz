import { PathCurve } from '@retikz/plot';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { stackArea } from './line-stack-area.data';

/** 堆叠面积连接方式 playground 的稳定控件 id */
export const LINE_STACK_AREA_CURVE_ID = 'line-stack-area-curve';

/** 堆叠面积连接方式的中文属性面板 */
export const lineStackAreaControls = definePreviewControls({
  presentation: 'panel',
  title: '堆叠面积',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'stackArea', label: '堆叠面积', rows: stackArea }],
    },
    {
      label: '连接',
      controls: [
        {
          kind: 'select',
          id: LINE_STACK_AREA_CURVE_ID,
          label: '连接方式',
          defaultValue: PathCurve.Linear,
          options: [
            { value: PathCurve.Linear, label: '直线' },
            { value: PathCurve.Step, label: '阶梯' },
            { value: PathCurve.CatmullRom, label: '穿点平滑' },
          ],
        },
      ],
    },
  ],
});

/** 堆叠面积连接方式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineStackAreaControls,
  canonicalValues: { [LINE_STACK_AREA_CURVE_ID]: PathCurve.Linear },
  relatedApis: ['PathMark.closure', 'PathMark.series', 'PathMark.curve'],
} satisfies PreviewControlContract;
