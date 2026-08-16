import { ChildSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { GRAPH_NAMESPACE } from '../../shared';
import { GRAPH_PRESENTATION_TYPE } from './constants';

/** Theme Scope 内部继续解析 Graph Entity variant 的私有中间 schema */
export const GraphPresentationSchema = z.strictObject({
  namespace: z.literal(GRAPH_NAMESPACE),
  type: z.literal(GRAPH_PRESENTATION_TYPE),
  entityVariant: NonBlankStringSchema.optional(),
  children: z.array(ChildSchema),
});
