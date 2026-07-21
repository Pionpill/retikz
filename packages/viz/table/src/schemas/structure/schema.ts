import { z } from 'zod';

import { CustomTableStructureSchema } from './custom';
import { DetailTableStructureSchema } from './detail';
import { ManualTableStructureSchema } from './manual';

export const TableStructureSchema = z
  .union([ManualTableStructureSchema, DetailTableStructureSchema, CustomTableStructureSchema])
  .describe('Table structure operation: built-in manual/detail or a JSON-safe custom provider operation.');
