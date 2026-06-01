/**
 * `formatViewBox` 已下沉到 `@retikz/render/svg`（renderer-neutral，纯函数）；此处 re-export 保持 react 内部引用与
 * 既有测试入口不变。
 */
export { formatViewBox } from '@retikz/render/svg';
