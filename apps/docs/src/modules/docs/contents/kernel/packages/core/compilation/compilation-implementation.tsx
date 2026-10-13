import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationImplementationI18n } from './compilation-implementation.i18n';

/** 编译源码导览图的语言 */
export type CompilationImplementationProps = { lang?: Lang };

/** 纵向展示主执行顺序，两侧展示各阶段消费和产生的数据 */
const CompilationImplementation: FC<CompilationImplementationProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = compilationImplementationI18n[lang];
  const stages = [
    { id: 'entry', name: 'compileCoreSnapshot', detail: text.entry },
    { id: 'context', name: 'createCompileContext', detail: text.context },
    { id: 'visit', name: 'compileChildrenToPrimitives', detail: text.visit },
    { id: 'flush', name: 'flushPendingPathEmissions', detail: text.flush },
    { id: 'sort', name: 'stableSortByZIndex', detail: text.sort },
    { id: 'result', name: 'CompileResult', detail: text.result },
  ];
  const products = [
    { id: 'input', name: 'IRScene + CompileOptions', detail: text.input },
    { id: 'dependencies', name: 'CompileContext', detail: text.dependencies },
    { id: 'layouts', name: 'NodeLayout', detail: text.layouts },
    { id: 'pending', name: 'PendingPathEmission', detail: text.pending },
    { id: 'paths', name: 'PathPrim / GroupPrim', detail: text.paths },
    { id: 'primitives', name: 'ScenePrimitive[]', detail: text.primitives },
    { id: 'scene', name: 'Scene', detail: text.scene },
    { id: 'extras', name: 'artifacts / spatialHandles', detail: text.extras },
  ];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          ['input', 'entry', null],
          [null, 'context', 'dependencies'],
          ['layouts', 'visit', 'pending'],
          [null, 'flush', 'paths'],
          [null, 'sort', 'primitives'],
          ['scene', 'result', 'extras'],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.id === 'result' ? 'state' : 'activity',
            ...(item.id === 'visit' || item.id === 'flush'
              ? { kind: 'docs.logic.important' }
              : item.id === 'result'
                ? { kind: 'docs.logic.importantData' }
                : {}),
            layout: { width: 224 },
            text: [
              { text: item.name, font: { size: 14 } },
              { text: item.detail, font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={products.map(item => ({
            id: item.id,
            role: 'state',
            kind: 'docs.logic.secondary',
            layout: { width: 184 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: item.detail, font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'entry' },
          { source: 'entry', target: 'context' },
          { source: 'context', target: 'visit' },
          { source: 'visit', target: 'flush' },
          { source: 'flush', target: 'sort' },
          { source: 'sort', target: 'result' },
          { source: 'context', target: 'dependencies' },
          { source: 'visit', target: 'layouts' },
          { source: 'visit', target: 'pending' },
          { source: 'flush', target: 'paths' },
          { source: 'sort', target: 'primitives' },
          { source: 'result', target: 'scene' },
          { source: 'result', target: 'extras' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompilationImplementation;
