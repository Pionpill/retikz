import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { resolutionImplementationI18n } from './resolution-implementation.i18n';

/** 节点语义解析源码图的语言 */
export type ResolutionImplementationProps = { lang?: Lang };

/** 沿同一节点展示合并、阴影展开与能力绑定的交接 */
const ResolutionImplementation: FC<ResolutionImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = resolutionImplementationI18n[lang];
  const steps = [
    { id: 'source', name: 'IRNode' },
    { id: 'merge', name: 'mergeNodeStyle' },
    { id: 'fields', name: 'expandNodeFields' },
    { id: 'bind', name: 'resolveNodeShape / resolvePaint' },
    { id: 'result', name: 'CanonicalNode' },
    { id: 'next', name: 'compileNode' },
  ] as const;
  const inputs = [
    { id: 'defaults', name: 'scopeDefaults' },
    { id: 'registry', name: 'registries' },
  ] as const;

  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          [null, 'source'],
          ['defaults', 'merge'],
          [null, 'fields'],
          ['registry', 'bind'],
          [null, 'result'],
          [null, 'next'],
        ]}
      >
        <FlowEntities
          items={steps.map(item => ({
            id: item.id,
            role: item.id === 'source' || item.id === 'result' ? 'state' : 'activity',
            layout: { width: 260 },
            ...(item.id === 'result' ? { kind: 'docs.logic.importantData' } : {}),
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={inputs.map(item => ({
            id: item.id,
            role: 'state',
            kind: 'docs.logic.secondary',
            layout: { width: 210 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...steps.slice(1).map((item, index) => ({ source: steps[index].id, target: item.id })),
          { source: 'defaults', target: 'merge' },
          { source: 'registry', target: 'bind' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};

export default ResolutionImplementation;
