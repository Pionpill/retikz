import { z } from 'zod';

export const CssColorSchema = z.string().describe('CSS color string.');

export const OpacitySchema = z.number().min(0).max(1).describe('Opacity value in the inclusive 0..1 range.');
