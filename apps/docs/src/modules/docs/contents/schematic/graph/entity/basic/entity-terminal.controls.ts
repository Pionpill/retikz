import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** terminal playground 使用的稳定字段 id */
export const EntityTerminalControlId = {
  Color: 'color',
  Variant: 'variant',
  Content: 'content',
} as const;

/** terminal playground 的中文属性面板 */
export const entityTerminalControls = definePreviewControls({
  presentation: 'panel',
  title: '实体：终点',
  sections: [
    {
      label: '视觉与内容',
      controls: [
        { kind: 'color', id: EntityTerminalControlId.Color, label: '颜色', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: EntityTerminalControlId.Variant,
          label: '视觉变体',
          defaultValue: 'default',
          options: [
            { value: 'default', label: '默认' },
            { value: 'primary', label: '主要' },
            { value: 'secondary', label: '次要' },
            { value: 'outline', label: '轮廓' },
            { value: 'vibrant', label: '鲜明' },
          ],
        },
        {
          kind: 'text',
          id: EntityTerminalControlId.Content,
          label: '内部内容',
          defaultValue: 'Start',
          placeholder: '输入节点内容',
          multiline: true,
        },
      ],
    },
  ],
});

/** terminal playground 的稳定文档契约 */
export const previewControlContract = {
  controls: entityTerminalControls,
  canonicalValues: { color: '#2563eb', variant: 'default', content: 'Start' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
