import { enum as zodEnum } from 'zod';

import { DataObjectDisplay } from './constants';

export const DataObjectDisplaySchema = zodEnum(DataObjectDisplay)
  .default(DataObjectDisplay.Map)
  .describe('How nonempty object values in JSON data are displayed recursively.');
