import { DrawableInstanceSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/drawable.eval';

/** DrawableInstanceSchema 的提示与判分入口 */
export const suite = createEvalSuite(DrawableInstanceSchema, cases);
