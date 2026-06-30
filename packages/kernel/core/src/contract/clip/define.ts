import type { ClipDefinition, ClipDefinitionInput, ClipSpecLike } from './types';

export const defineClip = <TSpec extends ClipSpecLike>(definition: ClipDefinitionInput<TSpec>): ClipDefinition => {
  if (definition.kind.trim().length === 0) {
    throw new Error('clip provider key must be a non-empty string.');
  }
  return definition as unknown as ClipDefinition;
};
