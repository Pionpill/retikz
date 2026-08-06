import type { AnyInspectorDefinition } from '@retikz/inspect';
import type { CreateInspectionVanillaDriverOptions } from '@retikz/inspect/vanilla';

import { createInspectorRegistry } from '@retikz/inspect';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '@retikz/inspect/vanilla';
import { FLEX_LAYOUT_INSPECTOR, GRID_LAYOUT_INSPECTOR, OVERLAY_LAYOUT_INSPECTOR } from '@retikz/standard/inspect';

/** Standard 检查编译驱动的创建选项 */
export type CreateStandardInspectionVanillaDriverOptions = Omit<CreateInspectionVanillaDriverOptions, 'registry'> &
  Readonly<{
    /** 除三种 Standard 布局检查器外追加的自定义定义 */
    inspectors?: ReadonlyArray<AnyInspectorDefinition>;
  }>;

/** 创建默认包含三种 Standard 布局检查器的 Vanilla 编译驱动 */
export const createStandardInspectionVanillaDriver = (
  options: CreateStandardInspectionVanillaDriverOptions = {},
): ReturnType<typeof createInspectionVanillaDriver> => {
  const { inspectors = [], ...driver } = options;
  return createInspectionVanillaDriver({
    ...driver,
    registry: createInspectorRegistry([
      FLEX_LAYOUT_INSPECTOR,
      GRID_LAYOUT_INSPECTOR,
      OVERLAY_LAYOUT_INSPECTOR,
      ...inspectors,
    ]),
  });
};

/** 创建阻止当前图形或作用域内全部检查器的边界标记 */
export const createStandardInspectionBarrier = (): ReturnType<typeof createInspectionVanillaAuthoring> =>
  createInspectionVanillaAuthoring(false);
