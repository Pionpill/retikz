import type { IRJsonObject } from '../../schemas';
import type { RibbonWidthProfileDefinition, RibbonWidthProfileDefinitionInput } from './types';

/**
 * 定义 ribbon width profile 注册项
 * @remarks 当前只集中封装参数泛型擦除边界；保留入口用于对齐 registry API，并为未来校验或归一化预留空间
 */
export const defineRibbonWidthProfile = <TParams extends IRJsonObject = IRJsonObject>(
  definition: RibbonWidthProfileDefinitionInput<TParams>,
): RibbonWidthProfileDefinition => definition as unknown as RibbonWidthProfileDefinition;
