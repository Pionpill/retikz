import { z } from 'zod';

export const AngleDegreesSchema = z.number().describe('Angle in degrees.');
