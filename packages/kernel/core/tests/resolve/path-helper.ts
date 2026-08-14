import type {
  PathResolution,
  PathResolveContext,
  RibbonPathResolution,
  StrokePathResolution,
} from '../../src/resolve/path';
import type { IRPathBase } from '../../src/schemas';

import {
  resolveArrowRegistry,
  resolvePathGeneratorRegistry,
  resolvePathKindRegistry,
  resolvePatternRegistry,
  resolveRibbonWidthProfileRegistry,
} from '../../src';
import { resolvePath, resolveRibbonPathProviders, resolveStrokePathProviders } from '../../src/resolve/path';

type BuiltinProviderContext = Omit<
  Partial<PathResolveContext>,
  'pathKinds' | 'pathGenerators' | 'arrows' | 'ribbonWidthProfiles'
> &
  Partial<
    Pick<PathResolveContext, 'pathKinds' | 'pathGenerators' | 'arrows' | 'ribbonWidthProfiles' | 'patterns' | 'round'>
  >;

const contextWithBuiltinProviders = (context: BuiltinProviderContext): PathResolveContext => ({
  pathKinds: resolvePathKindRegistry(),
  pathGenerators: resolvePathGeneratorRegistry(),
  arrows: resolveArrowRegistry(),
  ribbonWidthProfiles: resolveRibbonWidthProfileRegistry(),
  patterns: resolvePatternRegistry(),
  round: value => value,
  ...context,
});

/** resolve/path 测试统一注入内置 provider 的最小入口 */
export const resolvePathWithBuiltinProviders = (
  path: IRPathBase,
  context: BuiltinProviderContext = {},
): PathResolution => resolvePath(path, contextWithBuiltinProviders(context));

/** resolve/path 测试统一绑定 stroke emitter 所需的 provider */
export const resolveStrokePathWithBuiltinProviders = (
  path: IRPathBase,
  context: BuiltinProviderContext = {},
): StrokePathResolution => {
  const providerContext = contextWithBuiltinProviders(context);
  return resolveStrokePathProviders(resolvePath(path, providerContext), providerContext);
};

/** resolve/path 测试统一绑定 ribbon emitter 所需的 provider */
export const resolveRibbonPathWithBuiltinProviders = (
  path: IRPathBase,
  context: BuiltinProviderContext = {},
): RibbonPathResolution => {
  const providerContext = contextWithBuiltinProviders(context);
  return resolveRibbonPathProviders(resolvePath(path, providerContext), providerContext);
};
