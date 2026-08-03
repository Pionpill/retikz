import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { LegendInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createLegend, LegendContentKind, LegendDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardLegendReactNamespace } from '../shared';
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

/** 当前 Layout 内贡献 Standard LegendDefinition 的稳定 maker */
const makeLegendComposites = () => [LegendDefinition];

/** 将 items form 的提升字段与 marker tree 组装为 Standard LegendInput */
const createItemsLegend = (props: LegendItemsFormProps) => {
  const { kind, children, direction, wrap, columnGap, rowGap, sampleGap, sampleAlign, ...legend } = props;
  const converted = convertLegendItemsChildren(children);
  return createLegend({
    ...legend,
    ...(converted.title === undefined ? {} : { title: converted.title }),
    content: {
      kind,
      items: converted.items,
      ...(direction === undefined ? {} : { direction }),
      ...(wrap === undefined ? {} : { wrap }),
      ...(columnGap === undefined ? {} : { columnGap }),
      ...(rowGap === undefined ? {} : { rowGap }),
      ...(sampleGap === undefined ? {} : { sampleGap }),
      ...(sampleAlign === undefined ? {} : { sampleAlign }),
    },
  });
};

/** 将 ramp form 的提升字段与 marker tree 组装为 Standard LegendInput */
const createRampLegend = (props: LegendRampFormProps) => {
  const { kind, children, direction, sampleGap, ...legend } = props;
  const converted = convertLegendRampChildren(children);
  return createLegend({
    ...legend,
    ...(converted.title === undefined ? {} : { title: converted.title }),
    content: {
      kind,
      sample: converted.sample,
      ticks: converted.ticks,
      ...(direction === undefined ? {} : { direction }),
      ...(sampleGap === undefined ? {} : { sampleGap }),
    },
  });
};

const legendEmbeddableAdapter: EmbeddableTier2Adapter<LegendProps> = {
  displayName: 'Legend',
  namespace: StandardLegendReactNamespace,
  contribute: props => {
    if ('content' in props || 'title' in props || !('kind' in props)) {
      throw new Error(
        'React Legend uses marker children with an explicit kind; content and title props are not supported.',
      );
    }
    return {
      node: props.kind === LegendContentKind.Items ? createItemsLegend(props) : createRampLegend(props),
      datasets: {},
      makeComposites: makeLegendComposites,
    };
  },
};

const LegendComponent: FC<LegendProps> = () => null;

/** Standard Legend 的 React Tier 2 无头 authoring 组件 */
export const Legend = LegendComponent as StandardEmbeddableComponent<LegendProps>;

Legend.displayName = 'Legend';
Legend.isTier2Embeddable = true;
Legend.embeddableAdapter = legendEmbeddableAdapter;
