import type { GridInput } from '@retikz/standard';
import type { FC } from 'react';

import { GridInputEmbedAdapter } from '@retikz/standard-vanilla';

import type { StandardEmbeddableComponent } from '../shared';

/** React Grid 组件接受的 Standard authoring 输入 */
export type GridProps = GridInput;

const GridComponent: FC<GridProps> = () => null;

/** Standard Grid 的 React Tier 2 authoring 组件 */
export const Grid = GridComponent as StandardEmbeddableComponent<GridProps>;

Grid.displayName = 'Grid';
Grid.isTier2Embeddable = true;
Grid.inputEmbedAdapter = GridInputEmbedAdapter;
