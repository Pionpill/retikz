import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 图元模型 playground 使用的稳定字段 id */
export const PrimitiveModelPlaygroundControlId = {
  Shape: 'shape',
  Content: 'content',
  Boundary: 'boundary',
  Fit: 'fit',
  Gap: 'gap',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  SourceAngle: 'sourceAngle',
} as const;

/** 只在对应的内置规则连接面下显示参数 */
export const PrimitiveModelPlaygroundVisibleWhen = {
  FittableBoundary: {
    controlId: PrimitiveModelPlaygroundControlId.Boundary,
    oneOf: ['circle', 'ellipse'],
  },
  RegularBoundary: {
    controlId: PrimitiveModelPlaygroundControlId.Boundary,
    oneOf: ['circle', 'rectangle', 'ellipse'],
  },
} as const;

const canonicalValues = {
  shape: 'star',
  content: 'Primitive\nNode',
  boundary: 'circle',
  fit: 'tight',
  gap: 0,
  fill: '#fbbf24',
  stroke: '#b45309',
  strokeWidth: 2,
  sourceAngle: -30,
} as const;

/** 图元模型的中文操作面板 */
export const primitiveModelPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '图元实验台',
  sections: [
    {
      label: '图元',
      controls: [
        {
          kind: 'select',
          id: PrimitiveModelPlaygroundControlId.Shape,
          label: 'shape',
          defaultValue: canonicalValues.shape,
          options: [
            { value: 'rectangle', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'diamond', label: '菱形' },
            { value: 'polygon', label: '六边形' },
            { value: 'star', label: '星形' },
            { value: 'sector', label: '扇环' },
            { value: 'arc', label: '圆弧' },
          ],
        },
        {
          kind: 'text',
          id: PrimitiveModelPlaygroundControlId.Content,
          label: '内容',
          defaultValue: canonicalValues.content,
          placeholder: '输入文字；回车换行',
          multiline: true,
        },
      ],
    },
    {
      label: '连接面',
      controls: [
        {
          kind: 'select',
          id: PrimitiveModelPlaygroundControlId.Boundary,
          label: 'boundary',
          defaultValue: canonicalValues.boundary,
          options: [
            { value: 'shape', label: '视觉形状' },
            { value: 'circle', label: '规则圆' },
            { value: 'rectangle', label: '规则矩形' },
            { value: 'ellipse', label: '规则椭圆' },
          ],
        },
        {
          kind: 'select',
          id: PrimitiveModelPlaygroundControlId.Fit,
          label: 'fit',
          defaultValue: canonicalValues.fit,
          options: [
            { value: 'tight', label: '贴合形状' },
            { value: 'bounds', label: '包住外接框' },
          ],
          visibleWhen: PrimitiveModelPlaygroundVisibleWhen.FittableBoundary,
        },
        {
          kind: 'range',
          id: PrimitiveModelPlaygroundControlId.Gap,
          label: 'gap',
          defaultValue: canonicalValues.gap,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: PrimitiveModelPlaygroundVisibleWhen.RegularBoundary,
        },
      ],
    },
    {
      label: '基础样式',
      controls: [
        {
          kind: 'color',
          id: PrimitiveModelPlaygroundControlId.Fill,
          label: 'fill',
          defaultValue: canonicalValues.fill,
        },
        {
          kind: 'color',
          id: PrimitiveModelPlaygroundControlId.Stroke,
          label: 'stroke',
          defaultValue: canonicalValues.stroke,
        },
        {
          kind: 'number',
          id: PrimitiveModelPlaygroundControlId.StrokeWidth,
          label: 'strokeWidth',
          defaultValue: canonicalValues.strokeWidth,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
    {
      label: '观察方向',
      controls: [
        {
          kind: 'range',
          id: PrimitiveModelPlaygroundControlId.SourceAngle,
          label: '来源角度',
          defaultValue: canonicalValues.sourceAngle,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
  ],
});

/** 图元模型 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: primitiveModelPlaygroundControls,
  canonicalValues,
  presets: [
    {
      id: 'text-container',
      label: '文本容器',
      values: { ...canonicalValues, shape: 'rectangle', content: 'Text\ncontainer', boundary: 'shape' },
    },
    { id: 'tight-star', label: '星形贴合圆', values: canonicalValues },
    {
      id: 'bounds-sector',
      label: '扇环外接圆',
      values: { ...canonicalValues, shape: 'sector', content: 'Sector', fit: 'bounds' },
    },
  ],
  relatedApis: [
    'Node.children',
    'Node.shape',
    'Node.boundary',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
    'Draw.way',
    'IRBoundary.params.fit',
    'IRBoundary.params.gap',
  ],
} satisfies PreviewControlContract;
