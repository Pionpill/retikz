import type { FlexLayoutInspectOptions } from '@retikz/standard/inspect';
import type { FC } from 'react';

import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/standard/inspect';

import type { FlexLayoutProps } from '../flex-layout';

import { FlexLayout as BaseFlexLayout } from '../flex-layout';
import { createStandardLayoutReactAuthoring } from './authoring';

/** 带检查能力的 Flex 布局属性 */
export type InspectFlexLayoutProps = Omit<FlexLayoutProps, 'authoring'> &
  Readonly<{
    /** 是否检查当前布局实例，或覆盖本实例的检查选项
     * @default true
     */
    inspect?: false | true | FlexLayoutInspectOptions;
  }>;

/** 为当前 Flex 布局实例声明检查请求 */
export const InspectFlexLayout: FC<InspectFlexLayoutProps> = props => {
  const { inspect = true, ...layout } = props;
  return (
    <BaseFlexLayout {...layout} authoring={createStandardLayoutReactAuthoring(FLEX_LAYOUT_INSPECTOR_KEY, inspect)} />
  );
};
