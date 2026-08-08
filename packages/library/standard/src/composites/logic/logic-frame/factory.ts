import type { IRLogicFrame, LogicFrameInput } from './types';

import { STANDARD_NAMESPACE } from '../shared';
import { LogicFrameSchema } from './schema';

/** 校验并创建 canonical LogicFrame IR */
export const createLogicFrame = (input: LogicFrameInput): IRLogicFrame =>
  LogicFrameSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'logicFrame',
    ...input,
  });
