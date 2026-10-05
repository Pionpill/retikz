import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowThemeI18n } from './flow-theme.i18n';

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
    defaultSize: 50,
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
      'FlowDiagram.flowDefaults.entity.style.color',
      'FlowDiagram.flowDefaults.entity.style.fillOpacity',
      'FlowDiagram.flowDefaults.entity.style.strokeWidth',
      'FlowDiagram.flowDefaults.relation.style.stroke',
      'FlowDiagram.flowDefaults.relation.style.strokeWidth',
      'FlowDiagram.flowDefaults.relation.style.strokeOpacity',
    ],
  } satisfies PreviewControlContract;
};

/** 按当前文档语言建立面板契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  defineFlowThemeControlContract(flowThemeI18n[lang].controls);

export const previewControlContract = createPreviewControlContract();

export const flowThemeControls = previewControlContract.controls;
