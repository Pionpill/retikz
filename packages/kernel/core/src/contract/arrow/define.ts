import type { ArrowDefinition } from './types';

/**
 * 定义 arrow 注册项
 * @param def 箭头名称、尺寸及几何生成函数组成的定义
 * @returns 原定义对象，不复制或修改输入
 * @remarks 当前是 typed identity；保留入口用于对齐 registry API，并为未来校验或归一化预留空间
 */
export const defineArrow = (def: ArrowDefinition): ArrowDefinition => def;
