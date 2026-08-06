/** 生成 Chart recipe 保留的稳定 Plot member id */
export const chartRecipeId = (type: string, target: string): string => `__chart.${type}.${target}`;
