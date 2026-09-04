import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Flow 全局配置 demo 的稳定 control id */
export const FlowThemeControlId = {
  EntityColor: 'entityColor',
  EntityFillOpacity: 'entityFillOpacity',
  EntityStrokeWidth: 'entityStrokeWidth',
  RelationStroke: 'relationStroke',
  RelationStrokeWidth: 'relationStrokeWidth',
  RelationStrokeOpacity: 'relationStrokeOpacity',
} as const;

type FlowThemeControlCopy = Readonly<{
  title: string;
  entitySection: string;
  entityColorLabel: string;
  entityFillOpacityLabel: string;
  entityStrokeWidthLabel: string;
  relationSection: string;
  relationStrokeLabel: string;
  relationStrokeWidthLabel: string;
  relationStrokeOpacityLabel: string;
}>;

/** 建立双语同构的 Flow 全局配置 controls 契约 */
export const defineFlowThemeControlContract = (copy: FlowThemeControlCopy) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.entitySection,
        controls: [
          {
            kind: 'color',
            id: FlowThemeControlId.EntityColor,
            label: copy.entityColorLabel,
            defaultValue: '#334155',
          },
          {
            kind: 'range',
            id: FlowThemeControlId.EntityFillOpacity,
            label: copy.entityFillOpacityLabel,
            defaultValue: 1,
            min: 0.2,
            max: 1,
            step: 0.1,
          },
          {
            kind: 'range',
            id: FlowThemeControlId.EntityStrokeWidth,
            label: copy.entityStrokeWidthLabel,
            defaultValue: 1,
            min: 1,
            max: 4,
            step: 0.5,
          },
        ],
      },
      {
        label: copy.relationSection,
        controls: [
          {
            kind: 'color',
            id: FlowThemeControlId.RelationStroke,
            label: copy.relationStrokeLabel,
            defaultValue: '#64748b',
          },
          {
            kind: 'range',
            id: FlowThemeControlId.RelationStrokeWidth,
            label: copy.relationStrokeWidthLabel,
            defaultValue: 1,
            min: 1,
            max: 4,
            step: 0.5,
          },
          {
            kind: 'range',
            id: FlowThemeControlId.RelationStrokeOpacity,
            label: copy.relationStrokeOpacityLabel,
            defaultValue: 0.9,
            min: 0.2,
            max: 1,
            step: 0.1,
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      entityColor: '#334155',
      entityFillOpacity: 1,
      entityStrokeWidth: 1,
      relationStroke: '#64748b',
      relationStrokeWidth: 1,
      relationStrokeOpacity: 0.9,
    },
    relatedApis: [
      'FlowDiagram.flowTheme.entity.style.color',
      'FlowDiagram.flowTheme.entity.style.fillOpacity',
      'FlowDiagram.flowTheme.entity.style.strokeWidth',
      'FlowDiagram.flowTheme.relation.style.stroke',
      'FlowDiagram.flowTheme.relation.style.strokeWidth',
      'FlowDiagram.flowTheme.relation.style.strokeOpacity',
    ],
  } satisfies PreviewControlContract;
};

/** Flow 全局配置 demo 的中文 controls 契约 */
export const previewControlContract = defineFlowThemeControlContract({
  title: '全局配置',
  entitySection: '全部 Entity',
  entityColorLabel: '颜色',
  entityFillOpacityLabel: '填充透明度',
  entityStrokeWidthLabel: '描边宽度',
  relationSection: '全部 Relation',
  relationStrokeLabel: '线条颜色',
  relationStrokeWidthLabel: '线条宽度',
  relationStrokeOpacityLabel: '线条透明度',
});

/** Flow 全局配置 demo 的中文 controls */
export const flowThemeControls = previewControlContract.controls;
