import type { ConnectorInput, IRConnector } from './types';

import { STANDARD_NAMESPACE } from '../shared';
import { ConnectorSchema } from './schema';

/** 校验并创建 canonical Connector IR */
export const createConnector = (input: ConnectorInput): IRConnector =>
  ConnectorSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'connector',
    ...input,
  });
