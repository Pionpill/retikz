import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { GridInput } from '@retikz/standard';
import type { FC } from 'react';

import { createGrid, GridProvider } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

/** React Grid 组件接受的 Standard authoring 输入 */
export type GridProps = GridInput;

const gridEmbeddableAdapter: EmbeddableTier2Adapter<GridProps> = {
  displayName: 'Grid',
  contribute: props => ({
    node: createGrid(props),
    compositeDependencies: { roots: [GridProvider.key], providers: [GridProvider] },
  }),
};

const GridComponent: FC<GridProps> = () => null;

/** Standard Grid 的 React Tier 2 authoring 组件 */
export const Grid = GridComponent as StandardEmbeddableComponent<GridProps>;

Grid.displayName = 'Grid';
Grid.isTier2Embeddable = true;
Grid.embeddableAdapter = gridEmbeddableAdapter;
