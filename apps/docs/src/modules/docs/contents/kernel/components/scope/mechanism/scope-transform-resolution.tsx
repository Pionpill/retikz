import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeTransformResolutionI18n } from './scope-transform-resolution.i18n';

export type ScopeTransformResolutionProps = Readonly<{ lang?: Lang }>;

const ScopeTransformResolution: FC<ScopeTransformResolutionProps> = props => {
  const { lang } = props;
  const i18n = scopeTransformResolutionI18n[lang ?? 'zh'];
  const text = (key: keyof typeof i18n.nodes) => {
    const [title, detail] = i18n.nodes[key];
    return [{ text: title }, ...(detail ? [{ text: detail, fill: 'gray', font: { size: 12 } }] : [])];
  };

  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        id="scope-transform-resolution"
        kind="grid"
        rowGap={38}
        columnGap={30}
        placements={[
          ['bounds', 'pivot', 'own', 'placement', 'final'],
          [null, null, 'known', 'target', null],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'known', text: text('known'), role: 'activity' },
            { id: 'own', text: text('own'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'bounds', text: text('bounds'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'pivot', text: text('pivot'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'target', text: text('target'), role: 'state' },
            { id: 'placement', text: text('placement'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'final', text: text('final'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'known', target: 'own' },
          { source: 'bounds', target: 'pivot' },
          { source: 'pivot', target: 'own' },
          { source: 'own', target: 'placement' },
          { source: 'target', target: 'placement' },
          { source: 'placement', target: 'final' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ScopeTransformResolution;
