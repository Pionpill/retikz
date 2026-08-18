import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Graph Theme 选择器的稳定控件 id */
export const EntityThemeSelectorControlId = {
  Color: 'color',
  StrokeWidth: 'strokeWidth',
  Opacity: 'opacity',
  TargetRole: 'targetRole',
} as const;

/** Graph Theme 全局 token 的中文控制面板 */
export const entityThemeSelectorControls = definePreviewControls({
  presentation: 'panel',
  title: '主题 token',
  sections: [
    {
      label: '全局 token',
      controls: [
        {
          kind: 'color',
          id: EntityThemeSelectorControlId.Color,
          label: '主色',
          defaultValue: '#000000',
        },
        {
          kind: 'range',
          id: EntityThemeSelectorControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 1,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: EntityThemeSelectorControlId.Opacity,
          label: '整体不透明度',
          defaultValue: 1,
          min: 0.4,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: '单独控制',
      controls: [
        {
          kind: 'select',
          id: EntityThemeSelectorControlId.TargetRole,
          label: '目标 Entity',
          defaultValue: 'service',
          options: [
            { value: 'service', label: '服务' },
            { value: 'stage', label: '步骤' },
          ],
        },
      ],
    },
  ],
});

/** Graph Theme 选择器的稳定文档契约 */
export const previewControlContract = {
  controls: entityThemeSelectorControls,
  canonicalValues: {
    [EntityThemeSelectorControlId.Color]: '#000000',
    [EntityThemeSelectorControlId.StrokeWidth]: 2,
    [EntityThemeSelectorControlId.Opacity]: 1,
    [EntityThemeSelectorControlId.TargetRole]: 'service',
  },
  relatedApis: ['GraphThemeToken', 'Graph.graphThemeTokens', 'Graph.graphThemeTokenRules'],
} satisfies PreviewControlContract;
