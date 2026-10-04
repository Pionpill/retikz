import { array, boolean, enum as zodEnum, union } from 'zod';

import { DataExpandComponent } from './constants';

export const DataExpandSchema = union([boolean(), array(zodEnum(DataExpandComponent))])
  .default(true)
  .describe('Expand nested nonempty JSON structures: true for all, false for text, or selected map/array components.');
