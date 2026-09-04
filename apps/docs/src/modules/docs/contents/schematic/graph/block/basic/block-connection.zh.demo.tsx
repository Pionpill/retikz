import type { IRPosition } from '@retikz/core';
import type { FC } from 'react';

import { Block, BlockHeader, BlockRow, BlockSection, Entity, Graph, Relation } from '@retikz/graph-react';

import { createGraphPreviewSource } from '@/modules/docs/preview';

/** boundary 覆盖 Surface padding */
const surfaceBoundary = { type: 'rectangle', params: { fit: 'tight', gap: 8.5 } } as const;
/** 固定当前 Block 高度的垂直中点 */
const blockCenterY = 57.6;
/** 固定 240 宽度时让 stealth 箭头尖端落在 Section 背景右边界 */
const sectionBoundaryPoint: IRPosition = [232.5, 80.4];

/** Relation 分别连接 Block 整体与具体 Section host */
const Demo: FC = () => (
  <Graph width={760} height={250} viewBox={{ x: -240, y: -66, width: 760, height: 250 }}>
    <Block id="user" width={240}>
      <BlockHeader title="User" description="数据结构" />
      <BlockSection id="user.fields" title="字段">
        <BlockRow content={['email', 'string']} />
      </BlockSection>
    </Block>
    <Entity id="caller" role="activity" position={[-150, blockCenterY]}>
      调用方
    </Entity>
    <Entity id="validator" role="activity" position={[430, blockCenterY]}>
      校验器
    </Entity>
    <Relation
      role="dependency"
      source={{ id: 'caller', anchor: 'right' }}
      target={{ id: 'user', anchor: 'left', boundary: surfaceBoundary }}
      way={[{ id: 'caller', anchor: 'right' }, '-|-', { id: 'user', anchor: 'left', boundary: surfaceBoundary }]}
    />
    <Relation
      role="dependency"
      source={{ id: 'validator', anchor: 'left' }}
      target={{ id: 'user.fields', anchor: 'right', boundary: surfaceBoundary }}
      way={[{ id: 'validator', anchor: 'left' }, '-|-', sectionBoundaryPoint]}
    />
  </Graph>
);

export const previewSource = createGraphPreviewSource(() => Demo({}));

export default Demo;
