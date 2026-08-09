import type { z } from 'zod';

import type { ConnectorAppearanceSchema, LogicDiagramPointSchema, LogicDiagramTargetSchema } from './schema';

export type LogicDiagramTarget = z.infer<typeof LogicDiagramTargetSchema>;
export type LogicDiagramPoint = z.infer<typeof LogicDiagramPointSchema>;
export type LogicDiagramTargetInput = z.input<typeof LogicDiagramTargetSchema>;
export type LogicDiagramPointInput = z.input<typeof LogicDiagramPointSchema>;
export type ConnectorAppearance = z.infer<typeof ConnectorAppearanceSchema>;
export type ConnectorAppearanceInput = z.input<typeof ConnectorAppearanceSchema>;
