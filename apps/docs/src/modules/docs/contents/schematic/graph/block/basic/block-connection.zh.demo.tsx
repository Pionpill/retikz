import type { FC } from 'react';

import { Block, BlockCell, BlockHeader, BlockRow, BlockSection, Entity, Graph, Relation } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import { createGraphPreviewSource } from '@/modules/docs/preview';

const CellText: FC<{ children: string }> = ({ children }) => (
  <Node position={[0, 0]} padding={0} fill="none" stroke="none">
    {children}
  </Node>
);

/** Relation 连接到具体 Row host */
const Demo: FC = () => (
  <Graph width={560} height={250} viewBox={{ x: -49, y: -66, width: 560, height: 250 }}>
    <Block id="user">
      <BlockHeader title="User" description="数据结构" />
      <BlockSection id="user.fields" title="字段">
        <BlockRow id="user.email">
          <BlockCell grow={1}>
            <CellText>email</CellText>
          </BlockCell>
          <BlockCell>
            <CellText>string</CellText>
          </BlockCell>
        </BlockRow>
      </BlockSection>
    </Block>
    <Entity id="validator" role="activity" position={[430, 100]}>
      校验器
    </Entity>
    <Relation
      role="dependency"
      source={{ id: 'user.email', anchor: { side: 'right', fraction: 0.5 } }}
      target={{ id: 'validator', anchor: 'left' }}
    />
  </Graph>
);

export const previewSource = createGraphPreviewSource(() => Demo({}));

export default Demo;
