import type { ValueOf } from '@retikz/foundation';
import type { LucideIcon } from 'lucide-react';

import { ChartNoAxesCombined, Cpu, TableProperties } from 'lucide-react';

/** Bench 可承载的产品模块 */
export const BenchModuleId = {
  Kernel: 'kernel',
  Plot: 'plot',
  Table: 'table',
} as const;

/** Bench 可承载的产品模块取值 */
export type BenchModuleIdValue = ValueOf<typeof BenchModuleId>;

/** 模块标题翻译键 */
export type BenchModuleTitleKey = `module.${BenchModuleIdValue}`;

/** 模块说明翻译键 */
export type BenchModuleDescriptionKey = `module.${BenchModuleIdValue}Description`;

/** Bench 模块入口配置 */
export type BenchModule = Readonly<{
  /** 模块稳定标识 */
  id: BenchModuleIdValue;
  /** 模块一级路由 */
  path: `/${BenchModuleIdValue}`;
  /** 模块图标 */
  icon: LucideIcon;
  /** 模块标题翻译键 */
  title: BenchModuleTitleKey;
  /** 模块说明翻译键 */
  description: BenchModuleDescriptionKey;
  /** 是否已经接入可运行测试集 */
  available: boolean;
}>;

const kernelModule: BenchModule = Object.freeze({
  id: BenchModuleId.Kernel,
  path: '/kernel',
  icon: Cpu,
  title: 'module.kernel',
  description: 'module.kernelDescription',
  available: true,
});

/** Bench 长期支持的模块入口 */
export const benchModules: ReadonlyArray<BenchModule> = Object.freeze([
  kernelModule,
  Object.freeze({
    id: BenchModuleId.Plot,
    path: '/plot',
    icon: ChartNoAxesCombined,
    title: 'module.plot',
    description: 'module.plotDescription',
    available: false,
  }),
  Object.freeze({
    id: BenchModuleId.Table,
    path: '/table',
    icon: TableProperties,
    title: 'module.table',
    description: 'module.tableDescription',
    available: false,
  }),
]);

/** Bench 根路径默认进入的模块 */
export const defaultBenchModule: BenchModule = kernelModule;
