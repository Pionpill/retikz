import { z } from 'zod';

const compositeBaseShape = {
  namespace: z.string().min(1).describe('Tier 2 domain namespace that selects the registered definition.'),
  type: z.string().min(1).describe('Composite type name within the namespace.'),
};

export const CompositeBaseSchema = z.object(compositeBaseShape);

export const CompositeNodeSchema = z.looseObject(compositeBaseShape);
