import { resolveArrowRegistry, resolvePathRegistry, resolvePatternRegistry } from '../../src';
import type { PathResolution, PathResolveContext, StrokePathResolution } from '../../src/resolve/path';
import { resolvePath, resolveStrokePathProviders } from '../../src/resolve/path';
import type { IRPathBase } from '../../src/schemas';

type BuiltinProviderContext = Omit<Partial<PathResolveContext>, 'pathRegistry' | 'arrowRegistry'> &
  Partial<Pick<PathResolveContext, 'pathRegistry' | 'arrowRegistry' | 'patternRegistry' | 'round'>>;

const contextWithBuiltinProviders = (context: BuiltinProviderContext): PathResolveContext => ({
  mode: 'light',
  pathRegistry: resolvePathRegistry(),
  arrowRegistry: resolveArrowRegistry(),
  patternRegistry: resolvePatternRegistry(),
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
