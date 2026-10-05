import type { FlexLayoutItemInput, GridLayoutItemInput, OverlayLayoutItemInput } from '@retikz/layout';
import { RetikzLayoutError, RetikzLayoutErrorCode } from '@retikz/layout';
import type {
  InputChild,
  InputEmbedContext,
  InputEmbedContribution,
  InputEmbedPreparationContext,
  InputEmbedChildrenPreparation,
  NormalizedInputEmbedChildren,
} from '@retikz/vanilla';

type LayoutItem = FlexLayoutItemInput | GridLayoutItemInput | OverlayLayoutItemInput;

type CoreProviderContribution = InputEmbedContribution['providerDependencies'];

type InputEmbedAuthoringSites = NonNullable<InputEmbedContribution['authoringSites']>;

/** 汇合已归一化的 Layout 子项与显式 Source 字段绑定 */
const collectLayoutItems = <TItem extends LayoutItem>(
  inputs: ReadonlyArray<Omit<TItem, 'child'> & { child: InputChild }>,
  normalizedChildren: ReadonlyArray<NormalizedInputEmbedChildren>,
): Readonly<{
  items: Array<TItem>;
  providerDependencies: CoreProviderContribution;
  authoringSites: InputEmbedAuthoringSites;
  runtimeInputs: NonNullable<InputEmbedContribution['runtimeInputs']>;
}> => {
  const items: Array<TItem> = [];
  const roots: Array<CoreProviderContribution['roots'][number]> = [];
  const providers: Array<CoreProviderContribution['providers'][number]> = [];
  const authoringSites: Array<InputEmbedAuthoringSites[number]> = [];
  const runtimeInputs: Array<NonNullable<InputEmbedContribution['runtimeInputs']>[number]> = [];

  for (const [index, input] of inputs.entries()) {
    const { child, ...item } = input;
    void child;
    const normalized = normalizedChildren[index];
    if (normalized.children.length !== 1) {
      throw new RetikzLayoutError({
        code: RetikzLayoutErrorCode.AuthoringInvalid,
        message: 'Layout LayoutItem must normalize to exactly one Core child',
        details: { childCount: normalized.children.length },
      });
    }

    roots.push(...normalized.providerDependencies.roots);
    providers.push(...normalized.providerDependencies.providers);
    authoringSites.push(...normalized.authoringSites);

    for (const binding of normalized.runtimeInputs ?? [])
      runtimeInputs.push({ ...binding, path: ['children', items.length, 'child', ...binding.path.slice(1)] });
    items.push({ ...item, child: normalized.children[0] } as TItem);
  }

  return Object.freeze({
    items,
    providerDependencies: Object.freeze({ roots: Object.freeze(roots), providers: Object.freeze(providers) }),
    authoringSites: Object.freeze(authoringSites),
    runtimeInputs: Object.freeze(runtimeInputs),
  });
};

/**
 * 将 Vanilla Layout items 收敛为持久化输入与向外转发的 Layout provider contribution
 * @template TItem 保留布局字段的目标项类型，child 由作者输入转换为 IR
 */
export const normalizeLayoutItems = <TItem extends LayoutItem>(
  inputs: ReadonlyArray<Omit<TItem, 'child'> & { child: InputChild }> | undefined,
  context: InputEmbedContext,
): ReturnType<typeof collectLayoutItems<TItem>> => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined)
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.AuthoringInvalid,
      message: 'Layout inputs require Kernel Vanilla normalizeScene.',
      details: { operation: 'normalizeLayoutItems' },
    });

  const items = inputs ?? [];

  return collectLayoutItems(
    items,
    items.map(input => normalizeChildren([input.child])),
  );
};

/**
 * 在全树准备阶段登记 Layout child；执行阶段复用同一字段组装
 * @template TItem 异步准备完成后输出的布局项类型，保留输入的布局约束字段
 */
export const prepareLayoutItems = async <TItem extends LayoutItem>(
  inputs: ReadonlyArray<Omit<TItem, 'child'> & { child: InputChild }> | undefined,
  context: InputEmbedPreparationContext,
): Promise<() => Promise<ReturnType<typeof normalizeLayoutItems<TItem>>>> => {
  const preparations: Array<InputEmbedChildrenPreparation> = [];

  for (const input of inputs ?? []) preparations.push(await context.prepareChildren([input.child]));

  return async () => {
    const normalized: Array<NormalizedInputEmbedChildren> = [];
    for (const preparation of preparations) normalized.push(await preparation.execute());
    return collectLayoutItems<TItem>(inputs ?? [], normalized);
  };
};
