import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { flowThemeI18n } from './flow-theme.i18n';

/** 图形参数 */
export type FlowThemePreviewValues = {
  entityColor: string;
  entityFillOpacity: number;
  entityStrokeWidth: number;
  relationStroke: string;
  relationStrokeWidth: number;
  relationStrokeOpacity: number;
};

/** 用指定 controls 值渲染中文 Flow 全局配置 */
export const FlowThemePreview = (values: FlowThemePreviewValues, lang: Lang) => {
  const i18n = flowThemeI18n[lang];
  return (
    <FlowDiagram
      viewBox={
        lang === 'zh' ? { x: -71, y: -82.5, width: 420, height: 240 } : { x: -11.25, y: -64, width: 420, height: 240 }
      }
      flowDefaults={{
        entity: {
          style: {
            color: values.entityColor,
            fillOpacity: values.entityFillOpacity,
            strokeWidth: values.entityStrokeWidth,
          },
        },
        relation: {
          style: {
            stroke: values.relationStroke,
            strokeWidth: values.relationStrokeWidth,
            strokeOpacity: values.relationStrokeOpacity,
          },
        },
      }}
    >
      <FlowEntity id="draft" text={i18n.draft} role="state" />
      <FlowEntity id="review" text={i18n.review} role="activity" />
      <FlowEntity id="publish" text={i18n.publish} role="event" />
      <FlowRelation source="draft" target="review" />
      <FlowRelation source="review" target="publish" />
    </FlowDiagram>
  );
};
