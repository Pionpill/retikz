import type { IRJsonObject } from '@retikz/core';
import type { IRDataScalarValue } from '@retikz/data';
import type { ZodType } from 'zod';

import type { TableCellContext } from '../model';

/** Cell formatter 接收的稳定输入 */
export type CellFormatterInput = Readonly<{
  /** formatter 前的 canonical JSON scalar */
  value: IRDataScalarValue;
  /** 当前语义 Cell 的只读最小上下文 */
  context: TableCellContext;
}>;

/** Cell formatter provider 定义 */
export type CellFormatterDefinition<TOptions extends IRJsonObject = IRJsonObject> = {
  /** provider 注册名 */
  name: string;
  /** provider options 的精确运行时 schema */
  optionsSchema: ZodType<TOptions>;
  /** 把 canonical scalar 转成展示 scalar */
  format: (input: CellFormatterInput, options: TOptions) => IRDataScalarValue;
};

/** 异构 Cell formatter provider 定义 */
export type AnyCellFormatterDefinition = Omit<CellFormatterDefinition, 'optionsSchema' | 'format'> & {
  /** 异构 registry 消费的 options schema */
  optionsSchema: ZodType;
  /** options 经对应 schema 收窄后以 never 调用 */
  format: (input: CellFormatterInput, options: never) => IRDataScalarValue;
};
