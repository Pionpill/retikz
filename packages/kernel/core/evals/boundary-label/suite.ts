import { BoundaryLabelSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/boundary-label.eval';

/** BoundaryLabelSchema 的提示与判分入口 */
export const suite = createEvalSuite(BoundaryLabelSchema, cases);
