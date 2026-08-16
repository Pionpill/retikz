import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 路径裁剪示例使用的稳定字段 id */
export const PathClipControlId = {
  TipX: 'tipX',
  NotchX: 'notchX',
  HalfHeight: 'halfHeight',
  HoleSize: 'holeSize',
  FillRule: 'fillRule',
} as const;

/** 路径裁剪示例的中文属性面板 */
export const pathClipControls = definePreviewControls({
  presentation: 'panel',
  title: '路径裁剪',
  sections: [
    {
      label: '命令坐标',
      controls: [
        {
          kind: 'range',
          id: PathClipControlId.TipX,
          label: '箭头尖端',
          defaultValue: 78,
          min: 48,
          max: 92,
          step: 2,
        },
        {
          kind: 'range',
          id: PathClipControlId.NotchX,
          label: '尾部凹口',
          defaultValue: -38,
          min: -58,
          max: -18,
          step: 2,
        },
        {
          kind: 'range',
          id: PathClipControlId.HalfHeight,
          label: '轮廓半高',
          defaultValue: 50,
          min: 32,
          max: 66,
          step: 2,
        },
        {
          kind: 'range',
          id: PathClipControlId.HoleSize,
          label: '中心孔径',
          defaultValue: 14,
          min: 6,
          max: 24,
          step: 2,
        },
      ],
    },
    {
      label: '填充规则',
      controls: [
        {
          kind: 'select',
          id: PathClipControlId.FillRule,
          label: '规则',
          defaultValue: 'evenodd',
          options: [
            { value: 'nonzero', label: '非零环绕' },
            { value: 'evenodd', label: '奇偶规则' },
          ],
        },
      ],
    },
  ],
});

/** 路径裁剪示例的稳定文档契约 */
export const previewControlContract = {
  controls: pathClipControls,
  canonicalValues: {
    tipX: 78,
    notchX: -38,
    halfHeight: 50,
    holeSize: 14,
    fillRule: 'evenodd',
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRPathClip.commands', 'IRPathClip.fillRule'],
} satisfies PreviewControlContract;
