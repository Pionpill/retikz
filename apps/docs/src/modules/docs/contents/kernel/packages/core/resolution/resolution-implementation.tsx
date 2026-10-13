import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { resolutionImplementationI18n } from './resolution-implementation.i18n';

/** 源码流程图的语言 */
export type ResolutionImplementationProps = { lang?: Lang };

/** 纵向排列节点解析方法，两侧保留重要中间结果 */
const ResolutionImplementation: FC<ResolutionImplementationProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = resolutionImplementationI18n[lang];
  const stages = [
    { id: 'setup', name: 'createCompileContext' },
    { id: 'scope', name: 'resolveScopeDefaults' },
    { id: 'merge', name: 'resolveEffectiveNodeStyle' },
    { id: 'colors', name: 'resolveNodePrimaryColors' },
    { id: 'fields', name: 'expandNodeFields' },
    { id: 'shape', name: 'resolveNodeShape' },
    { id: 'paint', name: 'resolvePaint' },
    { id: 'result', name: 'NodeResolution' },
  ] as const;
  const products = [
    { id: 'environment', name: 'registries' },
    { id: 'defaults', name: 'EffectiveScopeDefaults' },
    { id: 'effective', name: 'IRNode' },
    { id: 'concrete', name: 'PrimaryColorResolvedNode' },
    { id: 'expanded', name: 'Expanded fields' },
    { id: 'bound', name: 'ShapeResolution' },
    { id: 'resolved', name: 'paint' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          [null, 'setup', 'environment'],
          ['defaults', 'scope', null],
          [null, 'merge', 'effective'],
          ['concrete', 'colors', null],
          [null, 'fields', 'expanded'],
          ['bound', 'shape', null],
          [null, 'paint', 'resolved'],
          [null, 'result', null],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.id === 'result' ? 'state' : 'activity',
            ...(item.id === 'merge'
              ? { kind: 'docs.logic.important' }
              : item.id === 'result'
                ? { kind: 'docs.logic.importantData' }
                : {}),
            layout: { width: 260 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={products.map(item => ({
            id: item.id,
            role: 'state',
            kind: 'docs.logic.secondary',
            layout: { width: 202 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...stages.slice(1).map((item, index) => ({ source: stages[index].id, target: item.id })),
          { source: 'setup', target: 'environment' },
          { source: 'scope', target: 'defaults' },
          { source: 'merge', target: 'effective' },
          { source: 'colors', target: 'concrete' },
          { source: 'fields', target: 'expanded' },
          { source: 'shape', target: 'bound' },
          { source: 'paint', target: 'resolved' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ResolutionImplementation;
