import type { PreviewControlContract } from '@/modules/docs/preview';

import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';
import { definePreviewControls } from '@/modules/docs/preview';

/** Entity 样式 playground 使用的稳定字段 id */
export const EntityStyleControlId = {
  Kind: 'kind',
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
          id: EntityStyleControlId.Kind,
          label: '类型',
          defaultValue: LogicFigureEntityKind.Algorithm,
          options: [
            { value: LogicFigureEntityKind.Important, label: '重要逻辑内容 - docs.logic.important' },
            { value: LogicFigureEntityKind.Secondary, label: '次要或背景内容 - docs.logic.secondary' },
            { value: LogicFigureEntityKind.Algorithm, label: '算法、高复杂度或性能逻辑 - docs.logic.algorithm' },
          ],
        },
        {
          kind: 'select',
          id: EntityStyleControlId.Status,
          label: '状态',
          defaultValue: '',
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
        { kind: 'color', id: EntityStyleControlId.Fill, label: '填充色', defaultValue: 'currentColor' },
        { kind: 'color', id: EntityStyleControlId.Stroke, label: '描边色', defaultValue: 'currentColor' },
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
    kind: LogicFigureEntityKind.Algorithm,
    status: '',
    content: 'Process Order',
    fill: 'currentColor',
    stroke: 'currentColor',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
    textColor: '#0f172a',
  },
  relatedApis: [
    'Entity.kind',
    'Entity.status',
    'Entity.children',
    'Node.style.fill',
    'Node.style.stroke',
    'Node.style.strokeWidth',
    'Node.style.dashed',
    'Node.style.opacity',
    'Node.style.textColor',
  ],
} satisfies PreviewControlContract;
import { GraphStatus } from '@retikz/graph';
