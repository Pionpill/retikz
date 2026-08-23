import { JsonObjectSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

export const GraphPredicateRefSchema = z
  .strictObject({
    name: NonBlankStringSchema.describe('Registered member predicate definition name.'),
    params: JsonObjectSchema.optional().describe('JSON parameters validated by the selected predicate definition.'),
  })
  .describe('Reference to one registered Graph member predicate and its JSON parameters.');
