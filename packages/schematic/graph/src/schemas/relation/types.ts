import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { RelationDirection } from './constants';
import type {
  GraphRelationMarkerAppearanceSchema,
  GraphRelationMarkerRecipeSchema,
  GraphRelationRoleTokenRecipeSchema,
  GraphRelationRouteStepSchema,
  GraphRelationStructureTokenOverridesSchema,
  RelationSchema,
} from './schema';

export type RelationDirectionValue = ValueOf<typeof RelationDirection>;

export type IRGraphRelation = ZodInfer<typeof RelationSchema>;

export type IRGraphRelationRouteStep = ZodInfer<typeof GraphRelationRouteStepSchema>;

export type IRGraphRelationMarkerRecipe = ZodInfer<typeof GraphRelationMarkerRecipeSchema>;

export type IRGraphRelationMarkerAppearance = ZodInfer<typeof GraphRelationMarkerAppearanceSchema>;

export type IRGraphRelationRoleTokenRecipe = ZodInfer<typeof GraphRelationRoleTokenRecipeSchema>;

export type IRGraphRelationStructureTokenOverrides = ZodInfer<typeof GraphRelationStructureTokenOverridesSchema>;
