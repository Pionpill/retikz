import type { IRSlopeMark } from '@retikz/chart/line';

/** 创建可用于 Slope recipe 的 authored mark */
export const slopeMark = (input: Omit<IRSlopeMark, 'kind'> = {}): IRSlopeMark => ({ ...input, kind: 'slope' });
