import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pipelineImplementationI18n } from './pipeline-implementation.i18n';

/** 渲染链路图的语言 */
export type PipelineImplementationProps = { lang?: Lang };

/** 追踪 static React SVG 分支的源码入口 */
const PipelineImplementation: FC<PipelineImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = pipelineImplementationI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="pipeline" kind="linear" direction="down" containerWidth="match-largest">
        <FlowLayout id="row-0" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={text.titles.slice(0, 3).map((title, index) => ({
              id: `s${index}`,
              role: 'activity',
              text: [{ text: title }, { text: text.details[index], font: { size: 12 }, fill: 'gray' }],
            }))}
          />
        </FlowLayout>
        <FlowLayout id="row-1" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={text.titles.slice(3, 6).map((title, index) => ({
              id: `s${3 + index}`,
              role: index === 2 ? 'state' : 'activity',
              ...(3 + index === 4 ? { kind: 'docs.logic.important' } : {}),
              text: [{ text: title }, { text: text.details[3 + index], font: { size: 12 }, fill: 'gray' }],
            }))}
          />
        </FlowLayout>
        <FlowLayout id="row-2" kind="linear" direction="right" itemWidth="fill">
          <FlowEntities
            items={text.titles.slice(6, 9).map((title, index) => ({
              id: `s${6 + index}`,
              role: 'activity',
              text: [{ text: title }, { text: text.details[6 + index], font: { size: 12 }, fill: 'gray' }],
            }))}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={text.titles.slice(1).map((_, index) => ({
          source: `s${index}`,
          target: `s${index + 1}`,
          ...(index % 3 === 2 ? { routing: { kind: 'orthogonal' as const, cornerRadius: 0 } } : {}),
        }))}
      />
    </PreviewFlowDiagram>
  );
};
export default PipelineImplementation;
