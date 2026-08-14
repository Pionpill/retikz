import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

/** 带稳定 Vanilla InputEmbed adapter 静态字段的 Standard React 组件 */
export type StandardEmbeddableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: AnyInputEmbedAdapter;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};
