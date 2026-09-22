import type { InputEmbed } from '@retikz/vanilla';

/** 以 Graph Source 的显式 id 复用 Vanilla embed identity */
export const createGraphInputEmbed = <TProps>(
  kind: string,
  props: TProps,
  id: string | undefined,
): InputEmbed<TProps> => ({
  type: 'embed',
  kind,
  ...(id === undefined ? {} : { id }),
  props,
});
