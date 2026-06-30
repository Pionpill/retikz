import type { IRJsonObject } from '../../schemas/json';
import type { RibbonWidthProfileDefinition, RibbonWidthProfileInput } from './types';

export const defineRibbonWidthProfile = <TParams extends IRJsonObject = IRJsonObject>(
  definition: RibbonWidthProfileInput<TParams>,
): RibbonWidthProfileDefinition => definition as unknown as RibbonWidthProfileDefinition;
