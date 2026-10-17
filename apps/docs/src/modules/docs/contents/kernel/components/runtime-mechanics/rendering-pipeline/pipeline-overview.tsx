import { FlowEntities, FlowGroup, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pipelineOverviewI18n } from './pipeline-overview.i18n';

/** 渲染链路总览的语言 */
export type PipelineOverviewProps = { lang?: Lang };

/** 展示输入汇合、包边界、编译产物与后端分流 */
const PipelineOverview: FC<PipelineOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = pipelineOverviewI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="pipeline" kind="linear" direction="right" gap={28} align="center">
        <FlowLayout
          id="inputs"
          kind="linear"
          direction="down"
          gap={12}
          itemWidth="match-largest"
          excludeFromBounds={['react', 'external']}
        >
          <FlowEntities
            items={[
              {
                id: 'react',
                text: [{ text: 'React JSX' }, { text: text.collect, font: { size: 12 }, fill: 'gray' }],
                role: 'activity',
                kind: LogicFigureEntityKind.Important,
              },
              { id: 'input', text: text.input, role: 'activity', kind: LogicFigureEntityKind.Important },
              { id: 'external', text: text.external, role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            ]}
          />
        </FlowLayout>
        <FlowLayout
          id="vanilla-runtime"
          kind="linear"
          direction="down"
          gap={28}
          align="center"
          excludeFromBounds={['runtime']}
        >
          <FlowGroup
            id="vanilla-group"
            caption={{ title: { text: '@retikz/vanilla', textColor: 'gray', font: { size: 12, weight: 'normal' } } }}
            border={{ stroke: 'lightgray', dashPattern: [4, 3] }}
            padding={{ top: 12, right: 12, bottom: 30, left: 12 }}
            cornerRadius={4}
          >
            <FlowEntities
              items={[{ id: 'prepare', text: text.prepare, role: 'activity', kind: LogicFigureEntityKind.Important }]}
            />
          </FlowGroup>
          <FlowEntities
            items={[
              {
                id: 'runtime',
                text: [{ text: 'Runtime' }, { text: text.runtime, font: { size: 12 }, fill: 'gray' }],
                role: 'activity',
                kind: LogicFigureEntityKind.Secondary,
              },
            ]}
          />
        </FlowLayout>
        <FlowGroup
          id="core-group"
          layout={{ direction: 'right', rankGap: 24 }}
          caption={{ title: { text: '@retikz/core', textColor: 'gray', font: { size: 12, weight: 'normal' } } }}
          border={{ stroke: 'lightgray', dashPattern: [4, 3] }}
          padding={{ top: 12, right: 12, bottom: 30, left: 12 }}
          cornerRadius={4}
        >
          <FlowEntities
            items={[
              { id: 'ir', text: 'IR', role: 'resource', kind: LogicFigureEntityKind.ImportantData },
              { id: 'compile', text: text.compile, role: 'activity' },
              { id: 'scene', text: 'Scene', role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            ]}
          />
        </FlowGroup>
        <FlowEntities
          items={[{ id: 'render', text: 'Render', role: 'activity', kind: LogicFigureEntityKind.Important }]}
        />
        <FlowLayout id="outputs" kind="linear" direction="down" gap={12} itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'svg', text: 'SVG', role: 'activity' },
              { id: 'canvas', text: 'Canvas', role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'react', target: 'prepare' },
          { source: 'input', target: 'prepare' },
          { source: 'external', target: 'prepare' },
          { source: 'prepare', target: 'ir' },
          { source: 'ir', target: 'compile' },
          { source: 'compile', target: 'scene' },
          { source: 'scene', target: 'render' },
          { source: 'render', target: 'svg' },
          { source: 'render', target: 'canvas' },
          {
            source: 'prepare',
            target: 'runtime',
            routing: { kind: 'orthogonal', cornerRadius: 0 },
            style: { dashPattern: [4, 3] },
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PipelineOverview;
