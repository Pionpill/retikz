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

describe('Bench module routes', () => {
  it.each(['/kernel', '/plot', '/table'])('保留合法一级路由 %s', async path => {
    await expect(resolvePath(path)).resolves.toBe(path);
  });

  it.each(['/', '/missing'])('将 %s 重定向到 Kernel', async path => {
    await expect(resolvePath(path)).resolves.toBe('/kernel');
  });
});
