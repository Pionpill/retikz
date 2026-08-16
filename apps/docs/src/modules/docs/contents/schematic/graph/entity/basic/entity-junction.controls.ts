import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** junction playground 使用的稳定字段 id */
export const EntityJunctionControlId = {
  Color: 'color',
  Variant: 'variant',
  Content: 'content',
} as const;

/** junction playground 的中文属性面板 */
export const entityJunctionControls = definePreviewControls({
  presentation: 'panel',
  title: '实体：分叉与汇合点',
  sections: [
    {
      label: '视觉与内容',
      controls: [
        { kind: 'color', id: EntityJunctionControlId.Color, label: '颜色', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: EntityJunctionControlId.Variant,
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
          id: EntityJunctionControlId.Content,
          label: '内部内容',
          defaultValue: '+',
          placeholder: '输入节点内容',
          multiline: true,
        },
      ],
    },
  ],
});

/** junction playground 的稳定文档契约 */
export const previewControlContract = {
  controls: entityJunctionControls,
  canonicalValues: { color: '#2563eb', variant: 'default', content: '+' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
