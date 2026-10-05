import type { infer as ZodInfer } from 'zod';

import type {
  GraphRelationMarkerAppearanceSchema,
  GraphRelationMarkerRecipeSchema,
  GraphRelationRoleTokenRecipeSchema,
  GraphRelationRouteStepSchema,
  GraphRelationStructureTokenOverridesSchema,
  RelationSchema,
} from './schema';

export type IRGraphRelation = ZodInfer<typeof RelationSchema>;

export type IRGraphRelationRouteStep = ZodInfer<typeof GraphRelationRouteStepSchema>;

export type IRGraphRelationMarkerRecipe = ZodInfer<typeof GraphRelationMarkerRecipeSchema>;

export type IRGraphRelationMarkerAppearance = ZodInfer<typeof GraphRelationMarkerAppearanceSchema>;

export type IRGraphRelationRoleTokenRecipe = ZodInfer<typeof GraphRelationRoleTokenRecipeSchema>;

export type IRGraphRelationStructureTokenOverrides = ZodInfer<typeof GraphRelationStructureTokenOverridesSchema>;
