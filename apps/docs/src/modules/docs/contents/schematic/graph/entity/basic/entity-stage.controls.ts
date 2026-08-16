import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** stage playground 使用的稳定字段 id */
export const EntityStageControlId = {
  Color: 'color',
  Variant: 'variant',
  Content: 'content',
} as const;

/** stage playground 的中文属性面板 */
export const entityStageControls = definePreviewControls({
  presentation: 'panel',
  title: '实体：处理步骤',
  sections: [
    {
      label: '视觉与内容',
      controls: [
        { kind: 'color', id: EntityStageControlId.Color, label: '颜色', defaultValue: 'currentColor' },
        {
          kind: 'select',
          id: EntityStageControlId.Variant,
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
          id: EntityStageControlId.Content,
          label: '内部内容',
          defaultValue: 'Process',
          placeholder: '输入节点内容',
          multiline: true,
        },
      ],
    },
  ],
});

/** stage playground 的稳定文档契约 */
export const previewControlContract = {
  controls: entityStageControls,
  canonicalValues: { color: 'currentColor', variant: 'default', content: 'Process' },
  relatedApis: ['Node.color', 'Entity.variant', 'Node.children'],
} satisfies PreviewControlContract;
