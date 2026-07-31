import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

import { redirect } from 'react-router';

import type { BenchModule } from '../workspace';

import { benchModules, defaultBenchModule } from '../workspace';

/** 为模块路由创建 React element */
export type BenchModuleElementFactory = (module: BenchModule) => ReactNode;

/** 将无效入口重定向到默认 Bench 模块 */
const redirectToDefaultModule = () => redirect(defaultBenchModule.path);

/** 创建不依赖浏览器 App 的 Bench 一级路由 */
export const createBenchRoutes = (createModuleElement: BenchModuleElementFactory): Array<RouteObject> => [
  { path: '/', loader: redirectToDefaultModule },
  ...benchModules.map(module => ({
    path: module.path,
    element: createModuleElement(module),
  })),
  { path: '*', loader: redirectToDefaultModule },
];
