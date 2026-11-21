import { TexContentSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/tex.eval';

/** TexContentSchema 的提示与判分入口 */
export const suite = createEvalSuite(TexContentSchema, cases);
