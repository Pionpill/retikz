import type { IRLogicFrame, LogicFrameInput } from './types';

import { NOTATION_NAMESPACE } from '../../unit';
import { LogicFrameSchema } from './schema';

/** 校验并创建 canonical LogicFrame IR */
export const createLogicFrame = (input: LogicFrameInput): IRLogicFrame =>
  LogicFrameSchema.parse({
    namespace: NOTATION_NAMESPACE,
    type: 'logicFrame',
    ...input,
  });
