import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { RelationDirection } from './constants';
import type {
  GraphRelationAppearanceTokenOverridesSchema,
  GraphRelationMarkerAppearanceTokenOverridesSchema,
  GraphRelationMarkerRecipeSchema,
  GraphRelationRoleTokenRecipeSchema,
  GraphRelationRouteStepSchema,
  GraphRelationStructureTokenOverridesSchema,
  RelationSchema,
} from './schema';

export type RelationDirectionValue = ValueOf<typeof RelationDirection>;

export type IRGraphRelation = z.infer<typeof RelationSchema>;

export type IRGraphRelationRouteStep = z.infer<typeof GraphRelationRouteStepSchema>;

export type IRGraphRelationMarkerRecipe = z.infer<typeof GraphRelationMarkerRecipeSchema>;

export type IRGraphRelationMarkerAppearanceTokenOverrides = z.infer<
  typeof GraphRelationMarkerAppearanceTokenOverridesSchema
>;

export type IRGraphRelationAppearanceTokenOverrides = z.infer<typeof GraphRelationAppearanceTokenOverridesSchema>;

export type IRGraphRelationRoleTokenRecipe = z.infer<typeof GraphRelationRoleTokenRecipeSchema>;

export type IRGraphRelationStructureTokenOverrides = z.infer<typeof GraphRelationStructureTokenOverridesSchema>;
