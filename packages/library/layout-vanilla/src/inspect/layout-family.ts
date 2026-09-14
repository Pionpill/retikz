import type { InspectorRegistry } from '@retikz/inspect';
import type { CreateInspectionVanillaDriverOptions } from '@retikz/inspect/vanilla';

import { createInspectorRegistry, mergeInspectorRegistries } from '@retikz/inspect';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '@retikz/inspect/vanilla';
import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '@retikz/layout/inspect';

/** Layout 检查编译驱动的创建选项 */
export type CreateLayoutInspectionVanillaDriverOptions = Omit<CreateInspectionVanillaDriverOptions, 'registry'> &
  Readonly<{
    /** 除三种 Layout 布局检查器外合并的自定义检查 registry */
    registry?: InspectorRegistry;
  }>;

/** 创建默认包含三种 Layout 布局检查器的 Vanilla 编译驱动 */
export const createLayoutInspectionVanillaDriver = (
  options: CreateLayoutInspectionVanillaDriverOptions = {},
): ReturnType<typeof createInspectionVanillaDriver> => {
  const { registry: customRegistry, ...driver } = options;
  const layoutRegistry = createInspectorRegistry([
    FLEX_LAYOUT_INSPECTOR,
    GRID_LAYOUT_INSPECTOR,
    OVERLAY_LAYOUT_INSPECTOR,
  ]);
  return createInspectionVanillaDriver({
    ...driver,
    registry: customRegistry === undefined ? layoutRegistry : mergeInspectorRegistries(layoutRegistry, customRegistry),
  });
};

/** 创建阻止当前图形或作用域内全部检查器的边界标记 */
export const createLayoutInspectionBarrier = (): ReturnType<typeof createInspectionVanillaAuthoring> =>
  createInspectionVanillaAuthoring(false);
