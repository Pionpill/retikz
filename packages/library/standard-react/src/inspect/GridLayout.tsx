import type { GridLayoutInspectOptions } from '@retikz/standard/inspect';
import type { FC } from 'react';

import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/standard/inspect';

import type { GridLayoutProps } from '../grid-layout';

import { GridLayout as BaseGridLayout } from '../grid-layout';
import { createStandardLayoutReactAuthoring } from './authoring';

/** 带检查能力的 Grid 布局属性 */
export type InspectGridLayoutProps = Omit<GridLayoutProps, 'authoring'> &
  Readonly<{
    /** 是否检查当前布局实例，或覆盖本实例的检查选项
     * @default true
     */
    inspect?: false | true | GridLayoutInspectOptions;
  }>;

/** 为当前 Grid 布局实例声明检查请求 */
export const InspectGridLayout: FC<InspectGridLayoutProps> = props => {
  const { inspect = true, ...layout } = props;
  return (
    <BaseGridLayout {...layout} authoring={createStandardLayoutReactAuthoring(GRID_LAYOUT_INSPECTOR_KEY, inspect)} />
  );
};
