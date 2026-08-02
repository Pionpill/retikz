import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { LegendInput } from '@retikz/standard';
import type { FC } from 'react';

import { createLegend, LegendDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

/** React Legend 组件接受的 Standard plain-data authoring 输入 */
export type LegendProps = LegendInput;

/** 当前 Layout 内贡献 Standard LegendDefinition 的稳定 maker */
const makeLegendComposites = () => [LegendDefinition];

const legendEmbeddableAdapter: EmbeddableTier2Adapter<LegendProps> = {
  displayName: 'Legend',
  namespace: 'standard.legend',
  contribute: props => ({
    node: createLegend(props),
    datasets: {},
    makeComposites: makeLegendComposites,
  }),
};

const LegendComponent: FC<LegendProps> = () => null;

/** Standard Legend 的 React Tier 2 authoring 组件 */
export const Legend = LegendComponent as StandardEmbeddableComponent<LegendProps>;

Legend.displayName = 'Legend';
Legend.isTier2Embeddable = true;
Legend.embeddableAdapter = legendEmbeddableAdapter;
