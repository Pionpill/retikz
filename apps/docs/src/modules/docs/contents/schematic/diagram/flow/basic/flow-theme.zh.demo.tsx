import type { ReactElement } from 'react';

import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowThemeControls, previewControlContract } from './flow-theme.controls';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowThemeControls;

/** 用指定 controls 值渲染中文 Flow 全局配置 */
export const renderFlowThemePreview = (values: PreviewControlValuesFor<typeof flowThemeControls>): ReactElement => (
  <FlowDiagram
    width={420}
    height={240}
    viewBox={{ x: -71, y: -82.5, width: 420, height: 240 }}
    style={{ maxWidth: '100%', height: 'auto' }}
    flowTheme={{
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
    <FlowEntity id="draft" text="草稿" role="state" />
    <FlowEntity id="review" text="人工审核" role="activity" />
    <FlowEntity id="publish" text="发布" role="event" />
    <FlowRelation source="draft" target="review" />
    <FlowRelation source="review" target="publish" />
  </FlowDiagram>
);

const controlledPreview = defineControlledPreview(previewControlContract, renderFlowThemePreview);

export const previewSource = controlledPreview.source;
export default controlledPreview.Component;
