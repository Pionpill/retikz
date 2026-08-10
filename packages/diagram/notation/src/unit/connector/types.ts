import type { WayDSL } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { ConnectorRole } from './constants';
import type { ConnectorSchema } from './schema';

/** Connector 角色词汇值 */
export type ConnectorRoleValue = ValueOf<typeof ConnectorRole>;

/** Connector 规范 IR */
export type IRConnector = z.infer<typeof ConnectorSchema>;

type ConnectorInputBase = Omit<z.input<typeof ConnectorSchema>, 'namespace' | 'type' | 'children'>;

/** 使用规范 Core Step 编写 Connector 的输入 */
export type ConnectorChildrenInput = ConnectorInputBase & {
  children: z.input<typeof ConnectorSchema>['children'];
  way?: never;
};

/** 使用 Core Draw way 语法编写 Connector 的输入 */
export type ConnectorWayInput = ConnectorInputBase & {
  children?: never;
  way: WayDSL;
};

/** Connector 工厂输入，两套作者语法必须且只能选择一套 */
export type ConnectorInput = ConnectorChildrenInput | ConnectorWayInput;
