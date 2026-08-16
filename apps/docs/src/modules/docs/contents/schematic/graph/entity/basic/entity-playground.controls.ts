import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Entity 综合试验场使用的稳定字段 id */
export const EntityPlaygroundControlId = {
  Role: 'role',
  Variant: 'variant',
  Color: 'color',
  Stroke: 'stroke',
  TextColor: 'textColor',
  Content: 'content',
} as const;

/** Entity 综合试验场的中文属性面板 */
export const entityPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity 试验场',
  sections: [
    {
      label: 'Entity 语义',
      controls: [
        {
          kind: 'select',
          id: EntityPlaygroundControlId.Role,
          label: '角色',
          defaultValue: 'stage',
          options: [
            { value: 'terminal', label: '终点' },
            { value: 'stage', label: '步骤' },
            { value: 'decision', label: '判断' },
            { value: 'junction', label: '汇合' },
          ],
        },
        {
          kind: 'select',
          id: EntityPlaygroundControlId.Variant,
          label: '视觉变体',
          defaultValue: 'default',
          options: [
            { value: 'default', label: '默认' },
            { value: 'fill', label: '填充' },
            { value: 'mixed', label: '混合' },
          ],
        },
      ],
    },
    {
      label: 'Node 视觉',
      controls: [
        { kind: 'color', id: EntityPlaygroundControlId.Color, label: '主色', defaultValue: 'currentColor' },
        { kind: 'color', id: EntityPlaygroundControlId.Stroke, label: '描边色', defaultValue: 'currentColor' },
        { kind: 'color', id: EntityPlaygroundControlId.TextColor, label: '文本色', defaultValue: 'currentColor' },
        {
          kind: 'text',
          id: EntityPlaygroundControlId.Content,
          label: '内容',
          defaultValue: 'Process',
          placeholder: '输入节点内容',
          multiline: true,
        },
      ],
    },
  ],
});

/** Entity 综合试验场的稳定文档契约 */
export const previewControlContract = {
  controls: entityPlaygroundControls,
  canonicalValues: {
    role: 'stage',
    variant: 'default',
    color: 'currentColor',
    stroke: 'currentColor',
    textColor: 'currentColor',
    content: 'Process',
  },
  relatedApis: ['Entity.role', 'Entity.variant', 'Node.color', 'Node.stroke', 'Node.textColor'],
} satisfies PreviewControlContract;
