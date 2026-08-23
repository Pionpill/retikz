import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { JsonValueSchema } from '../json';

const compositeBaseShape = {
  namespace: NonBlankStringSchema.describe('Tier 2 domain namespace that selects the registered definition.'),
  type: NonBlankStringSchema.describe('Composite type name within the namespace.'),
};

export const CompositeBaseSchema = z.strictObject(compositeBaseShape);

export const CompositeNodeSchema = z.object(compositeBaseShape).catchall(JsonValueSchema);
