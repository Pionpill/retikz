import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { text } from './update-implementation.i18n';

/** 机制图的语言选项 */
export type UpdateImplementationProps = { lang?: Lang };

/** 展示增量更新的阶段与交接 */
const UpdateImplementation: FC<UpdateImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const t = text[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="row-0" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'prepare',
                role: 'activity',
                text: [{ text: t.prepare[0] }, { text: t.prepare[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'runtime',
                role: 'activity',
                text: [{ text: t.runtime[0] }, { text: t.runtime[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'update',
                role: 'activity',
                text: [{ text: t.update[0] }, { text: t.update[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'full',
                role: 'activity',
                text: [{ text: t.full[0] }, { text: t.full[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-2" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'render',
                role: 'activity',
                text: [{ text: t.render[0] }, { text: t.render[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'publish',
                role: 'activity',
                text: [{ text: t.publish[0] }, { text: t.publish[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'prepare', target: 'runtime', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'runtime', target: 'update', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          {
            source: 'update',
            target: 'full',
            label: { text: t.edge0[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'update',
            target: 'render',
            label: { text: t.edge1[0], side: 'left', font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          { source: 'full', target: 'render', routing: { kind: 'orthogonal', turnPosition: 0.75, cornerRadius: 0 } },
          { source: 'render', target: 'publish', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default UpdateImplementation;
