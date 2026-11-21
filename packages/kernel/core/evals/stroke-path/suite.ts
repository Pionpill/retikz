import { StrokePathSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/stroke-path.eval';

/** StrokePathSchema 的提示与判分入口 */
export const suite = createEvalSuite(StrokePathSchema, cases);
