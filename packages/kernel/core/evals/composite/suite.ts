import { CompositeNodeSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/composite.eval';

/** CompositeNodeSchema 的提示与判分入口 */
export const suite = createEvalSuite(CompositeNodeSchema, cases);
