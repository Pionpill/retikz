import { Coordinate, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopePlacementI18n } from './scope-placement.i18n';

/** Scope 放置对照图的语言 */
export type ScopePlacementProps = { lang?: Lang };

/** 相同子节点偏移下，对照 Scope 原点定位与包络对齐 */
const ScopePlacement: FC<ScopePlacementProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopePlacementI18n[lang];
  return (
    <Layout
      rootScope={{ defaults: { node: { style: { stroke: 'none', fill: 'none' } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Scope
        defaults={{ node: { shape: 'rectangle', cornerRadius: 4, layout: { minimumSize: { width: 72, height: 36 } } } }}
      >
        <Coordinate id="top-target" position={[140, 0]} />
        <Coordinate id="bottom-target" position={[140, 150]} />
        <Scope position={[140, 0]}>
          <Node position={[60, 0]} style={{ stroke: 'dodgerblue' }}>
            N
          </Node>
        </Scope>
        <Scope id="aligned-scope" position={{ kind: 'anchor', target: { id: 'bottom-target' }, selfAnchor: 'left' }}>
          <Node position={[60, 0]} style={{ stroke: 'darkorange' }}>
            N
          </Node>
        </Scope>
        <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
          <Step kind="move" to={[140, -45]} />
          <Step kind="line" to={[140, 188]} />
        </Path>
      </Scope>
      <Node
        position={[140, 0]}
        shape="circle"
        layout={{ minimumSize: 8, padding: 0 }}
        style={{ fill: 'currentColor', stroke: 'none' }}
      />
      <Node
        position={[140, 150]}
        shape="circle"
        layout={{ minimumSize: 8, padding: 0 }}
        style={{ fill: 'currentColor', stroke: 'none' }}
      />
      <Node position={[70, -58]}>{text.origin}</Node>
      <Node position={[70, 91]}>{text.anchor}</Node>
      <Node position={[80, 28]} style={{ textColor: 'gray' }}>
        {text.target}
      </Node>
      <Node position={[230, 196]} style={{ textColor: 'gray' }}>
        {text.self}
      </Node>
    </Layout>
  );
};

export default ScopePlacement;
