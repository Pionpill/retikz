import { ClipFillRuleSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/clip-fill-rule.eval';

/** ClipFillRuleSchema 的提示与判分入口 */
export const suite = createEvalSuite(ClipFillRuleSchema, cases);
