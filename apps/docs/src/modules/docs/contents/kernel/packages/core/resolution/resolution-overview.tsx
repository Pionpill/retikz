import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { resolutionOverviewI18n } from './resolution-overview.i18n';

/** 解析总览图的语言 */
export type ResolutionOverviewProps = { lang?: Lang };

/** 按执行顺序展示解析阶段和输入输出 */
const ResolutionOverview: FC<ResolutionOverviewProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = resolutionOverviewI18n[lang];
  const stages = ['setup', 'scope', 'merge', 'resolve', 'bind'] as const;
  const products = ['environment', 'frames', 'input', 'effective', 'result'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="resolution"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          [null, 'setup', 'environment'],
          [null, 'scope', 'frames'],
          ['input', 'merge', 'effective'],
          [null, 'resolve', null],
          [null, 'bind', 'result'],
        ]}
      >
        <FlowEntities
          items={stages.map(id => ({
            id,
            role: 'activity',
            text: text[id],
            layout: { width: 216 },
            ...(id === 'merge' ? { kind: 'docs.logic.important' } : {}),
          }))}
        />
        <FlowEntities
          items={products.map(id => ({
            id,
            role: 'state',
            text: text[id],
            layout: { width: 182 },
            ...(id !== 'input' ? { kind: 'docs.logic.secondary' } : {}),
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'setup', target: 'scope' },
          { source: 'scope', target: 'merge' },
          { source: 'merge', target: 'resolve' },
          { source: 'resolve', target: 'bind' },
          { source: 'setup', target: 'environment' },
          { source: 'scope', target: 'frames' },
          { source: 'input', target: 'merge' },
          { source: 'merge', target: 'effective' },
          { source: 'bind', target: 'result' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ResolutionOverview;
