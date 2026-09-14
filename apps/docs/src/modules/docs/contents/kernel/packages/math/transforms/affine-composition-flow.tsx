import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

import { affineCompositionFlowI18n } from './affine-composition-flow.i18n';

/** 展示二维仿射矩阵的组合与应用顺序 */
export type AffineCompositionFlowI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<AffineCompositionFlowI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = affineCompositionFlowI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()} relationKinds={logicFigureRelationKinds}>
      <FlowLayout kind="linear" id="affine" direction="right" align="center">
        <FlowLayout kind="linear" id="composition" direction="right" align="center">
          <FlowLayout kind="linear" id="matrix-inputs" direction="down" align="center">
            <FlowEntities
              items={[
                { id: 'inner', text: i18n.label1, role: 'activity', kind: 'docs.logic.important' },
                { id: 'outer', text: i18n.label2, role: 'activity', kind: 'docs.logic.important' },
              ]}
            />
          </FlowLayout>
          <FlowEntities
            items={[{ id: 'compose', text: i18n.label3, role: 'activity', kind: 'docs.logic.important' }]}
          />
          <FlowEntities
            items={[{ id: 'combined-matrix', text: i18n.label4, role: 'activity', kind: 'docs.logic.important' }]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="application" direction="down" align="center" gap={32}>
          <FlowEntities items={[{ id: 'point', text: i18n.label5, role: 'participant' }]} />
          <FlowEntities items={[{ id: 'apply', text: i18n.label6, role: 'activity', kind: 'docs.logic.important' }]} />
          <FlowEntities items={[{ id: 'result', text: i18n.label7, role: 'participant' }]} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'inner', target: 'compose' },
          { source: 'outer', target: 'compose' },
          { source: 'compose', target: 'combined-matrix' },
          { source: 'point', target: 'apply' },
          {
            source: 'combined-matrix',
            target: 'apply',
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
          { source: 'apply', target: 'result' },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
