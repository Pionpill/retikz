import { resolveArrowRegistry, resolvePathRegistry, resolvePatternRegistry } from '../../src';
import type { BoundPathResolution, PathCompileContext } from '../../src/compile/path';
import { bindPathTargets } from '../../src/compile/path';
import type { StrokePathResolution } from '../../src/resolve/path';
import { resolvePath, resolveStrokePathProviders } from '../../src/resolve/path';
import type { PathResolveContext } from '../../src/resolve/path/types';
import type { IRPathBase } from '../../src/schemas';

type BuiltinProviderContext = Partial<Pick<PathCompileContext, 'scopeChain' | 'targetResolver'>> &
  Omit<Partial<PathResolveContext>, 'pathRegistry' | 'arrowRegistry'> &
  Partial<Pick<PathResolveContext, 'pathRegistry' | 'arrowRegistry' | 'patternRegistry' | 'round'>>;

const contextWithBuiltinProviders = (context: BuiltinProviderContext): PathResolveContext => ({
  mode: 'light',
  rootFontSize: 16,
  gatingOn: false,
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
): BoundPathResolution => bindPathTargets(resolvePath(path, contextWithBuiltinProviders(context)), context);

/** resolve/path 测试统一绑定 stroke emitter 所需的 provider */
export const resolveStrokePathWithBuiltinProviders = (
  path: IRPathBase,
  context: BuiltinProviderContext = {},
): BoundPathResolution & StrokePathResolution => {
  const providerContext = contextWithBuiltinProviders(context);
  return resolveStrokePathProviders(bindPathTargets(resolvePath(path, providerContext), context), providerContext);
};
