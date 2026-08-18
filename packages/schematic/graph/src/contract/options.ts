import type { EntityRoleDefinition, EntityVariantDefinition } from './entity';
import type { GraphThemeStyleDefinition } from './theme';

/** 配置一组共享 Graph definitions 的运行时扩展 */
export type GraphDefinitionOptions = Readonly<{
  /** 自定义 Entity role definitions */
  entityRoles?: ReadonlyArray<EntityRoleDefinition>;
  /** 自定义 Entity variant definitions */
  entityVariants?: ReadonlyArray<EntityVariantDefinition>;
  /** 与 Core Theme style 同名的 Graph Theme definitions */
  graphThemeStyles?: ReadonlyArray<GraphThemeStyleDefinition>;
}>;
