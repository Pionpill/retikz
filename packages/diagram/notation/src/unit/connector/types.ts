import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { ConnectorBendDirection, ConnectorRole, ConnectorRouteKind } from './constants';
import type {
  ConnectorAppearanceCanonicalSchema,
  ConnectorBendDirectionSchema,
  ConnectorRouteKindSchema,
  ConnectorRoutingSchema,
  ConnectorSchema,
  LogicGeometryLabelSchema,
} from './schema';

export type ConnectorRoleValue = ValueOf<typeof ConnectorRole>;
export type ConnectorRouteKindValue = ValueOf<typeof ConnectorRouteKind>;
export type ConnectorBendDirectionValue = ValueOf<typeof ConnectorBendDirection>;
export type ConnectorRouteKindSchemaValue = z.infer<typeof ConnectorRouteKindSchema>;
export type ConnectorBendDirectionSchemaValue = z.infer<typeof ConnectorBendDirectionSchema>;
export type LogicGeometryLabelInput = z.input<typeof LogicGeometryLabelSchema>;

/** Connector 路由的规范类型 */
export type ConnectorRouting = z.infer<typeof ConnectorRoutingSchema>;

/** Connector 路由的作者输入 */
export type ConnectorRoutingInput = z.input<typeof ConnectorRoutingSchema>;

/** Connector 规范 IR */
export type IRConnector = z.infer<typeof ConnectorSchema>;

/** Connector 工厂输入 */
export type ConnectorInput = Omit<z.input<typeof ConnectorSchema>, 'namespace' | 'type'>;

/** Connector 规范外观 */
export type ConnectorAppearanceResolved = z.infer<typeof ConnectorAppearanceCanonicalSchema>;

/** Connector 外观的作者输入 */
export type ConnectorAppearanceResolvedInput = z.input<typeof ConnectorAppearanceCanonicalSchema>;
