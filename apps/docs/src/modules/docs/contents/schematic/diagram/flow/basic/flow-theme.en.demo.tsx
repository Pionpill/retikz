import type { ReactElement } from 'react';

import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { flowThemeControls, previewControlContract } from './flow-theme.en.controls';

/** Registers a fallback export for controls auto-discovery */
export const previewControls = flowThemeControls;

/** Renders the English Flow global configuration with the supplied controls */
export const renderFlowThemePreview = (values: PreviewControlValuesFor<typeof flowThemeControls>): ReactElement => (
  <FlowDiagram
    width={420}
    height={240}
    viewBox={{ x: -11.25, y: -64, width: 420, height: 240 }}
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
    <FlowEntity id="draft" text="Draft" role="state" />
    <FlowEntity id="review" text="Human review" role="activity" />
    <FlowEntity id="publish" text="Publish" role="event" />
    <FlowRelation source="draft" target="review" />
    <FlowRelation source="review" target="publish" />
  </FlowDiagram>
);

const controlledPreview = defineControlledPreview(previewControlContract, renderFlowThemePreview);

export const previewSource = controlledPreview.source;
export default controlledPreview.Component;
