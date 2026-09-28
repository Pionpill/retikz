import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { FlexLayoutDefinition } from '@retikz/layout';
import { SurfaceDefinition } from '@retikz/standard/presentation';

import type { GraphDefinitionOptions } from '../contract';
import { resolveGraphDefinitionOptions } from '../providers';
import { createBaseGraphProviders } from './base-providers';
import { createBlockDefinitionFromOptions } from './block/definition';
import { BlockHeaderDefinition, BlockRowDefinition, BlockSectionDefinition } from './block/structure-definition';
import { createEntityDefinitionFromOptions } from './entity/definition';
import { createGraphDefinitionFromOptions } from './graph/definition';
import { GroupBodyAllocationDefinition } from './group';
import { createGroupDefinitionFromOptions } from './group/definition';
import { createRelationDefinitionFromOptions } from './relation/definition';

/**
 * 创建当前 Graph 包族的完整 composite definition 集合
 * @param options 自定义语义与主题定义；省略时仅使用内置定义，调用时完成注册校验
 * @returns 新建的 composite definition 数组，包含 Graph 元素及其布局和表面依赖
 * @throws RetikzGraphError 定义重复、语义引用未注册或定义约束冲突时抛出
 */
export const createGraphDefinitions = (options: GraphDefinitionOptions = {}): Array<AnyCompositeDefinition> => {
  const resolved = resolveGraphDefinitionOptions(options);
  return [
    createGraphDefinitionFromOptions(resolved),
    createGroupDefinitionFromOptions(resolved),
    GroupBodyAllocationDefinition,
    createBlockDefinitionFromOptions(resolved),
    BlockHeaderDefinition,
    BlockSectionDefinition,
    BlockRowDefinition,
    createEntityDefinitionFromOptions(resolved),
    createRelationDefinitionFromOptions(resolved),
    FlexLayoutDefinition,
    SurfaceDefinition,
  ];
};

/**
 * 创建当前 Graph 包族的完整 composite dependency provider 集合
 * @param options 自定义语义与主题定义；省略时复用内置 provider 集合，注册校验延迟至依赖装配
 * @returns 只读 provider 集合，包含 Graph 元素及其所需的布局、形状与箭头依赖
 */
export const createGraphProviders = (options?: GraphDefinitionOptions): ReadonlyArray<CoreDependencyProvider> =>
  createBaseGraphProviders(options);
