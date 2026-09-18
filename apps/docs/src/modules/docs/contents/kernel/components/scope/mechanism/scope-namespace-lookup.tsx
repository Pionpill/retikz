import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { LogicFigureEntityKind, logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { scopeNamespaceLookupI18n } from './scope-namespace-lookup.i18n';

export type ScopeNamespaceLookupProps = Readonly<{ lang?: Lang }>;

const ScopeNamespaceLookup: FC<ScopeNamespaceLookupProps> = props => {
  const { lang } = props;
  const i18n = scopeNamespaceLookupI18n[lang ?? 'zh'];
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
        id="scope-namespace-lookup"
        kind="grid"
        rowGap={38}
        columnGap={30}
        placements={[
          [null, null, 'hit', null],
          ['lookup', 'current', 'outer', 'absent'],
          [null, 'register', 'duplicate', null],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'lookup', text: text('lookup'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'current', text: text('current'), role: 'resource', kind: LogicFigureEntityKind.ImportantData },
            { id: 'hit', text: text('hit'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'register', text: text('register'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'outer', text: text('outer'), role: 'activity' },
            { id: 'absent', text: text('absent'), role: 'state' },
            { id: 'duplicate', text: text('duplicate'), role: 'activity', status: 'warning' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'lookup', target: 'current' },
          {
            source: 'current',
            target: 'hit',
            label: i18n.edges.hit,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'current',
            target: 'outer',
            label: i18n.edges.miss,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'outer',
            target: 'hit',
            label: i18n.edges.hit,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'outer',
            target: 'absent',
            label: i18n.edges.allMiss,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'register',
            target: 'current',
            label: i18n.edges.write,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'register',
            target: 'duplicate',
            label: i18n.edges.exists,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ScopeNamespaceLookup;
