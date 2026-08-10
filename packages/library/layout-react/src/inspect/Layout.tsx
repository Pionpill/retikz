import type { AnyInspectorDefinition } from '@retikz/inspect';
import type { InspectLayoutProps } from '@retikz/inspect/react';
import type { FC } from 'react';

import { createInspectorRegistry } from '@retikz/inspect';
import { InspectLayout as BaseInspectLayout } from '@retikz/inspect/react';
import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '@retikz/layout/inspect';

/** Layout 检查宿主的属性 */
export type LayoutInspectLayoutProps = Omit<InspectLayoutProps, 'registry'> &
  Readonly<{
    /** 除三种 Layout 布局检查器外追加的自定义定义 */
    inspectors?: ReadonlyArray<AnyInspectorDefinition>;
  }>;

/** 默认注册三种 Layout 布局检查器的可选布局宿主 */
export const LayoutInspectLayout: FC<LayoutInspectLayoutProps> = props => {
  const { inspectors = [], ...layout } = props;
  const registry = createInspectorRegistry([
    FLEX_LAYOUT_INSPECTOR,
    GRID_LAYOUT_INSPECTOR,
    OVERLAY_LAYOUT_INSPECTOR,
    ...inspectors,
  ]);
  return <BaseInspectLayout {...layout} registry={registry} />;
};
