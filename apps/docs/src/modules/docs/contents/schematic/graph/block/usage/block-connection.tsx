import type { IRPosition } from '@retikz/core';
import { Block, BlockHeader, BlockRow, BlockSection, Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { createGraphPreviewSource } from '@/modules/docs/preview';

import { blockConnectionI18n } from './block-connection.i18n';

/** boundary 覆盖 Surface padding */
const surfaceBoundary = { type: 'rectangle', params: { fit: 'tight', gap: 8.5 } } as const;
/** 固定当前 Block 高度的垂直中点 */
const blockCenterY = 57.6;
/** 固定 240 宽度时让 straightBarb 箭头尖端落在 Section 背景右边界 */
const sectionBoundaryPoint: IRPosition = [232.5, 80.4];

/** Relation 分别连接 Block 整体与具体 Section host */
export type BlockConnectionProps = { lang?: Lang };
const Demo: FC<BlockConnectionProps> = ({ lang = 'zh' }) => (
  <Graph>
    <Block id="user" width={240}>
      <BlockHeader title="User" description={blockConnectionI18n[lang].description} />
      <BlockSection id="user.fields" title={blockConnectionI18n[lang].fields}>
        <BlockRow content={['email', 'string']} />
      </BlockSection>
    </Block>
    <Entity id="caller" role="activity" position={[-150, blockCenterY]}>
      {blockConnectionI18n[lang].caller}
    </Entity>
    <Entity id="validator" role="activity" position={[430, blockCenterY]}>
      {blockConnectionI18n[lang].validator}
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
