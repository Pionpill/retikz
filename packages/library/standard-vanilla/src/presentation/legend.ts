import type { AnyCoreDependencyProvider, CoreProviderKey } from '@retikz/core';
import type { IRLegendItem, IRLegendTick, InputLegendConfig } from '@retikz/standard/presentation';
import {
  RetikzStandardError,
  RetikzStandardErrorCode,
  createLegend,
  legendProvider,
} from '@retikz/standard/presentation';
import type {
  InputChild,
  InputEmbed,
  InputEmbedAuthoringSite,
  InputEmbedContext,
  SynchronousInputEmbedAdapter,
} from '@retikz/vanilla';

import { standardLegendEmbedKind } from '../shared/constants';

type InputLegendChild = InputChild;

type InputLegendItemsContent = Omit<Extract<InputLegendConfig['content'], { kind: 'items' }>, 'items'> & {
  items: Array<
    Omit<IRLegendItem, 'sample' | 'label'> & {
      sample: InputLegendChild;
      label?: InputLegendChild;
    }
  >;
};

type InputLegendRampContent = Omit<Extract<InputLegendConfig['content'], { kind: 'ramp' }>, 'sample' | 'ticks'> & {
  sample: InputLegendChild;
  ticks: Array<
    Omit<IRLegendTick, 'label'> & {
      label?: InputLegendChild;
    }
  >;
};

/** Standard Legend 的 framework-neutral authoring 输入 */
export type InputLegend = Omit<InputLegendConfig, 'title' | 'content'> & {
  /** 可选的图例标题，接受文本或绘制子内容 */
  title?: InputLegendChild;
  /** 互斥的离散图例项或连续色带内容 */
  content: InputLegendItemsContent | InputLegendRampContent;
};

type CollectedLegendSlots = Readonly<{
  roots: Array<CoreProviderKey>;
  providers: Array<AnyCoreDependencyProvider>;
  authoringSites: Array<InputEmbedAuthoringSite>;
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
      details: { operation: 'legendInputEmbedAdapter' },
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
export const legendInputEmbedAdapter: SynchronousInputEmbedAdapter<InputLegend> = {
  kind: standardLegendEmbedKind,
  lower: (props, context) => {
    const collected: CollectedLegendSlots = { roots: [], providers: [], authoringSites: [] };
    const { title: _title, content: _content, ...sourceProps } = props;
    void _title;
    void _content;

    const title =
      props.title === undefined
        ? undefined
        : normalizeLegendSlot(props.title, 'Standard Legend title', context, collected);
    const content =
      props.content.kind === 'items'
        ? {
            ...props.content,
            items: props.content.items.map(({ sample, label, ...item }) => ({
              ...item,
              sample: normalizeLegendSlot(sample, `Standard Legend item '${item.key}' sample`, context, collected),
              ...(label === undefined
                ? {}
                : {
                    label: normalizeLegendSlot(label, `Standard Legend item '${item.key}' label`, context, collected),
                  }),
            })),
          }
        : {
            ...props.content,
            sample: normalizeLegendSlot(props.content.sample, 'Standard Legend ramp sample', context, collected),
            ticks: props.content.ticks.map(({ label, ...tick }) => ({
              ...tick,
              ...(label === undefined
                ? {}
                : {
                    label: normalizeLegendSlot(label, `Standard Legend tick '${tick.key}' label`, context, collected),
                  }),
            })),
          };

    return {
      node: createLegend({
        ...sourceProps,
        ...(title === undefined ? {} : { title }),
        content,
      }),
      providerDependencies: {
        roots: [legendProvider.key, ...collected.roots],
        providers: [legendProvider, ...collected.providers],
      },
      ...(collected.authoringSites.length === 0 ? {} : { authoringSites: collected.authoringSites }),
    };
  },
};

/** 创建由 legendInputEmbedAdapter 下沉的 Standard Legend embed */
export const legend = (input: InputLegend): InputEmbed<InputLegend> => ({
  type: 'embed',
  kind: standardLegendEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
