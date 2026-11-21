import { ScopeSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/scope.eval';

/** ScopeSchema 的提示与判分入口 */
export const suite = createEvalSuite(ScopeSchema, cases);
