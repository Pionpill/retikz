import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { text } from './update-reuse.i18n';

/** 机制图的语言选项 */
export type UpdateReuseProps = { lang?: Lang };

/** 展示增量更新的阶段与交接 */
const UpdateReuse: FC<UpdateReuseProps> = props => {
  const { lang = 'zh' } = props;
  const t = text[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="row-0" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'check',
                role: 'gateway',
                text: [{ text: t.check[0] }, { text: t.check[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={[
              {
                id: 'local',
                role: 'activity',
                text: [{ text: t.local[0] }, { text: t.local[1], font: { size: 12 }, fill: 'gray' }],
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
                id: 'merge',
                role: 'activity',
                text: [{ text: t.merge[0] }, { text: t.merge[1], font: { size: 12 }, fill: 'gray' }],
              },
              {
                id: 'replace',
                role: 'activity',
                text: [{ text: t.replace[0] }, { text: t.replace[1], font: { size: 12 }, fill: 'gray' }],
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          {
            source: 'check',
            target: 'local',
            label: { text: t.edge0[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'check',
            target: 'full',
            label: { text: t.edge1[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'local',
            target: 'merge',
            label: { text: t.edge2[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          { source: 'full', target: 'replace', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default UpdateReuse;
