import type { z } from 'zod';

import type { ConnectorAppearanceCanonicalSchema, ConnectorRoutingSchema, ConnectorSchema } from './schema';

/** Connector route canonical type */
export type ConnectorRouting = z.infer<typeof ConnectorRoutingSchema>;

/** Connector route author input */
export type ConnectorRoutingInput = z.input<typeof ConnectorRoutingSchema>;

/** Connector canonical IR */
export type IRConnector = z.infer<typeof ConnectorSchema>;

/** Connector factory input */
export type ConnectorInput = Omit<z.input<typeof ConnectorSchema>, 'namespace' | 'type'>;

/** Connector canonical appearance */
export type ConnectorAppearanceResolved = z.infer<typeof ConnectorAppearanceCanonicalSchema>;

/** Connector appearance author input */
export type ConnectorAppearanceResolvedInput = z.input<typeof ConnectorAppearanceCanonicalSchema>;
