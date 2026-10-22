import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compositionImplementationI18n } from './composition-implementation.i18n';

/** 组件组合图的语言选项 */
export type CompositionImplementationProps = { lang?: Lang };
/** 展示组件组合的源码调用方向 */
const CompositionImplementation: FC<CompositionImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositionImplementationI18n[lang];
  const rows = [
    ['adapter', 'registry'],
    ['chart', 'surface', 'flex'],
    ['plot', 'core', 'scene'],
  ];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        {rows.map((row, index) => (
          <FlowLayout key={index} id={`row-${index}`} kind="linear" direction="right" itemWidth="fill">
            <FlowEntities
              items={row.map(id => ({
                id,
                role: id === 'scene' || id === 'input' ? 'state' : 'activity',
                text: [{ text: t[id][0] }, { text: t[id][1], font: { size: 12 }, fill: 'gray' }],
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'adapter', target: 'registry', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'registry', target: 'chart', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'chart', target: 'surface', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'surface', target: 'flex', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'flex', target: 'plot', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'plot', target: 'core', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'core', target: 'scene', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompositionImplementation;
