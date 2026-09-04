import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Block 自定义元素 playground 使用的稳定字段 id */
export const BlockCustomControlId = {
  Content: 'content',
  FontSize: 'fontSize',
  Shape: 'shape',
  Padding: 'padding',
  MinimumWidth: 'minimumWidth',
  MinimumHeight: 'minimumHeight',
  Rotate: 'rotate',
  CornerRadius: 'cornerRadius',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
  Shadow: 'shadow',
  TextColor: 'textColor',
} as const;

/** Block 自定义元素 playground 的稳定默认值 */
export const blockCustomCanonicalValues = {
  content: 'Cache hit rate 98.7%',
  fontSize: 'sm',
  shape: 'diamond',
  padding: 10,
  minimumWidth: 160,
  minimumHeight: 40,
  rotate: 0,
  cornerRadius: 6,
  fill: '#e2e8f0',
  stroke: '#64748b',
  strokeWidth: 1,
  dashed: false,
  opacity: 1,
  shadow: 'none',
  textColor: '#0f172a',
} as const;

/** 只在矩形 Node 上显示圆角控制 */
export const BlockCustomVisibleWhen = {
  CornerRadius: { controlId: BlockCustomControlId.Shape, oneOf: ['rectangle'] },
} as const;

/** Block 自定义元素的中文控制 */
export const blockCustomControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义元素',
  sections: [
    {
      label: '自定义节点',
      controls: [
        {
          kind: 'text',
          id: BlockCustomControlId.Content,
          label: '节点内容',
          defaultValue: blockCustomCanonicalValues.content,
          placeholder: '输入自定义节点内容',
        },
        {
          kind: 'select',
          id: BlockCustomControlId.FontSize,
          label: '字号',
          defaultValue: blockCustomCanonicalValues.fontSize,
          options: [
            { value: 'xs', label: 'XS' },
            { value: 'sm', label: 'SM' },
            { value: 'base', label: 'Base' },
            { value: 'lg', label: 'LG' },
          ],
        },
      ],
    },
    {
      label: '外形与尺寸',
      controls: [
        {
          kind: 'select',
          id: BlockCustomControlId.Shape,
          label: '形状',
          defaultValue: blockCustomCanonicalValues.shape,
          options: [
            { value: 'rectangle', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'diamond', label: '菱形' },
          ],
        },
        {
          kind: 'range',
          id: BlockCustomControlId.Padding,
          label: '内边距',
          defaultValue: blockCustomCanonicalValues.padding,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.MinimumWidth,
          label: '最小宽度',
          defaultValue: blockCustomCanonicalValues.minimumWidth,
          min: 80,
          max: 224,
          step: 8,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.MinimumHeight,
          label: '最小高度',
          defaultValue: blockCustomCanonicalValues.minimumHeight,
          min: 24,
          max: 96,
          step: 8,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.Rotate,
          label: '旋转',
          defaultValue: blockCustomCanonicalValues.rotate,
          min: -45,
          max: 45,
          step: 5,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.CornerRadius,
          label: '圆角',
          defaultValue: blockCustomCanonicalValues.cornerRadius,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: BlockCustomVisibleWhen.CornerRadius,
        },
      ],
    },
    {
      label: '外观',
      controls: [
        {
          kind: 'color',
          id: BlockCustomControlId.Fill,
          label: '填充色',
          defaultValue: blockCustomCanonicalValues.fill,
        },
        {
          kind: 'color',
          id: BlockCustomControlId.Stroke,
          label: '描边色',
          defaultValue: blockCustomCanonicalValues.stroke,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: blockCustomCanonicalValues.strokeWidth,
          min: 0,
          max: 6,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: BlockCustomControlId.Dashed,
          label: '虚线',
          defaultValue: blockCustomCanonicalValues.dashed,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.Opacity,
          label: '整体透明度',
          defaultValue: blockCustomCanonicalValues.opacity,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'select',
          id: BlockCustomControlId.Shadow,
          label: '阴影',
          defaultValue: blockCustomCanonicalValues.shadow,
          options: [
            { value: 'none', label: '无' },
            { value: 'sm', label: '小' },
            { value: 'md', label: '中' },
            { value: 'lg', label: '大' },
          ],
        },
        {
          kind: 'color',
          id: BlockCustomControlId.TextColor,
          label: '文本色',
          defaultValue: blockCustomCanonicalValues.textColor,
        },
      ],
    },
  ],
});

/** Block 自定义元素 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: blockCustomControls,
  canonicalValues: blockCustomCanonicalValues,
  relatedApis: [
    'Block.children',
    'Node.children',
    'Node.font',
    'Node.shape',
    'Node.padding',
    'Node.minimumSize',
    'Node.rotate',
    'Node.cornerRadius',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
    'Node.dashed',
    'Node.opacity',
    'Node.shadow',
    'Node.textColor',
  ],
} satisfies PreviewControlContract;
