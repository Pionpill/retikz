export * from './compile';
export * from './contract';
export * from './error';
export * from './parse';
export * from './providers';
export { DEFAULT_RESOLVED_THEME, resolveTheme } from './resolve';
export { resolvePathLabelPlacement } from './resolve';
export type { CanonicalPathLabelPlacement, PathLabelGeometryOptions } from './resolve';
export * from './schemas';
export * from './shared';

// 仅公开跨包样式组合所需的解析能力，其他 resolving 类型保持内部
export { mergeGraphicStyle, resolveGraphicOpacity } from './resolve';
export type { GraphicOpacityResolution } from './resolve';
