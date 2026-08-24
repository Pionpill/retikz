import { number } from 'zod';

export const AngleDegreesSchema = number().describe('Angle in degrees.');
