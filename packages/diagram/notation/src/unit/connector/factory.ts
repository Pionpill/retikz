import type { ConnectorInput, IRConnector } from './types';

import { NOTATION_NAMESPACE } from '../shared';
import { ConnectorSchema } from './schema';

/** 校验并创建规范 Connector IR */
export const createConnector = (input: ConnectorInput): IRConnector =>
  ConnectorSchema.parse({
    namespace: NOTATION_NAMESPACE,
    type: 'connector',
    ...input,
  });
