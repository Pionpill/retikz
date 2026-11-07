/**
 * builders 聚合 barrel —— Scene → `SvgNode` 的构造能力
 * @description 包内通过本 barrel 复用构造能力；公开子入口单独筛选稳定 builder，不转发只读图层组装。
 *   `arrow-collect` 的 hashKey 与 `attrs` 的 compact 仅服务相邻实现，不进入本 barrel
 */
export * from './arrow-markers';
export * from './clip-defs';
export * from './document';
export * from './paint-defs';
export * from './prim';
export * from './readonly-layer';
