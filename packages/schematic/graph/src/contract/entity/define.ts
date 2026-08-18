import type { EntityRoleDefinition, EntityVariantDefinition } from './types';

/** 定义一个可注册的 Entity role */
export const defineEntityRole = (definition: EntityRoleDefinition): EntityRoleDefinition => definition;

/** 定义一个可注册的 Entity variant */
export const defineEntityVariant = (definition: EntityVariantDefinition): EntityVariantDefinition => definition;
