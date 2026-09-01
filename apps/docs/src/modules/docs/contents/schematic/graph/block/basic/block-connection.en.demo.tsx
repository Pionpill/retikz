import type { IRPosition } from '@retikz/core';
import type { FC } from 'react';

import { Block, BlockHeader, BlockRow, BlockSection, Entity, Graph, Relation } from '@retikz/graph-react';

import { createGraphPreviewSource } from '@/modules/docs/preview';

/** Boundary covers Surface padding */
const surfaceBoundary = { type: 'rectangle', params: { fit: 'tight', gap: 8.5 } } as const;
/** Vertical midpoint of the fixed current Block height */
const blockCenterY = 57.6;
/** Lands the stealth arrow tip on the Section background boundary at the fixed 240-unit Block width */
const sectionBoundaryPoint: IRPosition = [232.5, 80.4];

/** Relations targeting the whole Block and one concrete Section host */
const Demo: FC = () => (
  <Graph width={760} height={250} viewBox={{ x: -240, y: -66, width: 760, height: 250 }}>
    <Block id="user" width={240}>
      <BlockHeader title="User" description="Data structure" />
      <BlockSection id="user.fields" title="Fields">
        <BlockRow content={['email', 'string']} />
      </BlockSection>
    </Block>
    <Entity id="caller" role="activity" position={[-150, blockCenterY]}>
      Caller
    </Entity>
    <Entity id="validator" role="activity" position={[430, blockCenterY]}>
      Validator
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
