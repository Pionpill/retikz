import type { CompositeDefinition } from '../../contract/composite';

export const BUILTIN_COMPOSITES: Array<CompositeDefinition> = [];

export const resolveCompositeRegistry = (composites?: Array<CompositeDefinition>): Array<CompositeDefinition> =>
  composites ?? BUILTIN_COMPOSITES;
