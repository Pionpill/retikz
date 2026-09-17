import { Layout, Node, Scope, wrapRootScope } from '@retikz/react';
import type { ScopeProps } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

import { layoutRootScopeI18n } from './layout-root-scope.i18n';

export type LayoutRootScopeProps = Readonly<{ lang?: Lang }>;

const defaults = {
  node: { style: { fill: 'dodgerblue', fillOpacity: 0.12, stroke: 'gray' } },
} satisfies ScopeProps['defaults'];

const LayoutRootScope: FC<LayoutRootScopeProps> = props => {
  const { lang } = props;
  const i18n = layoutRootScopeI18n[lang ?? 'zh'];
  const children = (
    <>
      <Node position={[0, 0]} cornerRadius={4} layout={{ minimumSize: { width: 46, height: 34 } }}>
        A
      </Node>
      <Node
        position={[86, 0]}
        cornerRadius={4}
        layout={{ minimumSize: { width: 46, height: 34 } }}
        style={{ fill: 'darkorange' }}
      >
        B
      </Node>
    </>
  );

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[0, 1].map(index => (
        <Scope key={index} transforms={[{ kind: 'translate', x: index * 220, y: 0 }]}>
          <LogicFigureFrame border={{ stroke: 'gray' }}>
            <LogicFigureFrameTitle>{index === 0 ? i18n.implicit : i18n.explicit}</LogicFigureFrameTitle>
            {index === 0 ? wrapRootScope(children, { defaults }) : <Scope defaults={defaults}>{children}</Scope>}
          </LogicFigureFrame>
          <Node position={[76, 104]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 13 } }}>
            {i18n.inherited}
          </Node>
          <Node position={[76, 128]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 13 } }}>
            {i18n.overridden}
          </Node>
        </Scope>
      ))}
      <Node position={[186, 160]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
        {i18n.result}
      </Node>
    </Layout>
  );
};

export default LayoutRootScope;
