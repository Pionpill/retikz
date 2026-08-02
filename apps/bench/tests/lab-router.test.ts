import { createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { createBenchRoutes } from '../src/playground/app/routes';

type MemoryRouter = ReturnType<typeof createMemoryRouter>;
const benchRoutes = createBenchRoutes(() => null);

/** 等待 memory router 完成 loader 与重定向 */
const waitForRouterIdle = async (router: MemoryRouter): Promise<void> => {
  if (router.state.initialized && router.state.navigation.state === 'idle') return;
  await new Promise<void>(resolve => {
    const unsubscribe = router.subscribe(state => {
      if (!state.initialized || state.navigation.state !== 'idle') return;
      unsubscribe();
      resolve();
    });
  });
};

/** 返回指定初始地址经过 Bench routes 解析后的路径 */
const resolvePath = async (path: string): Promise<string> => {
  const router = createMemoryRouter(benchRoutes, { initialEntries: [path] });
  try {
    await waitForRouterIdle(router);
    return router.state.location.pathname;
  } finally {
    router.dispose();
  }
};

/** 返回指定初始地址经过 Bench routes 解析后的路由参数 */
const resolveParams = async (path: string): Promise<Readonly<Record<string, string | undefined>>> => {
  const router = createMemoryRouter(benchRoutes, { initialEntries: [path] });
  try {
    await waitForRouterIdle(router);
    return router.state.matches.at(-1)?.params ?? {};
  } finally {
    router.dispose();
  }
};

describe('Bench module routes', () => {
  it.each(['/plot', '/table'])('保留尚未开放模块的一级路由 %s', async path => {
    await expect(resolvePath(path)).resolves.toBe(path);
  });

  it.each(['/', '/kernel', '/missing'])('将 %s 重定向到默认 Kernel 用例', async path => {
    await expect(resolvePath(path)).resolves.toBe('/kernel/cases/single-entity-update/preview');
  });

  it.each(['preview', 'benchmark', 'reports'])('保留合法用例页面 %s', async view => {
    const path = `/kernel/cases/single-entity-update/${view}`;
    await expect(resolvePath(path)).resolves.toBe(path);
  });

  it('向用例工作区暴露当前用例和页面参数', async () => {
    await expect(resolveParams('/kernel/cases/single-entity-update/benchmark')).resolves.toEqual({
      caseId: 'single-entity-update',
      view: 'benchmark',
    });
  });

  it.each([
    '/kernel/cases/missing/preview',
    '/kernel/cases/single-entity-update/missing',
    '/kernel/cases/single-entity-update/config',
    '/kernel/cases/single-entity-update/run',
  ])('将无效用例地址 %s 重定向到默认用例', async path => {
    await expect(resolvePath(path)).resolves.toBe('/kernel/cases/single-entity-update/preview');
  });
});
