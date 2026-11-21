import { SceneSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/scene.eval';

/** SceneSchema 的提示与判分入口 */
export const suite = createEvalSuite(SceneSchema, cases);
