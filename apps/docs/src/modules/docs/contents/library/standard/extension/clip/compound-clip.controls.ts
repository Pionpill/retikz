import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 组合裁剪示例使用的稳定字段 id */
export const CompoundClipControlId = {
  Radius: 'radius',
  Offset: 'offset',
  FillRule: 'fillRule',
} as const;

/** 组合裁剪示例的中文属性面板 */
export const compoundClipControls = definePreviewControls({
  presentation: 'panel',
  title: '组合裁剪',
  sections: [
    {
      label: '子区域参数',
      controls: [
        {
          kind: 'range',
          id: CompoundClipControlId.Radius,
          label: '圆形半径',
          defaultValue: 58,
          min: 34,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CompoundClipControlId.Offset,
          label: '中心间距',
          defaultValue: 38,
          min: 16,
          max: 72,
          step: 2,
        },
      ],
    },
    {
      label: '组合参数',
      controls: [
        {
          kind: 'select',
          id: CompoundClipControlId.FillRule,
          label: '填充规则',
          defaultValue: 'evenodd',
          options: [
            { value: 'nonzero', label: '并合区域' },
            { value: 'evenodd', label: '排除重叠区' },
          ],
        },
      ],
    },
  ],
});

/** 组合裁剪示例的稳定文档契约 */
export const previewControlContract = {
  controls: compoundClipControls,
  canonicalValues: {
    radius: 58,
    offset: 38,
    fillRule: 'evenodd',
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRCompoundClip.children', 'IRCompoundClip.fillRule'],
} satisfies PreviewControlContract;
