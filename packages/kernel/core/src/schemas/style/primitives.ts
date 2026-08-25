import { NonBlankStringSchema, NormalizedFractionSchema } from '@retikz/foundation';

export const CssColorSchema = NonBlankStringSchema.describe('Non-blank CSS color string.');

export const OpacitySchema = NormalizedFractionSchema.describe('Opacity value in the inclusive 0..1 range.');
