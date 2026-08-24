import { number, tuple } from 'zod';

export const PositionSchema = tuple([number(), number()]).describe(
  'Cartesian position [x, y]; rejects NaN / ±Infinity to keep IR JSON-serializable round-trip stable',
);
