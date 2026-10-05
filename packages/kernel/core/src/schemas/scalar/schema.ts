import { number } from 'zod';

/** 校验以度为单位的角度数值 */
export const AngleDegreesSchema = number().describe('Angle in degrees.');
