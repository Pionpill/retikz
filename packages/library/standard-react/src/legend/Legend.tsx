import type { ReactInputEmbedContext } from '@retikz/react';
import type { LegendInput } from '@retikz/standard';
import type { InputLegend } from '@retikz/standard-vanilla';
import type { FC, ReactNode } from 'react';

import { withInputEmbedAdapters } from '@retikz/react';
import { LegendContentKind } from '@retikz/standard';
import { LegendInputEmbedAdapter } from '@retikz/standard-vanilla';

import type { StandardEmbeddableComponent } from '../shared';

import { convertLegendItemsChildren, convertLegendRampChildren } from './convert-children';

type LegendItemsContentInput = Extract<LegendInput['content'], { kind: 'items' }>;
type LegendRampContentInput = Extract<LegendInput['content'], { kind: 'ramp' }>;
type LegendSharedProps = Omit<LegendInput, 'title' | 'content'>;

/** React items Legend 的显式组合式 authoring 属性 */
export type LegendItemsFormProps = LegendSharedProps &
  Omit<LegendItemsContentInput, 'kind' | 'items'> &
  Readonly<{
    /** 显式选择离散条目 form */
    kind: typeof LegendContentKind.Items;
    /** LegendTitle 与按声明顺序排列的 LegendItem marker */
    children?: ReactNode;
  }>;

/** React ramp Legend 的显式组合式 authoring 属性 */
export type LegendRampFormProps = LegendSharedProps &
  Omit<LegendRampContentInput, 'kind' | 'sample' | 'ticks'> &
  Readonly<{
    /** 显式选择连续样本 form */
    kind: typeof LegendContentKind.Ramp;
    /** LegendTitle、唯一 LegendRamp 与按声明顺序排列的 LegendTick marker */
    children?: ReactNode;
  }>;

/** React Legend 的两个显式无头 authoring form */
export type LegendProps = LegendItemsFormProps | LegendRampFormProps;

/** 将 items form 的提升字段与 marker tree 收集为 Standard Vanilla Input */
const createItemsLegend = (props: LegendItemsFormProps, context: ReactInputEmbedContext) => {
  const { kind, children, direction, wrap, gap, sampleGap, sampleAlign, ...legend } = props;
  const converted = convertLegendItemsChildren(children, context);
  return {
    input: {
      ...legend,
      ...(converted.value.title === undefined ? {} : { title: converted.value.title }),
      content: {
        kind,
        items: converted.value.items,
        ...(direction === undefined ? {} : { direction }),
        ...(wrap === undefined ? {} : { wrap }),
        ...(gap === undefined ? {} : { gap }),
        ...(sampleGap === undefined ? {} : { sampleGap }),
        ...(sampleAlign === undefined ? {} : { sampleAlign }),
      },
    } satisfies InputLegend,
    adapters: converted.adapters,
  };
};

/** 将 ramp form 的提升字段与 marker tree 收集为 Standard Vanilla Input */
const createRampLegend = (props: LegendRampFormProps, context: ReactInputEmbedContext) => {
  const { kind, children, direction, sampleGap, ...legend } = props;
  const converted = convertLegendRampChildren(children, context);
  return {
    input: {
      ...legend,
      ...(converted.value.title === undefined ? {} : { title: converted.value.title }),
      content: {
        kind,
        sample: converted.value.sample,
        ticks: converted.value.ticks,
        ...(direction === undefined ? {} : { direction }),
        ...(sampleGap === undefined ? {} : { sampleGap }),
      },
    } satisfies InputLegend,
    adapters: converted.adapters,
  };
};

/** 将 Legend marker children 组装为 Standard Vanilla Input */
const createLegendInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const collected =
    (props as LegendProps).kind === LegendContentKind.Items
      ? createItemsLegend(props as LegendItemsFormProps, context)
      : createRampLegend(props as LegendRampFormProps, context);
  return withInputEmbedAdapters(collected.input, collected.adapters);
};

const LegendComponent: FC<LegendProps> = () => null;

/** Standard Legend 的 React Tier 2 无头 authoring 组件 */
export const Legend = LegendComponent as StandardEmbeddableComponent<LegendProps>;

Legend.displayName = 'Legend';
Legend.isTier2Embeddable = true;
Legend.inputEmbedAdapter = LegendInputEmbedAdapter;
Legend.createInputEmbedProps = createLegendInput;
