import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Node 几何 playground 使用的稳定字段 id */
export const NodeGeometryControlId = {
  PaddingX: 'paddingX',
  PaddingY: 'paddingY',
  Margin: 'margin',
  MinimumWidth: 'minimumWidth',
  MinimumHeight: 'minimumHeight',
  CornerRadius: 'cornerRadius',
  Scale: 'scale',
  Rotate: 'rotate',
} as const;

/** Node 几何 playground 的固定取景与可调节点位置 */
export const nodeGeometryFrame = {
  viewBox: { x: -250, y: -150, width: 500, height: 300 },
  subjectPosition: [80, 0],
} as const;

/** Node 尺寸与变换的中文属性面板 */
export const nodeGeometryControls = definePreviewControls({
  presentation: 'panel',
  title: '几何',
  sections: [
    {
      label: '间距与尺寸',
      controls: [
        {
          kind: 'range',
          id: NodeGeometryControlId.PaddingX,
          label: '水平 padding',
          defaultValue: 18,
          min: 0,
          max: 36,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.PaddingY,
          label: '垂直 padding',
          defaultValue: 10,
          min: 0,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.Margin,
          label: 'margin',
          defaultValue: 8,
          min: 0,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.MinimumWidth,
          label: '最小宽度',
          defaultValue: 40,
          min: 40,
          max: 140,
          step: 10,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.MinimumHeight,
          label: '最小高度',
          defaultValue: 24,
          min: 24,
          max: 72,
          step: 4,
        },
      ],
    },
    {
      label: '外形与变换',
      controls: [
        {
          kind: 'range',
          id: NodeGeometryControlId.CornerRadius,
          label: '圆角',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.Scale,
          label: '缩放',
          defaultValue: 1,
          min: 0.5,
          max: 1.4,
          step: 0.1,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.Rotate,
          label: '旋转',
          defaultValue: 0,
          min: -90,
          max: 90,
          step: 5,
        },
      ],
    },
  ],
});
