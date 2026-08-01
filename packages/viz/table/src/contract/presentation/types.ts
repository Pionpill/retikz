import type { IRChild, IRJsonObject } from '@retikz/core';
import type { IRDataScalarValue } from '@retikz/data';
import type { ZodType } from 'zod';

import type { IRTableCellAppearance } from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type { TableCellContext } from '../model';

/** Cell presentation 接收的稳定输入 */
export type CellPresentationInput = Readonly<{
  /** formatter 前的 canonical scalar */
  rawValue: IRDataScalarValue;
  /** formatter 产生的展示 scalar */
  value: IRDataScalarValue;
  /** 当前 semantic Cell 的最小稳定上下文 */
  context: TableCellContext;
  /** presentation 与 layout 共用的最终视觉输入 */
  appearance: DeepReadonly<IRTableCellAppearance>;
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
