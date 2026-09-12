import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { curveDistanceSearchFlowI18n } from './curve-distance-search-flow.i18n';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

/** 展示如何按目标距离二分反查曲线参数 */
export type CurveDistanceSearchFlowI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<CurveDistanceSearchFlowI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = curveDistanceSearchFlowI18n[lang];

  return (
    <FlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout kind="linear" id="distance-search" direction="right" align="center">
        <FlowLayout kind="linear" id="search-state" direction="down" align="center">
          <FlowEntities
            items={[
              {
                id: 'range',
                text: i18n.label1,
                role: 'state',
                kind: 'docs.logic.importantData',
              },
            ]}
          />
          <FlowEntities
            items={[{ id: 'midpoint', text: i18n.label2, role: 'activity', kind: 'docs.logic.algorithm' }]}
          />
        </FlowLayout>
        <FlowEntities items={[{ id: 'length', text: i18n.label3, role: 'activity', kind: 'docs.logic.algorithm' }]} />
        <FlowEntities items={[{ id: 'compare', text: i18n.label4, role: 'gateway' }]} />
        <FlowEntities items={[{ id: 'result', text: i18n.label5, role: 'state', kind: 'docs.logic.importantData' }]} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'range', target: 'midpoint' },
          { source: 'midpoint', target: 'length' },
          { source: 'length', target: 'compare' },
          { source: 'compare', target: 'range' },
          { source: 'compare', target: 'result', label: i18n.label6 },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
