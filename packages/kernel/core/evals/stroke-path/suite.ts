import { StepSchema, StrokePathSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/stroke-path.eval';

/** 描边宿主允许空步骤；作者输入复用步骤契约，不使用提供者推迟到编译阶段的宽校验 */
export const strokeAuthorSchema = StrokePathSchema.in.extend({ children: StepSchema.array() });

/** 描边作者输入的提示与判分入口 */
export const suite = createEvalSuite(strokeAuthorSchema, cases);
