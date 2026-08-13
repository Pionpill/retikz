import type { CoreDependencyProvider } from '@retikz/core';

import { CompoundClipDefinition } from './definition';

const makeCompoundClipDefinition = () => CompoundClipDefinition;

/** Compound Clip 的静态 Core provider */
export const CompoundClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: CompoundClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeCompoundClipDefinition,
});
