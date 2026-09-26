import { Entity } from '@retikz/graph-react';
import { Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { LogicFigure, LogicFigureRelation, LogicFigureRelationKind } from '@/modules/docs/components/logic-figure';

import { graphLayersI18n } from './graph-layers.i18n';

/** 职责依赖图的语言 */
export type GraphLayersProps = { lang?: Lang };

/** 依赖箭头只表示能力复用，不表示执行顺序 */
const GraphLayers: FC<GraphLayersProps> = props => {
  const { lang = 'zh' } = props;
  const t = graphLayersI18n[lang];
  const rows = [
    { id: 'diagram', title: t.diagram, detail: t.diagramDetail, y: 30 },
    { id: 'graph', title: t.graph, detail: t.graphDetail, y: 130 },
    { id: 'drawing', title: t.drawing, detail: t.drawingDetail, y: 230 },
  ];
  return (
    <LogicFigure semanticColors={false}>
      {rows.map(row => (
        <Entity
          key={row.id}
          id={row.id}
          role="participant"
          position={[160, row.y]}
          layout={{ minimumSize: { width: 300, height: 44 } }}
        >
          {row.title}
        </Entity>
      ))}
      {rows.map(row => (
        <Node
          key={row.id}
          position={[160, row.y + 28]}
          text={row.detail}
          style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
        />
      ))}
      <LogicFigureRelation
        kind={LogicFigureRelationKind.Secondary}
        source={{ id: 'diagram', anchor: 'right' }}
        target={{ id: 'graph', anchor: 'right' }}
        way={['diagram.right', [400, 30], [400, 130], 'graph.right']}
      />
      <LogicFigureRelation
        kind={LogicFigureRelationKind.Secondary}
        source={{ id: 'graph', anchor: 'right' }}
        target={{ id: 'drawing', anchor: 'right' }}
        way={['graph.right', [400, 130], [400, 230], 'drawing.right']}
      />
      <Node
        position={[310, 80]}
        text={t.supplies}
        style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        position={[310, 180]}
        text={t.reuses}
        style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </LogicFigure>
  );
};
export default GraphLayers;
