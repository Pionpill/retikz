import { enum as zodEnum } from 'zod';

import { GraphStatus } from '../../shared';

/** Graph Entity 与 Relation 共享的闭合语义状态 */
export const GraphStatusSchema = zodEnum(GraphStatus).describe('Closed Graph semantic status.');
