import type { InputEmbed } from '@retikz/vanilla';

/**
 * 以 Graph Source 的显式 id 复用 Vanilla embed identity
 * @template TProps 嵌入节点携带的作者属性类型，与输入 props 保持一致
 */
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
