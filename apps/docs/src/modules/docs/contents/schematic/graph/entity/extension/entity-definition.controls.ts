import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Entity predicate demo 使用的稳定字段 id */
export const EntityDefinitionControlId = {
  Status: 'status',
  Critical: 'critical',
  Content: 'content',
} as const;

/** Entity predicate demo 的中文属性面板 */
export const entityDefinitionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Entity predicate',
  sections: [
    {
      label: 'Predicate params',
      controls: [
        {
          kind: 'select',
          id: EntityDefinitionControlId.Status,
          label: '服务状态',
          defaultValue: 'available',
          options: [
            { value: 'available', label: '可用' },
            { value: 'degraded', label: '降级' },
            { value: 'offline', label: '离线' },
          ],
        },
        {
          kind: 'switch',
          id: EntityDefinitionControlId.Critical,
          label: '关键服务',
          defaultValue: false,
        },
      ],
    },
    {
      label: '文本',
      controls: [
        {
          kind: 'text',
          id: EntityDefinitionControlId.Content,
          label: '文本',
          defaultValue: 'API Gateway',
          placeholder: '输入 Entity 文本',
        },
      ],
    },
  ],
});

/** Entity predicate demo 的稳定文档契约 */
export const previewControlContract = {
  controls: entityDefinitionControls,
  canonicalValues: {
    status: 'available',
    critical: false,
    content: 'API Gateway',
  },
  relatedApis: ['Entity.predicate.params', 'defineEntityPredicate.paramsSchema', 'GraphThemeLayer.rules'],
} satisfies PreviewControlContract;
