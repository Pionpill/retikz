import type { OverlayLayoutInspectOptions } from '@retikz/standard/inspect';
import type { FC } from 'react';

import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/standard/inspect';

import type { OverlayLayoutProps } from '../overlay-layout';

import { OverlayLayout as BaseOverlayLayout } from '../overlay-layout';
import { createStandardLayoutReactAuthoring } from './authoring';

/** 带检查能力的 Overlay 布局属性 */
export type InspectOverlayLayoutProps = Omit<OverlayLayoutProps, 'authoring'> &
  Readonly<{
    /** 是否检查当前布局实例，或覆盖本实例的检查选项
     * @default true
     */
    inspect?: false | true | OverlayLayoutInspectOptions;
  }>;

/** 为当前 Overlay 布局实例声明检查请求 */
export const InspectOverlayLayout: FC<InspectOverlayLayoutProps> = props => {
  const { inspect = true, ...layout } = props;
  return (
    <BaseOverlayLayout
      {...layout}
      authoring={createStandardLayoutReactAuthoring(OVERLAY_LAYOUT_INSPECTOR_KEY, inspect)}
    />
  );
};
