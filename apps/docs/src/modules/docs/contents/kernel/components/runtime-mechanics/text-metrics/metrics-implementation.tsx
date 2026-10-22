import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { metricsImplementationI18n } from './metrics-implementation.i18n';

/** 文字度量实现流程的语言选项 */
export type MetricsImplementationProps = { lang?: Lang };

/** 展示普通文字与公式的度量来源、正文排版及几何输出 */
const MetricsImplementation: FC<MetricsImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const t = metricsImplementationI18n[lang];
  const rows = [
    ['custom', 'canvas', 'fallback'],
    ['context', 'content', 'tex'],
    ['plainContent', 'inline'],
    ['node', 'scene', 'render'],
  ];
  const important = new Set(['canvas', 'content', 'tex', 'inline']);
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="flow" kind="linear" direction="down" containerWidth="match-largest">
        {rows.map((row, index) => (
          <FlowLayout key={index} id={`row-${index}`} kind="linear" direction="right" itemWidth="fill">
            <FlowEntities
              items={row.map(id => ({
                id,
                role: id === 'scene' ? 'state' : 'activity',
                ...(important.has(id) ? { kind: 'docs.logic.important' } : {}),
                text: [{ text: t[id][0] }, { text: t[id][1], font: { size: 12 }, fill: 'gray' }],
              }))}
            />
          </FlowLayout>
        ))}
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'custom', target: 'context', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'canvas', target: 'context', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'fallback', target: 'context', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'context', target: 'content', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          {
            source: 'content',
            target: 'inline',
            label: { text: t.mixed[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          {
            source: 'content',
            target: 'plainContent',
            label: { text: t.plain[0], font: { size: 12 }, textColor: 'gray' },
            routing: { kind: 'orthogonal', cornerRadius: 0 },
          },
          { source: 'tex', target: 'inline', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'plainContent', target: 'node', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'inline', target: 'node', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'node', target: 'scene', routing: { kind: 'orthogonal', cornerRadius: 0 } },
          { source: 'scene', target: 'render', routing: { kind: 'orthogonal', cornerRadius: 0 } },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default MetricsImplementation;
