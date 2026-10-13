import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { stylePropertiesI18n } from './style-properties.i18n';

/** 直接属性保留与 Node 基准色补齐的语言 */
export type StylePropertiesProps = { lang?: Lang };

/** 直接属性保留与 Node 基准色补齐 */
const StyleProperties: FC<StylePropertiesProps> = props => {
  const { i18n } = useTranslation();
  const lang = props.lang ?? ((i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en');
  const text = stylePropertiesI18n[lang];
  const stages = ['explicit', 'fallback'] as const;
  const data = ['input', 'base', 'result'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="style-properties"
        kind="grid"
        gap={{ row: 36, column: 24 }}
        placements={[
          ['input', 'base'],
          ['explicit', 'fallback'],
          ['result', null],
        ]}
      >
        <FlowEntities
          items={stages.map(id => ({
            id,
            role: 'activity',
            text: text[id],
            layout: { width: 250 },
            ...(id === 'fallback' ? { kind: 'docs.logic.important' } : {}),
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
          { source: 'input', target: 'explicit' },
          { source: 'input', target: 'base' },
          { source: 'base', target: 'fallback' },
          { source: 'explicit', target: 'result' },
          { source: 'fallback', target: 'result' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default StyleProperties;
