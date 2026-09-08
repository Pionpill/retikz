import { NonBlankStringSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject } from 'zod';

import { ThemeMode } from '../../shared';

export const ThemeSchema = strictObject({
  style: NonBlankStringSchema.optional().describe('Sparse visual personality name inherited from the enclosing Theme.'),
  mode: zodEnum(ThemeMode).optional().describe('Sparse light or dark environment inherited from the enclosing Theme.'),
}).describe('Sparse Theme override for a Scene or Scope.');
