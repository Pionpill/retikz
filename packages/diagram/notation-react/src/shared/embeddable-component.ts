import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC } from 'react';

/** 带稳定 Tier 2 adapter 静态字段的 Notation React 组件 */
export type NotationEmbeddableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  embeddableAdapter: EmbeddableTier2Adapter<TProps>;
};
