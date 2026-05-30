/**
 * builders 聚合 barrel —— Scene → `SvgNode` 的**公开** builder
 * @description 只聚合对外公开的构造函数,故根 `index.ts` 可直接 `export *`。**内部 helper 不进本 barrel、不外泄**：
 *   `arrowCollect`（collectArrowSpecs / stableSpecKey / hashKey）与 `attrs`（compact）只供包内直接 import
 *   （如 `document.ts` 走 `./arrowCollect`），不属于公开 API。
 */
export * from './prim';
export * from './markerPrim';
export * from './paintDefs';
export * from './clipDefs';
export * from './arrowMarkers';
export * from './document';
