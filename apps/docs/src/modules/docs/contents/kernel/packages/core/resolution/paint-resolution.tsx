import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { paintResolutionI18n } from './paint-resolution.i18n';

/** 绘制解析图的语言 */
export type PaintResolutionProps = { lang?: Lang };

/** 展示纯色、渐变与图案的解析分支及交付结果 */
const PaintResolution: FC<PaintResolutionProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = paintResolutionI18n[lang];
  const stages = ['solid', 'gradient', 'pattern'] as const;
  const products = ['input', 'color', 'gradientResult', 'patternResult', 'output'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="paint-resolution"
        kind="grid"
        gap={{ row: 36, column: 24 }}
        placements={[
          [null, 'input', null],
          ['solid', 'gradient', 'pattern'],
          ['color', 'gradientResult', 'patternResult'],
          [null, 'output', null],
        ]}
      >
        <FlowEntities
          items={stages.map(id => ({
            id,
            role: 'activity',
            text: text[id],
            layout: { width: 210 },
            ...(id === 'pattern' ? { kind: 'docs.logic.important' } : {}),
          }))}
        />
        <FlowEntities
          items={products.map(id => ({
            id,
            role: 'state',
            text: text[id],
            layout: { width: 210 },
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'solid' },
          { source: 'input', target: 'gradient' },
          { source: 'input', target: 'pattern' },
          { source: 'solid', target: 'color' },
          { source: 'gradient', target: 'gradientResult' },
          { source: 'pattern', target: 'patternResult' },
          { source: 'color', target: 'output' },
          { source: 'gradientResult', target: 'output' },
          { source: 'patternResult', target: 'output' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PaintResolution;
