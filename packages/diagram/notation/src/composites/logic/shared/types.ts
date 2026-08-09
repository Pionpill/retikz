import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type {
  CalloutSide,
  ConnectorBendDirection,
  ConnectorOrthogonalPattern,
  ConnectorRole,
  ConnectorRouteKind,
  LogicCompositeType,
} from './constants';
import type {
  CalloutSideSchema,
  ConnectorAppearanceSchema,
  ConnectorBendDirectionSchema,
  ConnectorOrthogonalPatternSchema,
  ConnectorRouteKindSchema,
  LogicDiagramPointSchema,
  LogicDiagramTargetSchema,
  LogicFrameRegionSchema,
  LogicFrameSectionSchema,
  LogicGeometryLabelSchema,
  LogicLayoutItemArtifactSchema,
  LogicOuterArtifactSchema,
  LogicOutlineAppearanceSchema,
  LogicUnitAppearanceSchema,
} from './schema';
import type { LogicNeutralStyle } from './schema';

export type LogicCompositeTypeValue = ValueOf<typeof LogicCompositeType>;
export type ConnectorRoleValue = ValueOf<typeof ConnectorRole>;
export type ConnectorRouteKindValue = ValueOf<typeof ConnectorRouteKind>;
export type ConnectorOrthogonalPatternValue = ValueOf<typeof ConnectorOrthogonalPattern>;
export type ConnectorBendDirectionValue = ValueOf<typeof ConnectorBendDirection>;
export type CalloutSideValue = ValueOf<typeof CalloutSide>;

export type LogicDiagramTarget = z.infer<typeof LogicDiagramTargetSchema>;
export type LogicDiagramPoint = z.infer<typeof LogicDiagramPointSchema>;
export type LogicDiagramTargetInput = z.input<typeof LogicDiagramTargetSchema>;
export type LogicDiagramPointInput = z.input<typeof LogicDiagramPointSchema>;
export type LogicUnitAppearance = z.infer<typeof LogicUnitAppearanceSchema>;
export type LogicUnitAppearanceInput = z.input<typeof LogicUnitAppearanceSchema>;
export type LogicFrameRegion = z.infer<typeof LogicFrameRegionSchema>;
export type LogicFrameRegionInput = z.input<typeof LogicFrameRegionSchema>;
export type LogicFrameSection = z.infer<typeof LogicFrameSectionSchema>;
export type LogicFrameSectionInput = z.input<typeof LogicFrameSectionSchema>;
export type LogicOutlineAppearance = z.infer<typeof LogicOutlineAppearanceSchema>;
export type LogicOutlineAppearanceInput = z.input<typeof LogicOutlineAppearanceSchema>;
export type ConnectorAppearance = z.infer<typeof ConnectorAppearanceSchema>;
export type ConnectorAppearanceInput = z.input<typeof ConnectorAppearanceSchema>;
export type CalloutSideSchemaValue = z.infer<typeof CalloutSideSchema>;
export type LogicLayoutItemArtifact = z.infer<typeof LogicLayoutItemArtifactSchema>;
export type LogicOuterArtifact = z.infer<typeof LogicOuterArtifactSchema>;
export type LogicGeometryLabelInput = z.input<typeof LogicGeometryLabelSchema>;
export type LogicNeutralStyleValue = typeof LogicNeutralStyle;
export type ConnectorRouteKindSchemaValue = z.infer<typeof ConnectorRouteKindSchema>;
export type ConnectorOrthogonalPatternSchemaValue = z.infer<typeof ConnectorOrthogonalPatternSchema>;
export type ConnectorBendDirectionSchemaValue = z.infer<typeof ConnectorBendDirectionSchema>;
