import { FlowEntity, FlowGroup, FlowLayout, FlowRelation } from '@retikz/diagram-react/flow';
import type { FlowDirectionValue, FlowLayoutAlignmentValue } from '@retikz/diagram/flow';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { flowCompoundI18n } from './flow-compound.i18n';

/** 图形参数 */
export type FlowCompoundPreviewValues = {
  groupDirection: string;
  groupNodeGap: number;
  groupRankGap: number;
  layoutDirection: string;
  layoutGap: number;
  layoutAlign: string;
};

const flowDirections: ReadonlyArray<FlowDirectionValue> = ['up', 'right', 'down', 'left'];
const flowLayoutAlignments: ReadonlyArray<FlowLayoutAlignmentValue> = ['start', 'center', 'end'];

/** 将 controls 值收窄为公开 Flow direction */
const flowDirectionOf = (value: string): FlowDirectionValue => {
  const direction = flowDirections.find(candidate => candidate === value);
  if (direction === undefined) throw new Error(`Unsupported Flow direction: ${value}`);
  return direction;
};

/** 将 controls 值收窄为公开 Flow Layout alignment */
const flowLayoutAlignmentOf = (value: string): FlowLayoutAlignmentValue => {
  const alignment = flowLayoutAlignments.find(candidate => candidate === value);
  if (alignment === undefined) throw new Error(`Unsupported Flow Layout alignment: ${value}`);
  return alignment;
};

/** 用指定 controls 值渲染中文 Flow 分组排布 */
export const FlowCompoundPreview = (values: FlowCompoundPreviewValues, lang: Lang) => {
  const i18n = flowCompoundI18n[lang];
  return (
    <FlowDiagram viewBox={{ x: -100, y: -86, width: 400, height: 460 }}>
      <FlowLayout kind="linear" id="sections" direction="down" gap={28} align="center">
        <FlowGroup
          id="service"
          caption={{ title: { text: i18n.serviceEntry } }}
          layout={{
            direction: flowDirectionOf(values.groupDirection),
            nodeGap: values.groupNodeGap,
            rankGap: values.groupRankGap,
          }}
        >
          <FlowEntity id="request" text={i18n.request} role="gateway" />
          <FlowEntity id="validate" text={i18n.validate} role="activity" />
          <FlowEntity id="authorize" text={i18n.authorize} role="activity" />
        </FlowGroup>
        <FlowLayout
          kind="linear"
          id="storage"
          direction={flowDirectionOf(values.layoutDirection)}
          gap={values.layoutGap}
          align={flowLayoutAlignmentOf(values.layoutAlign)}
        >
          <FlowEntity id="queue" text={i18n.queue} role="state" />
          <FlowEntity id="database" text={i18n.database} role="resource" />
        </FlowLayout>
      </FlowLayout>
      <FlowRelation source="request" target="validate" />
      <FlowRelation source="request" target="authorize" />
      <FlowRelation source="service" target="queue" />
      <FlowRelation source="queue" target="database" />
    </FlowDiagram>
  );
};
