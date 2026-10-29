import type { Plugin } from 'vite';

/** 统一源码消费与发布构建的开发环境标识 */
export const createRetikzDevPlugin = (): Plugin => ({
  name: 'retikz-dev',
  // Vitest 会在 config 阶段提取 define 并在 worker 中求值，不能先放入占位布尔值
  config: () => ({ define: { __DEV__: "process.env.NODE_ENV !== 'production'" } }),
  configResolved(config) {
    // 等待 Vite 解析 .env 与 NODE_ENV；库产物保留判断，由消费方决定开发提示与生产裁剪
    const define = {
      __DEV__:
        config.command === 'build' && config.build.lib ? "process.env.NODE_ENV !== 'production'" : !config.isProduction,
    };
    // config hook 已建立根 define；Vitest 与各 Vite environment 共用同一语义
    Object.assign(config.define!, define);
    for (const environment of Object.values(config.environments)) {
      environment.define = { ...environment.define, ...define };
    }
  },
});
