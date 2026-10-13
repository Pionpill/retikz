import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationScopeI18n } from './compilation-scope.i18n';

/** Scope 递归流程图的语言 */
export type CompilationScopeProps = { lang?: Lang };

/** 展示 Scope 递归进入、子项处理和返回父级的顺序 */
const CompilationScope: FC<CompilationScopeProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationScopeI18n[lang];
  const ids = ['enter', 'namespace', 'children', 'layout', 'paths', 'return'] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="scopeCompilation"
        kind="grid"
        gap={{ row: 32, column: 32 }}
        placements={[
          ['enter', 'namespace', 'children'],
          ['return', 'paths', 'layout'],
        ]}
      >
        <FlowEntities
          items={ids.map(id => ({
            id,
            text: text[id],
            role: 'activity',
            ...(id === 'children' || id === 'paths' ? { kind: 'docs.logic.important' } : {}),
            layout: { width: 196 },
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'enter', target: 'namespace' },
          { source: 'namespace', target: 'children' },
          { source: 'children', target: 'layout' },
          { source: 'layout', target: 'paths' },
          { source: 'paths', target: 'return' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompilationScope;
