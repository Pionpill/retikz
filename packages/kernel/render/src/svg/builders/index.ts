/**
 * builders 聚合 barrel —— Scene → `SvgNode` 的**公开** builder
 * @description 只聚合对外公开的构造函数,故根 `index.ts` 可直接 `export *`。**内部 helper 不进本 barrel、不外泄**：
 *   `arrow-collect` 的 hashKey 与 `attrs` 的 compact 只供包内直接 import，不属于公开 API
 */
export * from './arrow-markers';
export * from './clip-defs';
export * from './document';
export * from './paint-defs';
export * from './prim';
export * from './readonly-layer';
