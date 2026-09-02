import { EntityRole, GraphStatus } from '@retikz/graph';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Entity 样式 playground 使用的稳定字段 id */
export const EntityStyleControlId = {
  Role: 'role',
  Status: 'status',
  Content: 'content',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
  TextColor: 'textColor',
} as const;

/** Entity 样式 playground 的中文属性面板 */
export const entityStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity 样式',
  sections: [
    {
      label: 'Entity 语义',
      controls: [
        {
          kind: 'select',
          id: EntityStyleControlId.Role,
          label: '角色',
          defaultValue: EntityRole.Activity,
          options: [
            { value: EntityRole.Participant, label: '参与主体 - participant' },
            { value: EntityRole.Activity, label: '活动 - activity' },
            { value: EntityRole.Event, label: '事件 - event' },
            { value: EntityRole.State, label: '状态 - state' },
            { value: EntityRole.Gateway, label: '网关 - gateway' },
            { value: EntityRole.Resource, label: '资源 - resource' },
            { value: EntityRole.Concept, label: '概念 - concept' },
          ],
        },
        {
          kind: 'select',
          id: EntityStyleControlId.Status,
          label: '状态',
          defaultValue: GraphStatus.Warning,
          options: [
            { value: '', label: '无状态' },
            { value: GraphStatus.Error, label: '错误 - error' },
            { value: GraphStatus.Success, label: '成功 - success' },
            { value: GraphStatus.Warning, label: '警告 - warning' },
            { value: GraphStatus.Disabled, label: '禁用 - disabled' },
          ],
        },
      ],
    },
    {
      label: '节点内容',
      controls: [
        {
          kind: 'text',
          id: EntityStyleControlId.Content,
          label: '文本',
          defaultValue: 'Process Order',
          placeholder: '输入 Entity 文本',
          multiline: true,
        },
      ],
    },
    {
      label: '节点样式',
      controls: [
        { kind: 'color', id: EntityStyleControlId.Fill, label: '填充色', defaultValue: '#e2e8f0' },
        { kind: 'color', id: EntityStyleControlId.Stroke, label: '描边色', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: EntityStyleControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
        { kind: 'switch', id: EntityStyleControlId.Dashed, label: '虚线', defaultValue: false },
        {
          kind: 'range',
          id: EntityStyleControlId.Opacity,
          label: '透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
        { kind: 'color', id: EntityStyleControlId.TextColor, label: '文本色', defaultValue: '#0f172a' },
      ],
    },
  ],
});

/** Entity 样式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: entityStyleControls,
  canonicalValues: {
    role: EntityRole.Activity,
    status: GraphStatus.Warning,
    content: 'Process Order',
    fill: '#e2e8f0',
    stroke: '#2563eb',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
    textColor: '#0f172a',
  },
  relatedApis: [
    'Entity.role',
    'Entity.status',
    'Entity.children',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
    'Node.dashed',
    'Node.opacity',
    'Node.textColor',
  ],
} satisfies PreviewControlContract;
