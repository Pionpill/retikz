import type { AnyInputEmbedAdapter } from '@retikz/vanilla';

import { FlexLayoutInputEmbedAdapter } from '../flex-layout';
import { GridLayoutInputEmbedAdapter } from '../grid-layout';
import { OverlayLayoutInputEmbedAdapter } from '../overlay-layout';

/** 三种 Layout 容器的 InputEmbed adapter catalog */
export const LayoutInputEmbedAdapters: ReadonlyArray<
  AnyInputEmbedAdapter & Required<Pick<AnyInputEmbedAdapter, 'lower' | 'prepare'>>
> = Object.freeze([FlexLayoutInputEmbedAdapter, GridLayoutInputEmbedAdapter, OverlayLayoutInputEmbedAdapter]);
