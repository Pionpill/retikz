import { RelationRole } from '@retikz/graph';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Relation 样式 playground 使用的稳定字段 id */
export const RelationStyleControlId = {
  Role: 'role',
  Content: 'content',
  SourceColor: 'sourceColor',
  TargetColor: 'targetColor',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
  LabelTextColor: 'labelTextColor',
  LabelOpacity: 'labelOpacity',
} as const;

/** Relation 样式 playground 的中文属性面板 */
export const relationStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Relation 样式',
  sections: [
    {
      label: 'Relation 语义',
      controls: [
        {
          kind: 'select',
          id: RelationStyleControlId.Role,
          label: '角色',
          defaultValue: RelationRole.Flow,
          options: [
            { value: RelationRole.Association, label: '关联 - association' },
            { value: RelationRole.Dependency, label: '依赖 - dependency' },
            { value: RelationRole.Generalization, label: '泛化 - generalization' },
            { value: RelationRole.Flow, label: '流动 - flow' },
            { value: RelationRole.Influence, label: '影响 - influence' },
          ],
        },
      ],
    },
    {
      label: '关系标签',
      controls: [
        {
          kind: 'text',
          id: RelationStyleControlId.Content,
          label: '文本',
          defaultValue: 'Next step',
          placeholder: '输入 Relation 文本',
          multiline: true,
        },
      ],
    },
    {
      label: '起点对象',
      controls: [
        {
          kind: 'color',
          id: RelationStyleControlId.SourceColor,
          label: '颜色',
          defaultValue: 'currentColor',
        },
      ],
    },
    {
      label: '终点对象',
      controls: [
        {
          kind: 'color',
          id: RelationStyleControlId.TargetColor,
          label: '颜色',
          defaultValue: 'currentColor',
        },
      ],
    },
    {
      label: '路径样式',
      controls: [
        { kind: 'color', id: RelationStyleControlId.Stroke, label: '描边色', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: RelationStyleControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
        { kind: 'switch', id: RelationStyleControlId.Dashed, label: '虚线', defaultValue: false },
        {
          kind: 'range',
          id: RelationStyleControlId.Opacity,
          label: '透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '标签样式',
      controls: [
        {
          kind: 'color',
          id: RelationStyleControlId.LabelTextColor,
          label: '文本色',
          defaultValue: '#334155',
        },
        {
          kind: 'range',
          id: RelationStyleControlId.LabelOpacity,
          label: '文本透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Relation 样式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: relationStyleControls,
  canonicalValues: {
    role: RelationRole.Flow,
    content: 'Next step',
    sourceColor: 'currentColor',
    targetColor: 'currentColor',
    stroke: '#2563eb',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
    labelTextColor: '#334155',
    labelOpacity: 1,
  },
  relatedApis: [
    'Relation.role',
    'Relation.labels',
    'Entity.color',
    'Relation.stroke',
    'Relation.strokeWidth',
    'Relation.dashPattern',
    'Relation.opacity',
    'Relation.labelTextForeground',
    'Relation.labelOpacity',
  ],
} satisfies PreviewControlContract;
