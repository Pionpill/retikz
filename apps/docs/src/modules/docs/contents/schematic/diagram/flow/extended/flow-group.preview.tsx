import { FlowEntity, FlowGroup, FlowRelation } from '@retikz/diagram-react/flow';
import type { FlowDirection } from '@retikz/diagram/flow';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-group.controls';
import { flowGroupI18n } from './flow-group.i18n';

const directions: ReadonlyArray<FlowDirection> = ['up', 'right', 'down', 'left'];

/** 将面板值收窄为公开的 Flow 排布方向 */
const directionOf = (value: string): FlowDirection => {
  const direction = directions.find(candidate => candidate === value);
  if (direction === undefined) throw new Error(`Unsupported Flow direction: ${value}`);
  return direction;
};

/** 在同一个 Group 中展示标题、描述、边界标签与自动排布 */
export const renderFlowGroupPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  lang: Lang,
): ReactElement => {
  const copy = flowGroupI18n[lang];
  return (
    <PreviewFlowDiagram>
      <FlowGroup
        id="service"
        {...(values.showTitle || values.showDescription
          ? {
              caption: {
                direction: 'vertical',
                ...(values.showTitle ? { title: { text: copy.service } } : {}),
                ...(values.showDescription ? { description: { text: copy.description } } : {}),
              },
            }
          : {})}
        {...(values.showLabels
          ? { labels: [{ text: copy.boundary, position: 'bottom', align: 'middle', distance: 8 }] }
          : {})}
        layout={{ direction: directionOf(values.direction), nodeGap: values.nodeGap, rankGap: values.rankGap }}
      >
        <FlowEntity id="request" text={copy.request} role="gateway" />
        <FlowEntity id="validate" text={copy.validate} role="activity" />
        <FlowEntity id="authorize" text={copy.authorize} role="activity" />
      </FlowGroup>
      <FlowRelation source="request" target="validate" />
      <FlowRelation source="request" target="authorize" />
    </PreviewFlowDiagram>
  );
};
