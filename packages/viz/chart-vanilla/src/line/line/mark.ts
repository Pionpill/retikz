import type { IRLineMark } from '@retikz/chart/line';

/** 创建可用于 Line recipe 的 authored mark */
export const lineMark = (input: Omit<IRLineMark, 'kind'> = {}): IRLineMark => ({ ...input, kind: 'line' });
