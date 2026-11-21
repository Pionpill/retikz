import { CoordinateSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/coordinate.eval';

/** CoordinateSchema 的提示与判分入口 */
export const suite = createEvalSuite(CoordinateSchema, cases);
