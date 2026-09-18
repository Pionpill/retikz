import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeReferenceEnvelopeI18n } from './scope-reference-envelope.i18n';

export type ScopeReferenceEnvelopeProps = Readonly<{ lang?: Lang }>;

const ScopeReferenceEnvelope: FC<ScopeReferenceEnvelopeProps> = props => {
  const { lang } = props;
  const i18n = scopeReferenceEnvelopeI18n[lang ?? 'zh'];
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
        id="scope-reference-envelope"
        kind="grid"
        rowGap={38}
        columnGap={30}
        placements={[
          ['layouts', 'envelope', 'resolved'],
          ['placeholder', 'check', 'preserve'],
        ]}
      >
        <FlowEntities
          items={[
            {
              id: 'placeholder',
              text: text('placeholder'),
              role: 'state',
              kind: LogicFigureEntityKind.ImportantData,
            },
            { id: 'check', text: text('check'), role: 'gateway' },
            { id: 'resolved', text: text('resolved'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'layouts', text: text('layouts'), role: 'state' },
            { id: 'envelope', text: text('envelope'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'preserve', text: text('preserve'), role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'placeholder', target: 'check' },
          { source: 'layouts', target: 'envelope' },
          { source: 'envelope', target: 'resolved' },
          {
            source: 'check',
            target: 'resolved',
            label: i18n.edges.no,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'check',
            target: 'preserve',
            label: i18n.edges.yes,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ScopeReferenceEnvelope;
