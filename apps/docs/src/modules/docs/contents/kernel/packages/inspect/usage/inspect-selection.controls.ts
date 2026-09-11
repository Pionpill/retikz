import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Inspect selection playground 使用的稳定字段 id */
export const InspectSelectionControlId = {
  Target: 'target',
  ControlPoints: 'controlPoints',
  Labels: 'labels',
  BarrierRight: 'barrierRight',
} as const;

/** Inspect selection playground 使用的目标集合 */
export const InspectSelectionTarget = {
  Left: 'left',
  Right: 'right',
  Both: 'both',
} as const;

/** Inspector 选择、选项与 barrier 的中文面板 */
export const inspectSelectionControls = definePreviewControls({
  presentation: 'panel',
  title: '检查范围',
  sections: [
    {
      label: '选择',
      controls: [
        {
          kind: 'select',
          id: InspectSelectionControlId.Target,
          label: '检查路径',
          defaultValue: InspectSelectionTarget.Both,
          options: [
            { value: InspectSelectionTarget.Left, label: '左侧路径' },
            { value: InspectSelectionTarget.Right, label: '右侧路径' },
            { value: InspectSelectionTarget.Both, label: '两条路径' },
          ],
        },
        {
          kind: 'switch',
          id: InspectSelectionControlId.ControlPoints,
          label: '控制点',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: InspectSelectionControlId.Labels,
          label: '控制点标签',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: InspectSelectionControlId.BarrierRight,
          label: '屏蔽右侧子树',
          defaultValue: false,
        },
      ],
    },
  ],
});

/** Inspect selection playground 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: inspectSelectionControls,
  canonicalValues: {
    target: InspectSelectionTarget.Both,
    controlPoints: true,
    labels: true,
    barrierRight: false,
  },
  relatedApis: ['InspectPath.request', 'InspectScope.request', 'StrokePathInspectOptionsInputSchema'],
} satisfies PreviewControlContract;
