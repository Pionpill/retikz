import { Entity, Relation } from '@retikz/graph-react';
import { Layout, Node, Path, Scope } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewGraph } from '@/modules/docs/components/component-preview/theme';

import { flowMaterializationI18n } from './flow-materialization.i18n';

/** 物化图的语言 */
export type FlowMaterializationProps = Readonly<{ lang?: Lang }>;

/** 同一份已验证几何用于 Graph 与 artifact，省略其它元素记录 */
const FlowMaterialization: FC<FlowMaterializationProps> = props => {
  const { lang = 'zh' } = props;
  const t = flowMaterializationI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="output"
        transforms={[{ kind: 'translate', x: 0, y: 85 }]}
        label={{ text: t.output, font: { size: 12 }, opacity: 0.8 }}
        style={{ font: { size: 13 } }}
        data={{ id: 'receive', bounds: { x: 240, y: 120, width: 80, height: 40 } }}
      />
      <Node
        id="graph"
        position={[446, 60]}
        layout={{ width: 192, minimumSize: { height: 40 }, padding: 0 }}
        style={{ stroke: 'none', fill: 'none' }}
        label={{ text: t.graph, font: { size: 12 } }}
      />
      <Scope transforms={[{ kind: 'translate', x: 110, y: -80 }]}>
        <PreviewGraph>
          <Entity
            id="receive"
            role="activity"
            position={[280, 140]}
            text={t.receive}
            layout={{ width: 80, minimumSize: { height: 40 } }}
          />
          <Entity
            id="verify"
            role="activity"
            position={[392, 140]}
            text={t.verify}
            layout={{ width: 80, minimumSize: { height: 40 } }}
          />
          <Relation role="flow" source="receive" target="verify" />
        </PreviewGraph>
      </Scope>
      <Map
        id="artifact"
        transforms={[{ kind: 'translate', x: 360, y: 175 }]}
        label={{ text: t.artifact, font: { size: 12 }, opacity: 0.8 }}
        style={{ font: { size: 13 } }}
        data={{ kind: 'entity', bounds: { x: 240, y: 120, width: 80, height: 40 } }}
      />
      <Path way={['output.right', [260, 176]]} />
      <Path way={[[260, 176], [260, 60], 'graph.left']} arrow="->" />
      <Path way={[[260, 176], [260, 266], 'artifact.left']} arrow="->" />
      <Node position={[260, 36]} text={t.draw} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
      <Node position={[275, 292]} text={t.record} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
      <Node position={[85, 315]} text={t.offset} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
    </Layout>
  );
};

export default FlowMaterialization;
