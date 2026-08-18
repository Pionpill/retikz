import type { LegendInput } from '@retikz/standard';
import type {
  InputChild,
  InputEmbed,
  InputEmbedAdapter,
  InputEmbedContext,
  InputEmbedContribution,
} from '@retikz/vanilla';

import { createLegend, LegendProvider, RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard';

import { StandardLegendEmbedKind } from './constants';

type InputLegendChild = InputChild;
type InputLegendItemsContent = Omit<Extract<LegendInput['content'], { kind: 'items' }>, 'items'> & {
  items: Array<
    Omit<Extract<LegendInput['content'], { kind: 'items' }>['items'][number], 'sample' | 'label'> & {
      sample: InputLegendChild;
      label?: InputLegendChild;
    }
  >;
};
type InputLegendRampContent = Omit<Extract<LegendInput['content'], { kind: 'ramp' }>, 'sample' | 'ticks'> & {
  sample: InputLegendChild;
  ticks: Array<
    Omit<Extract<LegendInput['content'], { kind: 'ramp' }>['ticks'][number], 'label'> & {
      label?: InputLegendChild;
    }
  >;
};

/** Standard Legend 的 framework-neutral authoring 输入 */
export type InputLegend = Omit<LegendInput, 'title' | 'content'> & {
  title?: InputLegendChild;
  content: InputLegendItemsContent | InputLegendRampContent;
};

type CollectedLegendSlots = Readonly<{
  roots: Array<InputEmbedContribution['providerDependencies']['roots'][number]>;
  providers: Array<InputEmbedContribution['providerDependencies']['providers'][number]>;
  authoringSites: Array<NonNullable<InputEmbedContribution['authoringSites']>[number]>;
}>;

/** 在当前根 Scene traversal 中归一化 Legend 的一个必填 slot */
const normalizeLegendSlot = (
  child: InputLegendChild,
  label: string,
  context: InputEmbedContext,
  collected: CollectedLegendSlots,
) => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Standard Legend inputs require Kernel Vanilla normalizeScene.',
      details: { operation: 'LegendInputEmbedAdapter' },
    });
  }
  const normalized = normalizeChildren([child]);
  if (normalized.children.length !== 1) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: `${label} must normalize to exactly one IRChild.`,
      details: { childCount: normalized.children.length, label },
    });
  }
  collected.roots.push(...normalized.providerDependencies.roots);
  collected.providers.push(...normalized.providerDependencies.providers);
  collected.authoringSites.push(...normalized.authoringSites);
  return normalized.children[0];
};

/** Standard Legend 的 InputEmbed adapter */
export const LegendInputEmbedAdapter: InputEmbedAdapter<InputLegend> = {
  kind: StandardLegendEmbedKind,
  lower: (props, context) => {
    const collected: CollectedLegendSlots = { roots: [], providers: [], authoringSites: [] };
    const title =
      props.title === undefined
        ? undefined
        : normalizeLegendSlot(props.title, 'Standard Legend title', context, collected);
    const content =
      props.content.kind === 'items'
        ? {
            ...props.content,
            items: props.content.items.map(item => ({
              ...item,
              sample: normalizeLegendSlot(item.sample, `Standard Legend item '${item.key}' sample`, context, collected),
              ...(item.label === undefined
                ? {}
                : {
                    label: normalizeLegendSlot(
                      item.label,
                      `Standard Legend item '${item.key}' label`,
                      context,
                      collected,
                    ),
                  }),
            })),
          }
        : {
            ...props.content,
            sample: normalizeLegendSlot(props.content.sample, 'Standard Legend ramp sample', context, collected),
            ticks: props.content.ticks.map(tick => ({
              ...tick,
              ...(tick.label === undefined
                ? {}
                : {
                    label: normalizeLegendSlot(
                      tick.label,
                      `Standard Legend tick '${tick.key}' label`,
                      context,
                      collected,
                    ),
                  }),
            })),
          };
    return {
      node: createLegend({
        ...props,
        ...(title === undefined ? {} : { title }),
        content,
      }),
      providerDependencies: {
        roots: [LegendProvider.key, ...collected.roots],
        providers: [LegendProvider, ...collected.providers],
      },
      ...(collected.authoringSites.length === 0 ? {} : { authoringSites: collected.authoringSites }),
    };
  },
};

/** 创建由 LegendInputEmbedAdapter 下沉的 Standard Legend embed */
export const legend = (id: string, input: InputLegend): InputEmbed<InputLegend> => ({
  type: 'embed',
  kind: StandardLegendEmbedKind,
  id,
  props: input,
});
