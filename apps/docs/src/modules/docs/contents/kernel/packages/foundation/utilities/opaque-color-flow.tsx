import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

import { opaqueColorFlowI18n } from './opaque-color-flow.i18n';

/** 展示 compositeOpaqueColor 的正常解析与预合成链路 */
export type OpaqueColorFlowI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<OpaqueColorFlowI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = opaqueColorFlowI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout kind="linear" id="rows" direction="down" align="center">
        <FlowLayout kind="linear" id="prepare" direction="right" align="center">
          <FlowEntities
            items={[
              { id: 'inputs', text: i18n.label1, role: 'participant' },
              {
                id: 'weight',
                text: i18n.label2,
                role: 'activity',
              },
              { id: 'parse', text: i18n.label3, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'colors', text: i18n.label4, role: 'resource', kind: LogicFigureEntityKind.Secondary },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="compose-row" direction="right" align="center">
          <FlowEntities
            items={[
              {
                id: 'backdrop',
                text: i18n.label5,
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
              { id: 'compose', text: i18n.label6, role: 'activity', kind: LogicFigureEntityKind.Algorithm },
              { id: 'output', text: '#rrggbb', role: 'participant' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'inputs', target: 'weight' },
          { source: 'weight', target: 'parse' },
          {
            source: 'colors',
            target: 'parse',
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
          {
            source: 'parse',
            target: 'backdrop',
            routing: { kind: 'orthogonal', cornerRadius: 8 },
          },
          { source: 'backdrop', target: 'compose' },
          { source: 'compose', target: 'output' },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
