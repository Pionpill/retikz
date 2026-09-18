import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

import { scopeClipResourceI18n } from './scope-clip-resource.i18n';

export type ScopeClipResourceProps = Readonly<{ lang?: Lang }>;

const ScopeClipResource: FC<ScopeClipResourceProps> = props => {
  const { lang } = props;
  const i18n = scopeClipResourceI18n[lang ?? 'zh'];
  const text = (key: keyof typeof i18n.nodes) => {
    const [title, detail] = i18n.nodes[key];
    return [{ text: title }, ...(detail ? [{ text: detail, fill: 'gray', font: { size: 12 } }] : [])];
  };

  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      relationKinds={logicFigureRelationKinds}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        id="scope-clip-resource"
        kind="grid"
        rowGap={38}
        columnGap={22}
        placements={[
          ['spec', 'resolve', 'path', 'resources', 'group'],
          [null, 'definitions', null, null, 'children'],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'spec', text: text('spec'), role: 'state' },
            { id: 'resolve', text: text('resolve'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'path', text: text('path'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'definitions', text: text('definitions'), role: 'participant' },
            {
              id: 'resources',
              text: text('resources'),
              role: 'resource',
              kind: LogicFigureEntityKind.ImportantData,
            },
            { id: 'children', text: text('children'), role: 'state', kind: LogicFigureEntityKind.Secondary },
            { id: 'group', text: text('group'), role: 'participant', kind: LogicFigureEntityKind.Important },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'spec', target: 'resolve' },
          { source: 'resolve', target: 'path' },
          { source: 'definitions', target: 'resolve', role: 'dependency', kind: LogicFigureRelationKind.Secondary },
          {
            source: 'path',
            target: 'resources',
            label: i18n.edges.dedup,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          {
            source: 'resources',
            target: 'group',
            label: i18n.edges.ref,
            labelFont: { size: 12 },
            labelTextForeground: 'dimgray',
          },
          { source: 'children', target: 'group' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ScopeClipResource;
