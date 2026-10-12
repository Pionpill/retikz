import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { numericResolutionI18n } from './numeric-resolution.i18n';

/** 数值颜色的基准色与主题背景预合成的语言 */
export type NumericResolutionProps = { lang?: Lang };

/** 数值颜色的基准色与主题背景预合成 */
const NumericResolution: FC<NumericResolutionProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = numericResolutionI18n[lang];
  const stages = ['blend'] as const;
  const data = ['weight', 'base', 'theme', 'result'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="numeric-resolution"
        kind="grid"
        gap={{ row: 36, column: 24 }}
        placements={[
          ['base', 'theme'],
          ['weight', 'blend'],
          [null, 'result'],
        ]}
      >
        <FlowEntities
          items={stages.map(id => ({
            id,
            role: 'activity',
            text: text[id],
            layout: { width: 250 },
            kind: 'docs.logic.important',
          }))}
        />
        <FlowEntities
          items={data.map(id => ({
            id,
            role: 'state',
            text: text[id],
            layout: { width: 250 },
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'base', target: 'blend' },
          { source: 'theme', target: 'blend' },
          { source: 'weight', target: 'blend' },
          { source: 'blend', target: 'result' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default NumericResolution;
