import type { CoreDependencyProvider } from '@retikz/core';

import { ParabolaPathGeneratorDefinition } from './definition';

const makeParabolaPathGeneratorDefinition = () => ParabolaPathGeneratorDefinition;

/** Parabola 路径生成器的静态 Core 提供者 */
export const ParabolaPathGeneratorProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'pathGenerator', name: ParabolaPathGeneratorDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeParabolaPathGeneratorDefinition,
});
