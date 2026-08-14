import type { FlexLayoutItemInput, GridLayoutItemInput, OverlayLayoutItemInput } from '@retikz/layout';
import type { InputChild, InputEmbedContext, InputEmbedContribution } from '@retikz/vanilla';

type LayoutItem = FlexLayoutItemInput | GridLayoutItemInput | OverlayLayoutItemInput;
type CompositeDependencyContribution = InputEmbedContribution['compositeDependencies'];
type InputEmbedAuthoringSites = NonNullable<InputEmbedContribution['authoringSites']>;

/** 将 Vanilla Layout items 收敛为持久化输入与向外转发的 Layout provider contribution */
export const normalizeLayoutItems = <TItem extends LayoutItem>(
  inputs: ReadonlyArray<Omit<TItem, 'child'> & { child: InputChild }> | undefined,
  context: InputEmbedContext,
): Readonly<{
  items: Array<TItem>;
  compositeDependencies: CompositeDependencyContribution;
  authoringSites: InputEmbedAuthoringSites;
}> => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined) throw new Error('Layout inputs require Kernel Vanilla normalizeScene.');
  const items: Array<TItem> = [];
  const roots: Array<CompositeDependencyContribution['roots'][number]> = [];
  const providers: Array<CompositeDependencyContribution['providers'][number]> = [];
  const authoringSites: Array<InputEmbedAuthoringSites[number]> = [];

  for (const input of inputs ?? []) {
    const { child, ...item } = input;
    const normalized = normalizeChildren([child]);
    if (normalized.children.length !== 1) {
      throw new Error('Layout LayoutItem must normalize to exactly one Core child');
    }
    roots.push(...normalized.compositeDependencies.roots);
    providers.push(...normalized.compositeDependencies.providers);
    authoringSites.push(...normalized.authoringSites);
    items.push({ ...item, child: normalized.children[0] } as TItem);
  }

  return Object.freeze({
    items,
    compositeDependencies: Object.freeze({ roots: Object.freeze(roots), providers: Object.freeze(providers) }),
    authoringSites: Object.freeze(authoringSites),
  });
};
