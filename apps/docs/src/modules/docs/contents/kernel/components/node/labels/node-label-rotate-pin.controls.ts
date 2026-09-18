import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

export const NodeLabelRotatePinControlId = {
  RotateMode: 'rotateMode',
  RotateAngle: 'rotateAngle',
  KeepUpright: 'keepUpright',
  PinStyle: 'pinStyle',
  PinColor: 'pinColor',
  PinWidth: 'pinWidth',
  PinDashOffset: 'pinDashOffset',
} as const;

const visibleWhen = {
  RotateAngle: { controlId: NodeLabelRotatePinControlId.RotateMode, oneOf: ['angle'] },
  KeepUpright: { controlId: NodeLabelRotatePinControlId.RotateMode, oneOf: ['radial', 'tangent', 'angle'] },
  Pin: { controlId: NodeLabelRotatePinControlId.PinStyle, oneOf: ['solid', 'dashed'] },
  DashedPin: { controlId: NodeLabelRotatePinControlId.PinStyle, oneOf: ['dashed'] },
} as const;

export const nodeLabelRotatePinControls = definePreviewControls({
  presentation: 'panel',
  defaultSize: 50,
  title: '旋转与引线',
  sections: [
    {
      label: '文字朝向',
      controls: [
        {
          kind: 'select',
          id: NodeLabelRotatePinControlId.RotateMode,
          label: '旋转',
          defaultValue: 'angle',
          options: [
            { value: 'none', label: '不旋转' },
            { value: 'radial', label: '径向' },
            { value: 'tangent', label: '切向' },
            { value: 'angle', label: '显式角度' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelRotatePinControlId.RotateAngle,
          label: '旋转角度',
          defaultValue: 35,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: visibleWhen.RotateAngle,
        },
        {
          kind: 'switch',
          id: NodeLabelRotatePinControlId.KeepUpright,
          label: '保持正向',
          defaultValue: true,
          visibleWhen: visibleWhen.KeepUpright,
        },
      ],
    },
    {
      label: '外侧引线',
      controls: [
        {
          kind: 'select',
          id: NodeLabelRotatePinControlId.PinStyle,
          label: '引线',
          defaultValue: 'solid',
          options: [
            { value: 'none', label: '无引线' },
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
          ],
        },
        {
          kind: 'color',
          id: NodeLabelRotatePinControlId.PinColor,
          label: '引线颜色',
          defaultValue: '#2563eb',
          visibleWhen: visibleWhen.Pin,
        },
        {
          kind: 'range',
          id: NodeLabelRotatePinControlId.PinWidth,
          label: '引线粗细',
          defaultValue: 2,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: visibleWhen.Pin,
        },
        {
          kind: 'range',
          id: NodeLabelRotatePinControlId.PinDashOffset,
          label: '虚线偏移',
          defaultValue: 0,
          min: -8,
          max: 8,
          step: 1,
          visibleWhen: visibleWhen.DashedPin,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelRotatePinControls,
  canonicalValues: {
    rotateMode: 'angle',
    rotateAngle: 35,
    keepUpright: true,
    pinStyle: 'solid',
    pinColor: '#2563eb',
    pinWidth: 2,
    pinDashOffset: 0,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
