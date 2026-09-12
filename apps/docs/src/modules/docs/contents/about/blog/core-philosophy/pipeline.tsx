import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { pipelineI18n } from './pipeline.i18n';

export type PipelineProps = Readonly<{ lang?: Lang }>;

const Demo: FC<PipelineProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = pipelineI18n[lang];

  return (
    <PreviewFlowDiagram
      flowDefaults={{ entity: { style: { fill: 'none', stroke: 'none' } } }}
      layout={{ direction: 'right', nodeGap: 20 }}
      routing={{ kind: 'straight' }}
    >
      <FlowLayout kind="linear" id="pipeline" direction="right" align="center" gap={44}>
        <FlowLayout kind="linear" id="inputs" direction="down" align="center" gap={16}>
          <FlowEntities
            items={[
              { id: 'sugar', text: 'Sugar JSX', role: 'activity' },
              { id: 'kernel', text: 'Kernel JSX', role: 'activity' },
              { id: 'dsl', text: 'Text DSL*', role: 'activity' },
              { id: 'ai', text: 'AI / LLM', role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout
          kind="linear"
          id="compiler"
          direction="down"
          align="center"
          gap={28}
          excludeFromBounds={['persist']}
        >
          <FlowLayout kind="linear" id="pipeline-core" direction="right" align="center" gap={36}>
            <FlowEntities
              items={[
                { id: 'ir', text: 'IR (JSON)', role: 'activity' },
                { id: 'scene', text: 'Scene', role: 'activity' },
              ]}
            />
          </FlowLayout>
          <FlowEntities items={[{ id: 'persist', text: i18n.persist, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout kind="linear" id="outputs" direction="down" align="center" gap={16}>
          <FlowEntities
            items={[
              { id: 'react', text: 'React + SVG', role: 'activity' },
              { id: 'svg', text: i18n.svg, role: 'activity' },
            ]}
          />
          <FlowLayout
            kind="linear"
            id="canvas-output"
            direction="right"
            align="center"
            gap={24}
            excludeFromBounds={['formats']}
          >
            <FlowEntities items={[{ id: 'canvas', text: 'Canvas', role: 'activity' }]} />
            <FlowLayout kind="linear" id="formats" direction="down" align="center" gap={12}>
              <FlowEntities
                items={[
                  { id: 'png', text: 'PNG', role: 'activity' },
                  { id: 'jpeg', text: 'JPEG / WebP', role: 'activity' },
                ]}
              />
            </FlowLayout>
          </FlowLayout>
          <FlowEntities items={[{ id: 'native', text: 'Native (Skia/RN) / PDF', role: 'activity' }]} />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'sugar', target: 'ir' },
          { source: 'kernel', target: 'ir' },
          { source: 'dsl', target: 'ir' },
          { source: 'ai', target: 'ir' },
          { source: 'ir', target: 'scene' },
          { source: 'ir', target: 'persist', direction: 'both' },
          { source: 'scene', target: 'react' },
          { source: 'scene', target: 'svg' },
          { source: 'scene', target: 'canvas' },
          { source: 'canvas', target: 'png' },
          { source: 'canvas', target: 'jpeg' },
          { source: 'scene', target: 'native' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default Demo;
