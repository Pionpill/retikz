/** 仅供仓库内 Node/tsx 源码入口预加载；发布包由构建替换宏，不依赖此全局 */
Object.defineProperty(globalThis, '__DEV__', {
  value: process.env.NODE_ENV !== 'production',
  configurable: true,
});
