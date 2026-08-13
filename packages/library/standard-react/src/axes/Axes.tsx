import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { AxesInput } from '@retikz/standard';
import type { FC } from 'react';

import { AxesProvider, createAxes } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

/** React Axes 组件接受的 Standard authoring 输入 */
export type AxesProps = AxesInput;

const axesEmbeddableAdapter: EmbeddableTier2Adapter<AxesProps> = {
  displayName: 'Axes',
  contribute: props => ({
    node: createAxes(props),
    providerDependencies: { roots: [AxesProvider.key], providers: [AxesProvider] },
  }),
};

const AxesComponent: FC<AxesProps> = () => null;

/** Standard Axes 的 React Tier 2 authoring 组件 */
export const Axes = AxesComponent as StandardEmbeddableComponent<AxesProps>;

Axes.displayName = 'Axes';
Axes.isTier2Embeddable = true;
Axes.embeddableAdapter = axesEmbeddableAdapter;
