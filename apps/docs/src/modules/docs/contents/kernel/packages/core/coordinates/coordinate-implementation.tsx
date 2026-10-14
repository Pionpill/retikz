import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { coordinateImplementationI18n } from './coordinate-implementation.i18n';

/** 完整实现流程的语言 */
export type CoordinateImplementationProps = { lang?: Lang };

/** 沿 Scope 生命周期串联位置、布局、引用与路径 */
const CoordinateImplementation: FC<CoordinateImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateImplementationI18n[lang];
  const stages = ['target', 'placeholder', 'children', 'envelope', 'transforms', 'publish', 'paths', 'group'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          ['target', null],
          ['placeholder', 'entry'],
          ['children', null],
          ['envelope', null],
          ['transforms', null],
          ['publish', 'geometry'],
          ['paths', null],
          ['group', null],
        ]}
      >
        <FlowEntities
          items={stages.map(id => ({
            id,
            text: text[id]
              .split('\n')
              .map((line, index) => ({ text: line, ...(index === 0 ? {} : { font: { size: 12 }, fill: 'gray' }) })),
            role: 'activity',
            layout: { width: 340 },
            ...(id === 'transforms' ? { kind: 'docs.logic.important' } : {}),
          }))}
        />
        <FlowEntities
          items={(['entry', 'geometry'] as const).map(id => ({
            id,
            text: text[id],
            role: 'state',
            kind: 'docs.logic.secondary',
            layout: { width: 230 },
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...stages.slice(1).map((id, index) => ({ source: stages[index], target: id })),
          { source: 'placeholder', target: 'entry' },
          { source: 'publish', target: 'geometry' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default CoordinateImplementation;
