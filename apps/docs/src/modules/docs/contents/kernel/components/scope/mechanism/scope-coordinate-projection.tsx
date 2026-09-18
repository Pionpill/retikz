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

import { scopeCoordinateProjectionI18n } from './scope-coordinate-projection.i18n';

export type ScopeCoordinateProjectionProps = Readonly<{ lang?: Lang }>;

const ScopeCoordinateProjection: FC<ScopeCoordinateProjectionProps> = props => {
  const { lang } = props;
  const i18n = scopeCoordinateProjectionI18n[lang ?? 'zh'];
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
        id="scope-coordinate-projection"
        kind="grid"
        rowGap={38}
        columnGap={30}
        placements={[
          [null, null, 'chain', null, null],
          ['target', 'inverse', 'add', 'forward', 'result'],
          [null, null, 'offset', null, null],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'target', text: text('target'), role: 'state' },
            { id: 'chain', text: text('chain'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'result', text: text('result'), role: 'state', kind: LogicFigureEntityKind.ImportantData },
            { id: 'inverse', text: text('inverse'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'add', text: text('add'), role: 'activity' },
            { id: 'forward', text: text('forward'), role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'offset', text: text('offset'), role: 'state' },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'target', target: 'inverse' },
          { source: 'inverse', target: 'add' },
          { source: 'add', target: 'forward' },
          { source: 'forward', target: 'result' },
          { source: 'chain', target: 'inverse', role: 'dependency', kind: LogicFigureRelationKind.Secondary },
          { source: 'chain', target: 'forward', role: 'dependency', kind: LogicFigureRelationKind.Secondary },
          { source: 'offset', target: 'add' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ScopeCoordinateProjection;
