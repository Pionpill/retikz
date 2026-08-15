import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

/** 带稳定 Vanilla InputEmbed adapter 静态字段的 Graph React 组件 */
export type GraphEmbeddableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: AnyInputEmbedAdapter;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};
