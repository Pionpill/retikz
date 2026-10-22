import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { text } from './update-commit.i18n';

/** 机制图的语言选项 */
export type UpdateCommitProps = { lang?: Lang };

/** 展示增量更新的阶段与交接 */
const UpdateCommit: FC<UpdateCommitProps> = props => {
  const { lang = 'zh' } = props;
  const t = text[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="row-0" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'candidate',
                role: 'state',
                text: [{ text: t.candidate[0] }, { text: t.candidate[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'prepare',
                role: 'activity',
                text: [{ text: t.prepare[0] }, { text: t.prepare[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'commit',
                role: 'activity',
                text: [{ text: t.commit[0] }, { text: t.commit[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'publish',
                role: 'activity',
                text: [{ text: t.publish[0] }, { text: t.publish[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-2" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'rollback',
                role: 'activity',
                text: [{ text: t.rollback[0] }, { text: t.rollback[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'broken',
                role: 'activity',
                text: [{ text: t.broken[0] }, { text: t.broken[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'candidate', target: 'prepare', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          {
            source: 'prepare',
            target: 'commit',
            label: { text: t.edge0[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'commit',
            target: 'publish',
            label: { text: t.edge1[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'commit',
            target: 'rollback',
            label: { text: t.edge2[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'rollback',
            target: 'broken',
            label: { text: t.edge3[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default UpdateCommit;
