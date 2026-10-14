import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { positionFlowI18n } from './position-flow.i18n';

/** 位置分支图的语言 */
export type PositionFlowProps = { lang?: Lang };

/** 对照从局部计算与从世界引用开始的解析方向 */
const PositionFlow: FC<PositionFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = positionFlowI18n[lang];
  const stages = ['local', 'world', 'calculate', 'lookup', 'project', 'inverse', 'result'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="position"
        kind="grid"
        placements={[
          ['local', 'world'],
          ['calculate', 'lookup'],
          ['project', 'inverse'],
          ['result', null],
        ]}
      >
        <FlowEntities
          items={stages.map(id => ({
            id,
            text: text[id]
              .split('\n')
              .map((line, index) => ({ text: line, ...(index === 0 ? {} : { font: { size: 12 }, fill: 'gray' }) })),
            role: id === 'local' || id === 'world' || id === 'result' ? 'state' : 'activity',
            layout: { width: 270 },
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'local', target: 'calculate' },
          { source: 'calculate', target: 'project' },
          { source: 'world', target: 'lookup' },
          { source: 'lookup', target: 'inverse' },
          { source: 'project', target: 'result' },
          { source: 'inverse', target: 'result', routing: { kind: '|-' } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default PositionFlow;
