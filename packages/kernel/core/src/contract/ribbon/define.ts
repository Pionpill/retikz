import type { IRJsonObject } from '../../schemas/json';
import type { RibbonWidthProfileDefinition, RibbonWidthProfileDefinitionInput } from './types';

export const defineRibbonWidthProfile = <TParams extends IRJsonObject = IRJsonObject>(
  definition: RibbonWidthProfileDefinitionInput<TParams>,
): RibbonWidthProfileDefinition => definition as unknown as RibbonWidthProfileDefinition;
