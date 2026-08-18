import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

import type { PlotDeclarationPath } from './contracts';

/** Plot declaration 归一化错误码 */
export const RetikzPlotDeclarationErrorCode = {
  NonSerializableExtension: 'non-serializable-extension',
  UnsupportedChartChild: 'unsupported-chart-child',
  DuplicateDeclarationSource: 'duplicate-declaration-source',
} as const;

/** Plot declaration 归一化错误码取值 */
export type RetikzPlotDeclarationErrorCodeValue = ValueOf<typeof RetikzPlotDeclarationErrorCode>;

export type RetikzPlotDeclarationErrorDetails = Readonly<{
  /** 当前声明来源路径 */
  path: PlotDeclarationPath;
  /** 与当前声明冲突的首个来源路径 */
  conflictingPath?: PlotDeclarationPath;
}>;

/** 携带稳定来源路径的 Plot declaration 错误 */
export class RetikzPlotDeclarationError extends RetikzError<
  RetikzPlotDeclarationErrorCodeValue,
  RetikzPlotDeclarationErrorDetails
> {
  /** 机器可判定的错误码 */
  readonly code: RetikzPlotDeclarationErrorCodeValue;
  /** 当前声明来源路径 */
  readonly path: PlotDeclarationPath;
  /** 与当前声明冲突的首个来源路径 */
  readonly conflictingPath?: PlotDeclarationPath;

  /** 创建结构化 Plot declaration 错误 */
  constructor(
    code: RetikzPlotDeclarationErrorCodeValue,
    path: PlotDeclarationPath,
    conflictingPath?: PlotDeclarationPath,
  ) {
    const details: RetikzPlotDeclarationErrorDetails = {
      path,
      ...(conflictingPath === undefined ? {} : { conflictingPath }),
    };
    super({ code, message: `Plot declaration ${code} at ${JSON.stringify(path)}`, details });
    this.name = 'RetikzPlotDeclarationError';
    this.code = code;
    this.path = path;
    this.conflictingPath = conflictingPath;
  }
}
