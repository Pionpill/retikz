import { NonBlankStringSchema } from '@retikz/foundation';
import { object, strictObject } from 'zod';

import { JsonValueSchema } from '../json';

const compositeBaseShape = {
  namespace: NonBlankStringSchema.describe('Tier 2 domain namespace that selects the registered definition.'),
  type: NonBlankStringSchema.describe('Composite type name within the namespace.'),
};

export const CompositeBaseSchema = strictObject(compositeBaseShape);

export const CompositeNodeSchema = object(compositeBaseShape).catchall(JsonValueSchema);
