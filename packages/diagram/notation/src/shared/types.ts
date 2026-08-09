import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type {
  CalloutSide,
  ConnectorBendDirection,
  ConnectorRole,
  ConnectorRouteKind,
  LogicCompositeType,
} from './constants';
import type {
  CalloutSideSchema,
  ConnectorAppearanceSchema,
  ConnectorBendDirectionSchema,
  ConnectorRouteKindSchema,
  LogicDiagramPointSchema,
  LogicDiagramTargetSchema,
  LogicGeometryLabelSchema,
  LogicLayoutItemArtifactSchema,
  LogicOuterArtifactSchema,
  LogicUnitAppearanceSchema,
} from './schema';
import type { LogicNeutralStyle } from './schema';

export type LogicCompositeTypeValue = ValueOf<typeof LogicCompositeType>;
export type ConnectorRoleValue = ValueOf<typeof ConnectorRole>;
export type ConnectorRouteKindValue = ValueOf<typeof ConnectorRouteKind>;
export type ConnectorBendDirectionValue = ValueOf<typeof ConnectorBendDirection>;
export type CalloutSideValue = ValueOf<typeof CalloutSide>;

export type LogicDiagramTarget = z.infer<typeof LogicDiagramTargetSchema>;
export type LogicDiagramPoint = z.infer<typeof LogicDiagramPointSchema>;
export type LogicDiagramTargetInput = z.input<typeof LogicDiagramTargetSchema>;
export type LogicDiagramPointInput = z.input<typeof LogicDiagramPointSchema>;
export type LogicUnitAppearance = z.infer<typeof LogicUnitAppearanceSchema>;
export type LogicUnitAppearanceInput = z.input<typeof LogicUnitAppearanceSchema>;
export type ConnectorAppearance = z.infer<typeof ConnectorAppearanceSchema>;
export type ConnectorAppearanceInput = z.input<typeof ConnectorAppearanceSchema>;
export type CalloutSideSchemaValue = z.infer<typeof CalloutSideSchema>;
export type LogicLayoutItemArtifact = z.infer<typeof LogicLayoutItemArtifactSchema>;
export type LogicOuterArtifact = z.infer<typeof LogicOuterArtifactSchema>;
export type LogicGeometryLabelInput = z.input<typeof LogicGeometryLabelSchema>;
export type LogicNeutralStyleValue = typeof LogicNeutralStyle;
export type ConnectorRouteKindSchemaValue = z.infer<typeof ConnectorRouteKindSchema>;
export type ConnectorBendDirectionSchemaValue = z.infer<typeof ConnectorBendDirectionSchema>;
