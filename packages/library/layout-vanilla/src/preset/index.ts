import type { AnyInputEmbedAdapter } from '@retikz/vanilla';

import { flexLayoutInputEmbedAdapter } from '../flex-layout';
import { gridLayoutInputEmbedAdapter } from '../grid-layout';
import { overlayLayoutInputEmbedAdapter } from '../overlay-layout';

/** 三种 Layout 容器的 InputEmbed adapter catalog */
export const layoutInputEmbedAdapters: ReadonlyArray<
  AnyInputEmbedAdapter & Required<Pick<AnyInputEmbedAdapter, 'lower' | 'prepare'>>
> = Object.freeze([flexLayoutInputEmbedAdapter, gridLayoutInputEmbedAdapter, overlayLayoutInputEmbedAdapter]);
