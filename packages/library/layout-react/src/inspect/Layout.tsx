import type { InspectorRegistry } from '@retikz/inspect';
import { createInspectorRegistry, mergeInspectorRegistries } from '@retikz/inspect';
import type { InspectLayoutProps } from '@retikz/inspect/react';
import { InspectLayout as BaseInspectLayout } from '@retikz/inspect/react';
import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '@retikz/layout/inspect';
import type { FC } from 'react';

/** Layout 检查宿主的属性 */
export type LayoutInspectLayoutProps = Omit<InspectLayoutProps, 'registry'> &
  Readonly<{
    /** 除三种 Layout 布局检查器外合并的自定义检查 registry */
    registry?: InspectorRegistry;
  }>;

/** 默认注册三种 Layout 布局检查器的可选布局宿主 */
export const LayoutInspectLayout: FC<LayoutInspectLayoutProps> = props => {
  const { registry: customRegistry, ...layout } = props;
  const layoutRegistry = createInspectorRegistry([
    FLEX_LAYOUT_INSPECTOR,
    GRID_LAYOUT_INSPECTOR,
    OVERLAY_LAYOUT_INSPECTOR,
  ]);
  const registry =
    customRegistry === undefined ? layoutRegistry : mergeInspectorRegistries(layoutRegistry, customRegistry);
  return <BaseInspectLayout {...layout} registry={registry} />;
};
