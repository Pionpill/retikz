import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { coordinateConversionFlowI18n } from './coordinate-conversion-flow.i18n';
import {
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

/** 展示围绕 CenteredShape 的双向局部与世界坐标转换 */
export type CoordinateConversionFlowI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<CoordinateConversionFlowI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = coordinateConversionFlowI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout kind="linear" id="conversion" direction="right" align="center">
        <FlowEntities items={[{ id: 'local-point', text: i18n.label1, role: 'participant' }]} />
        <FlowLayout kind="linear" id="left-steps" direction="down" align="center">
          <FlowEntities
            items={[
              {
                id: 'rotate',
                text: i18n.label2,
                role: 'activity',
                group: 'local-to-world',
              },
              {
                id: 'inverse-rotate',
                text: i18n.label3,
                role: 'activity',
                group: 'world-to-local',
              },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[
            {
              id: 'centered-shape',
              text: i18n.label4,
              role: 'resource',
            },
          ]}
        />
        <FlowLayout kind="linear" id="right-steps" direction="down" align="center">
          <FlowEntities
            items={[
              {
                id: 'translate',
                text: i18n.label5,
                role: 'activity',
                group: 'local-to-world',
              },
              {
                id: 'remove-center',
                text: i18n.label6,
                role: 'activity',
                group: 'world-to-local',
              },
            ]}
          />
        </FlowLayout>
        <FlowEntities items={[{ id: 'world-point', text: i18n.label7, role: 'participant' }]} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'local-point', target: 'rotate', group: 'local-to-world' },
          { source: 'rotate', target: 'translate', group: 'local-to-world' },
          { source: 'translate', target: 'world-point', group: 'local-to-world' },
          { source: 'world-point', target: 'remove-center', group: 'world-to-local' },
          { source: 'remove-center', target: 'inverse-rotate', group: 'world-to-local' },
          { source: 'inverse-rotate', target: 'local-point', group: 'world-to-local' },
          {
            source: 'centered-shape',
            target: 'rotate',
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
          {
            source: 'centered-shape',
            target: 'translate',
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
          {
            source: 'centered-shape',
            target: 'remove-center',
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
          {
            source: 'centered-shape',
            target: 'inverse-rotate',
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
