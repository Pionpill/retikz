import type { IRChild, IRJsonObject } from '@retikz/core';
import type { IRDataScalarValue } from '@retikz/data';
import type { ZodType } from 'zod';

/** Cell presentation 接收的稳定输入 */
export type CellPresentationInput = Readonly<{
  /** 待呈现的 JSON scalar */
  value: IRDataScalarValue;
  /** 当前语义 Cell 的稳定标识 */
  cellId: string;
}>;

/** Cell presentation provider 定义 */
export type CellPresentationDefinition<TOptions extends IRJsonObject = IRJsonObject> = {
  /** provider 注册名 */
  name: string;
  /** provider options 的精确运行时 schema */
  optionsSchema: ZodType<TOptions>;
  /** 把 scalar value 转成 Cell 局部坐标中的 Core 内容 */
  present: (input: CellPresentationInput, options: TOptions) => IRChild;
};

/** 异构 Cell presentation provider 定义 */
export type AnyCellPresentationDefinition = Omit<CellPresentationDefinition, 'optionsSchema' | 'present'> & {
  /** 异构 registry 消费的 options schema */
  optionsSchema: ZodType;
  /** options 经对应 schema 收窄后以 never 调用 */
  present: (input: CellPresentationInput, options: never) => IRChild;
};
