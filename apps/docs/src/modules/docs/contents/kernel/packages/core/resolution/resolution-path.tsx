import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { resolutionPathI18n } from './resolution-path.i18n';

/** 源码流程图的语言 */
export type ResolutionPathProps = { lang?: Lang };

/** 纵向排列路径解析方法，两侧保留重要中间结果 */
const ResolutionPath: FC<ResolutionPathProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = resolutionPathI18n[lang];
  const stages = [
    { id: 'merge', name: 'resolveEffectivePath' },
    { id: 'kind', name: 'resolvePathDefinition' },
    { id: 'canonical', name: 'canonicalizePath' },
    { id: 'paint', name: 'resolvePaint' },
    { id: 'result', name: 'PathResolution' },
    { id: 'providers', name: 'resolveStrokePathProviders' },
  ] as const;
  const products = [
    { id: 'effective', name: 'IRPathBase' },
    { id: 'bound', name: 'PathDefinitionResolution' },
    { id: 'path', name: 'Expanded path fields' },
    { id: 'resolved', name: 'CanonicalPath' },
    { id: 'extras', name: 'irPath / targets' },
    { id: 'stroke', name: 'StrokePathResolution' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="implementation"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          [null, 'merge', 'effective'],
          ['bound', 'kind', null],
          [null, 'canonical', 'path'],
          ['resolved', 'paint', null],
          [null, 'result', 'extras'],
          ['stroke', 'providers', null],
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
          { source: 'merge', target: 'effective' },
          { source: 'kind', target: 'bound' },
          { source: 'canonical', target: 'path' },
          { source: 'paint', target: 'resolved' },
          { source: 'result', target: 'extras' },
          { source: 'providers', target: 'stroke' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ResolutionPath;
