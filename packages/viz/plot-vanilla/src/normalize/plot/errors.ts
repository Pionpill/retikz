import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

import type { PlotDeclarationPath } from './contracts';

/** Plot declaration 归一化错误码 */
export const PlotDeclarationErrorCode = {
  NonSerializableExtension: 'non-serializable-extension',
  UnsupportedChartChild: 'unsupported-chart-child',
  DuplicateDeclarationSource: 'duplicate-declaration-source',
} as const;

/** Plot declaration 归一化错误码取值 */
export type PlotDeclarationErrorCodeValue = ValueOf<typeof PlotDeclarationErrorCode>;

export type PlotDeclarationErrorDetails = Readonly<{
  /** 当前声明来源路径 */
  path: PlotDeclarationPath;
  /** 与当前声明冲突的首个来源路径 */
  conflictingPath?: PlotDeclarationPath;
}>;

/** 携带稳定来源路径的 Plot declaration 错误 */
export class PlotDeclarationError extends RetikzError<PlotDeclarationErrorCodeValue, PlotDeclarationErrorDetails> {
  /** 机器可判定的错误码 */
  readonly code: PlotDeclarationErrorCodeValue;
  /** 当前声明来源路径 */
  readonly path: PlotDeclarationPath;
  /** 与当前声明冲突的首个来源路径 */
  readonly conflictingPath?: PlotDeclarationPath;

  /** 创建结构化 Plot declaration 错误 */
  constructor(code: PlotDeclarationErrorCodeValue, path: PlotDeclarationPath, conflictingPath?: PlotDeclarationPath) {
    const details: PlotDeclarationErrorDetails = {
      path,
      ...(conflictingPath === undefined ? {} : { conflictingPath }),
    };
    super({ code, message: `Plot declaration ${code} at ${JSON.stringify(path)}`, details });
    this.name = 'PlotDeclarationError';
    this.code = code;
    this.path = path;
    this.conflictingPath = conflictingPath;
  }
}
