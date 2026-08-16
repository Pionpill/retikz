import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** decision playground 使用的稳定字段 id */
export const EntityDecisionControlId = {
  Color: 'color',
  Variant: 'variant',
  Content: 'content',
} as const;

/** decision playground 的中文属性面板 */
export const entityDecisionControls = definePreviewControls({
  presentation: 'panel',
  title: '实体：条件判断',
  sections: [
    {
      label: '视觉与内容',
      controls: [
        { kind: 'color', id: EntityDecisionControlId.Color, label: '颜色', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: EntityDecisionControlId.Variant,
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
          id: EntityDecisionControlId.Content,
          label: '内部内容',
          defaultValue: 'Ready?',
          placeholder: '输入节点内容',
          multiline: true,
        },
      ],
    },
  ],
});

/** decision playground 的稳定文档契约 */
export const previewControlContract = {
  controls: entityDecisionControls,
  canonicalValues: { color: '#2563eb', variant: 'default', content: 'Ready?' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
