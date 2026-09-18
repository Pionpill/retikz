import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

export const NodeLabelPositionControlId = {
  PositionMode: 'positionMode',
  Direction: 'direction',
  PositionAngle: 'positionAngle',
  Boundary: 'boundary',
  Fraction: 'fraction',
} as const;

const visibleWhen = {
  Direction: { controlId: NodeLabelPositionControlId.PositionMode, oneOf: ['direction'] },
  PositionAngle: { controlId: NodeLabelPositionControlId.PositionMode, oneOf: ['angle'] },
  Boundary: { controlId: NodeLabelPositionControlId.PositionMode, oneOf: ['boundary'] },
} as const;

export const nodeLabelPositionControls = definePreviewControls({
  presentation: 'panel',
  title: '标签位置',
  sections: [
    {
      label: '附着位置',
      controls: [
        {
          kind: 'select',
          id: NodeLabelPositionControlId.PositionMode,
          label: '写法',
          defaultValue: 'direction',
          options: [
            { value: 'direction', label: '命名方位' },
            { value: 'angle', label: '数字角度' },
            { value: 'boundary', label: '边界比例' },
            { value: 'center', label: '中心' },
          ],
        },
        {
          kind: 'select',
          id: NodeLabelPositionControlId.Direction,
          label: '方位',
          defaultValue: 'right',
          visibleWhen: visibleWhen.Direction,
          options: [
            { value: 'top', label: '上' },
            { value: 'right', label: '右' },
            { value: 'bottom', label: '下' },
            { value: 'left', label: '左' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelPositionControlId.PositionAngle,
          label: '角度',
          defaultValue: 30,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: visibleWhen.PositionAngle,
        },
        {
          kind: 'select',
          id: NodeLabelPositionControlId.Boundary,
          label: '边界',
          defaultValue: 'top',
          visibleWhen: visibleWhen.Boundary,
          options: [
            { value: 'top', label: '上边' },
            { value: 'right', label: '右边' },
            { value: 'bottom', label: '下边' },
            { value: 'left', label: '左边' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelPositionControlId.Fraction,
          label: '比例',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: visibleWhen.Boundary,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelPositionControls,
  canonicalValues: {
    positionMode: 'direction',
    direction: 'right',
    positionAngle: 30,
    boundary: 'top',
    fraction: 0.5,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
