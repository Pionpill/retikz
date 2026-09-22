import { AxesInputEmbedAdapter } from '@retikz/standard-vanilla/presentation';
import type { AxesInput } from '@retikz/standard/presentation';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';

/** React Axes 组件接受的 Standard authoring 输入 */
export type AxesProps = AxesInput;

const AxesComponent: FC<AxesProps> = () => null;

/** Standard Axes 的 React Tier 2 authoring 组件 */
export const Axes = AxesComponent as StandardEmbeddableComponent<AxesProps>;

Axes.displayName = 'Axes';
Axes.isTier2Embeddable = true;
Axes.inputEmbedAdapter = AxesInputEmbedAdapter;
