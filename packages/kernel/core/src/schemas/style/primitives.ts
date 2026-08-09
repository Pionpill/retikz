import { NormalizedFractionSchema } from '@retikz/foundation';
import { z } from 'zod';

export const CssColorSchema = z.string().describe('CSS color string.');

export const OpacitySchema = NormalizedFractionSchema.describe('Opacity value in the inclusive 0..1 range.');
