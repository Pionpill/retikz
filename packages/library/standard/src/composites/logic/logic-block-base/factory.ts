import type { IRLogicBlockBase, LogicBlockBaseInput } from './types';

import { STANDARD_NAMESPACE } from '../shared';
import { LogicBlockBaseSchema } from './schema';

/** 校验并创建 canonical LogicBlockBase IR */
export const createLogicBlockBase = (input: LogicBlockBaseInput): IRLogicBlockBase =>
  LogicBlockBaseSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'logicBlockBase',
    ...input,
  });
