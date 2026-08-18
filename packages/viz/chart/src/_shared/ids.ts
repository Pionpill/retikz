/** 生成 Chart 解析方案保留的稳定 Plot 成员标识 */
export const chartRecipeId = (type: string, target: string): string => `__chart.${type}.${target}`;
