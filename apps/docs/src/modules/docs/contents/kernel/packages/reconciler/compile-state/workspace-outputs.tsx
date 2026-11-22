import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { workspaceOutputsI18n } from './workspace-outputs.i18n';

/** 展示几何、资源与警告各自在编译中的去向 */
const WorkspaceOutputs: FC<{ lang?: Lang }> = props => {
  const { lang = 'zh' } = props;
  const labels = workspaceOutputsI18n[lang];
  const stages = [
    { id: 'boundary', member: 'boundaryStore' },
    { id: 'point', member: 'A.right' },
    { id: 'resources', member: 'paintRegistry · clipRegistry' },
    { id: 'scene', member: 'scene.resources' },
    { id: 'warnings', member: 'diagnosticCollector' },
    { id: 'snapshot', member: 'snapshot.diagnostics' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="workspace-outputs"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          ['boundary', 'point'],
          ['resources', 'scene'],
          ['warnings', 'snapshot'],
        ]}
      >
        <FlowEntities
          items={stages.map(({ id, member }) => ({
            id,
            role: 'activity',
            layout: { width: 198 },
            text: [{ text: labels[id] }, { text: member, font: { size: 12 }, fill: 'gray' }],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ['boundary', 'point'],
          ['resources', 'scene'],
          ['warnings', 'snapshot'],
        ].map(([source, target]) => ({ source: { id: source }, target: { id: target } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default WorkspaceOutputs;
