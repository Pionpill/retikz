import type { PathResolution, PathResolveContext, StrokePathResolution } from '../../src/resolve/path';
import type { IRPathBase } from '../../src/schemas';

import {
  resolveArrowRegistry,
  resolvePathGeneratorRegistry,
  resolvePathKindRegistry,
  resolvePatternRegistry,
} from '../../src';
import { resolvePath, resolveStrokePathProviders } from '../../src/resolve/path';

type BuiltinProviderContext = Omit<Partial<PathResolveContext>, 'pathKinds' | 'pathGenerators' | 'arrows'> &
  Partial<Pick<PathResolveContext, 'pathKinds' | 'pathGenerators' | 'arrows' | 'patterns' | 'round'>>;

const contextWithBuiltinProviders = (context: BuiltinProviderContext): PathResolveContext => ({
  pathKinds: resolvePathKindRegistry(),
  pathGenerators: resolvePathGeneratorRegistry(),
  arrows: resolveArrowRegistry(),
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
