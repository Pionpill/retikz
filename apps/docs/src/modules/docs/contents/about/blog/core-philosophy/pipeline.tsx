import type { FC } from 'react';

import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { LegendSchema } from '@retikz/standard';

import type { Lang } from '@/i18n';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { pipelineI18n } from './pipeline.i18n';

export type PipelineProps = Readonly<{ lang?: Lang }>;

const Demo: FC<PipelineProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = pipelineI18n[lang];

  return (
    <PreviewFlowDiagram
      presentation={{
        legend: LegendSchema.parse({
          namespace: 'standard',
          type: 'legend',
          content: {
            kind: 'items',
            items: [
              {
                key: 'planned',
                sample: {
                  type: 'node',
                  position: [0, 0],
                  text: i18n.planned,
                  style: { fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } },
                },
              },
            ],
          },
        }),
      }}
      frame={{ legendPosition: 'bottom', legendAlign: 'center' }}
      flowDefaults={{ entity: { style: { fill: 'none', stroke: 'none' } } }}
      layout={{ direction: 'right' }}
      routing={{ kind: 'straight' }}
    >
      <FlowLayout kind="linear" id="pipeline" direction="right" align="center">
        <FlowLayout kind="linear" id="inputs" direction="down" align="center" gap={8}>
          <FlowEntities
            items={[
              { id: 'react', text: 'React JSX', role: 'activity' },
              { id: 'vanilla', text: 'Vanilla API', role: 'activity' },
              { id: 'config', text: 'Config Json', role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout kind="linear" id="pipeline-core" direction="right" align="center">
          <FlowLayout kind="linear" id="compiler" direction="down" align="center" excludeFromBounds={['persist']}>
            <FlowEntities items={[{ id: 'ir', text: 'IR (JSON)', role: 'activity' }]} />
            <FlowEntities items={[{ id: 'persist', text: i18n.persist, role: 'activity' }]} />
          </FlowLayout>
          <FlowEntities items={[{ id: 'scene', text: 'Scene', role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout kind="linear" id="outputs" direction="down" align="center" gap={8}>
          <FlowEntities items={[{ id: 'svg', text: 'SVG', role: 'activity' }]} />
          <FlowLayout
            kind="linear"
            id="canvas-output"
            direction="right"
            align="center"
            gap={48}
            excludeFromBounds={['formats']}
          >
            <FlowEntities items={[{ id: 'canvas', text: 'Canvas', role: 'activity' }]} />
            <FlowEntities items={[{ id: 'formats', text: 'PNG / JPEG', role: 'activity' }]} />
          </FlowLayout>
          <FlowEntities
            items={[
              { id: 'pdf', text: 'PDF', role: 'activity', status: 'disabled', style: { textColor: 'gray' } },
              {
                id: 'office',
                text: 'Word / Excel / PPT',
                role: 'activity',
                status: 'disabled',
                style: { textColor: 'gray' },
              },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'react', target: 'ir' },
          { source: 'vanilla', target: 'ir' },
          { source: 'config', target: 'ir' },
          { source: 'ir', target: 'scene' },
          { source: 'ir', target: 'persist', direction: 'both' },
          { source: 'scene', target: 'svg' },
          { source: 'scene', target: 'canvas' },
          { source: 'canvas', target: 'formats' },
          { source: 'scene', target: 'pdf', status: 'disabled' },
          { source: 'scene', target: 'office', status: 'disabled' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default Demo;
