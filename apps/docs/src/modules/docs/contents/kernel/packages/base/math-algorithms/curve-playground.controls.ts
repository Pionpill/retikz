import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 曲线 playground 的稳定字段 id */
export const CurvePlaygroundControlId = {
  PointSet: 'pointSet',
  ControlPoint: 'controlPoint',
  Tension: 'tension',
} as const;

/** 点集与张力的中文属性面板 */
export const curvePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '过点曲线',
  sections: [
    {
      label: '输入',
      controls: [
        {
          kind: 'select',
          id: CurvePlaygroundControlId.PointSet,
          label: '点集',
          defaultValue: 'uneven',
          options: [
            { value: 'uneven', label: '不均匀间距' },
            { value: 'zigzag', label: '折返' },
            { value: 'coincident', label: '含重合点' },
          ],
        },
        {
          kind: 'point',
          id: CurvePlaygroundControlId.ControlPoint,
          label: '控制点',
          defaultValue: [-25, 15],
          min: [-150, -80],
          max: [150, 80],
          step: 5,
        },
        {
          kind: 'range',
          id: CurvePlaygroundControlId.Tension,
          label: '张力',
          defaultValue: 1,
          min: 0.2,
          max: 2,
          step: 0.1,
        },
      ],
    },
  ],
});

/** 曲线 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: curvePlaygroundControls,
  canonicalValues: { pointSet: 'uneven', controlPoint: [-25, 15], tension: 1 },
  presets: [
    { id: 'uneven', label: '不均匀点距', values: { pointSet: 'uneven', tension: 1 } },
    { id: 'zigzag', label: '折返曲线', values: { pointSet: 'zigzag', tension: 0.7 } },
    { id: 'coincident', label: '重合点退化', values: { pointSet: 'coincident', tension: 1 } },
  ],
  relatedApis: ['curve.catmullRomToCubic', 'CubicSegment'],
} satisfies PreviewControlContract;
