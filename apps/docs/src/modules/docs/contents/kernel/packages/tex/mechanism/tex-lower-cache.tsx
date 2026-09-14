import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import { RelationRole } from '@retikz/graph';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';
import {
  LogicFigureEntityKind,
  logicFigureGraphProps,
  LogicFigureRelationKind,
  logicFigureRelationKinds,
} from '@/modules/docs/components/logic-figure';

import { texLowerCacheI18n } from './tex-lower-cache.i18n';

/** 展示单个 lowerer 的公式缓存、解析与回写 */
export type TexLowerCacheI18nFigureProps = Readonly<{ lang?: Lang }>;

const Demo: FC<TexLowerCacheI18nFigureProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = texLowerCacheI18n[lang];

  return (
    <FlowDiagram
      {...logicFigureGraphProps()}
      style={{ maxWidth: '100%', height: 'auto' }}
      layout={{ direction: 'down' }}
      relationKinds={logicFigureRelationKinds}
    >
      <FlowLayout
        kind="grid"
        id="cache"
        placements={[
          ['tex-request', 'cache-lookup', 'cached-content'],
          [null, 'mathjax-processing', 'parsing-result'],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'tex-request', text: i18n.label1, role: 'participant' },
            { id: 'cache-lookup', text: i18n.label2, role: 'gateway' },
            {
              id: 'cached-content',
              text: i18n.label3,
              role: 'resource',
              kind: LogicFigureEntityKind.ImportantData,
            },
          ]}
        />
        <FlowEntities
          items={[
            { id: 'mathjax-processing', text: i18n.label4, role: 'activity', kind: LogicFigureEntityKind.Important },
            { id: 'parsing-result', text: i18n.label5, role: 'resource' },
          ]}
        />
      </FlowLayout>

      <FlowRelations
        items={[
          { source: 'tex-request', target: 'cache-lookup' },
          { source: 'cache-lookup', target: 'cached-content', label: i18n.label6 },
          { source: 'cache-lookup', target: 'mathjax-processing', label: i18n.label7 },
          { source: 'mathjax-processing', target: 'parsing-result' },
          {
            source: 'parsing-result',
            target: 'cached-content',
            label: i18n.label8,
            role: RelationRole.Dependency,
            kind: LogicFigureRelationKind.Secondary,
          },
        ]}
      />
    </FlowDiagram>
  );
};

export default Demo;
