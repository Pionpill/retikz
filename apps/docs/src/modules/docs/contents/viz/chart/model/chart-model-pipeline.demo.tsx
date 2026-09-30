import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { chartModelPipelineI18n } from './chart-model-pipeline.i18n';

/** 图形模型解析主链的图示属性 */
export type ChartModelPipelineProps = Readonly<{ lang?: Lang }>;

/** 展示 Chart 从编写入口经 Source 和 recipe 进入 Plot 与 Surface 的主流程 */
const Demo: FC<ChartModelPipelineProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = chartModelPipelineI18n[lang];

  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="pipeline" kind="linear" direction="right" align="center">
        <FlowLayout id="authoring" kind="linear" direction="down" align="center" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'react', text: '@retikz/chart-react', role: 'participant' },
              { id: 'vanilla', text: '@retikz/chart-vanilla', role: 'participant' },
            ]}
          />
        </FlowLayout>
        <FlowEntities
          items={[
            { id: 'source', text: i18n.source, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            { id: 'resolve', text: i18n.resolve, role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'marks', text: i18n.marks, role: 'resource' },
            { id: 'output', text: i18n.output, role: 'activity' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'react', target: 'source' },
          { source: 'vanilla', target: 'source' },
          { source: 'source', target: 'resolve' },
          { source: 'resolve', target: 'marks' },
          { source: 'marks', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default Demo;
