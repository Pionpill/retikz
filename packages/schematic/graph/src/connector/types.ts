import type { WayDSL } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { GraphConnectorRole } from './constants';
import type { GraphConnectorSchema } from './schema';

/** GraphConnector 角色词汇值 */
export type GraphConnectorRoleValue = ValueOf<typeof GraphConnectorRole>;

/** GraphConnector 规范 IR */
export type IRGraphConnector = z.infer<typeof GraphConnectorSchema>;

type GraphConnectorCreateOptionsBase = Omit<z.input<typeof GraphConnectorSchema>, 'namespace' | 'type' | 'children'>;

/** 使用规范 Core Step 编写 GraphConnector 的作者输入 */
export type GraphConnectorChildrenCreateOptions = GraphConnectorCreateOptionsBase & {
  children: z.input<typeof GraphConnectorSchema>['children'];
  way?: never;
};

/** 使用 Core Draw way 语法编写 GraphConnector 的作者输入 */
export type GraphConnectorWayCreateOptions = GraphConnectorCreateOptionsBase & {
  children?: never;
  way: WayDSL;
};

/** GraphConnector 工厂输入，两套作者语法必须且只能选择一套 */
export type GraphConnectorCreateOptions = GraphConnectorChildrenCreateOptions | GraphConnectorWayCreateOptions;
