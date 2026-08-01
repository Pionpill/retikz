import type { ReactNode } from 'react';
import type { LoaderFunctionArgs, RouteObject } from 'react-router';

import { redirect } from 'react-router';

import type { BenchModule } from './module-registry';

import { benchModules, defaultBenchModule } from './module-registry';
import { BenchCaseView, getBenchCasePath, getDefaultBenchTestCase, getModuleTestCases } from './test-catalog';

/** 为模块路由创建 React element */
export type BenchModuleElementFactory = (module: BenchModule) => ReactNode;

const defaultBenchCase = getDefaultBenchTestCase(defaultBenchModule.id);
if (defaultBenchCase === undefined) throw new Error('Default Bench module requires a runnable test case');

const defaultBenchPath = getBenchCasePath(defaultBenchModule.id, defaultBenchCase.id, BenchCaseView.Run);

/** 将无效入口重定向到默认 Bench 用例 */
const redirectToDefaultCase = () => redirect(defaultBenchPath);

/** 创建不依赖浏览器 App 的 Bench 一级路由 */
export const createBenchRoutes = (createModuleElement: BenchModuleElementFactory): Array<RouteObject> => {
  const moduleRoutes = benchModules.flatMap<RouteObject>(module => {
    const testCases = getModuleTestCases(module.id);
    if (testCases.length === 0) return [{ path: module.path, element: createModuleElement(module) }];
    const moduleDefaultPath = getBenchCasePath(module.id, testCases[0].id, BenchCaseView.Run);
    return [
      { path: module.path, loader: () => redirect(moduleDefaultPath) },
      {
        path: `${module.path}/cases/:caseId/:view`,
        loader: ({ params }: LoaderFunctionArgs) => {
          const hasTestCase = testCases.some(testCase => testCase.id === params.caseId);
          const hasView = Object.values(BenchCaseView).some(view => view === params.view);
          return hasTestCase && hasView ? null : redirect(defaultBenchPath);
        },
        element: createModuleElement(module),
      },
    ];
  });
  return [{ path: '/', loader: redirectToDefaultCase }, ...moduleRoutes, { path: '*', loader: redirectToDefaultCase }];
};
