import type { FlowLayoutDefinition } from './types';

/**
 * 定义一个可注册的同步 Flow Layout
 * @param definition 完整的布局定义；此函数仅保留类型并原样返回，注册时才校验
 * @returns 传入的同一个布局定义对象
 */
export const defineFlowLayout = (definition: FlowLayoutDefinition): FlowLayoutDefinition => definition;
