import type { IRChild } from '@retikz/core';

import { ChildSchema } from '@retikz/core';

import type { AnyCellPresentationDefinition, CellPresentationInput } from '../../contract';
import type { IRTableCellContentStyle, IRTablePresentationRef } from '../../schemas';
import type { DeepReadonly } from '../../shared';

import { RetikzTableError } from '../../error';
import { cellPresentationDefinitionOf } from '../../providers';
import { deepFreeze } from '../../shared';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** 把未知内容收窄为 detached、递归冻结的 Core child */
export const parsePresentedChild = (value: unknown): IRChild => {
  return deepFreeze(ChildSchema.parse(value));
};

/** 把非空 content style 应用为单层匿名 Core Scope */
export const applyTableCellContentStyle = (
  child: IRChild,
  style: DeepReadonly<IRTableCellContentStyle> | undefined,
): IRChild => {
  if (style === undefined || Object.keys(style).length === 0) return child;
  return parsePresentedChild({ type: 'scope', ...style, children: [child] });
};

/** 通过 presentation registry 把 formatted value 转成 Core 内容 */
export const presentCellValue = (
  input: CellPresentationInput,
  presentation: DeepReadonly<IRTablePresentationRef>,
  registry: ReadonlyMap<string, AnyCellPresentationDefinition>,
): IRChild => {
  const name = presentation.name;
  const cellLabel =
    input.context.cellId === undefined
      ? `${input.context.rowIndex}:${input.context.columnIndex}`
      : `"${input.context.cellId}"`;
  const prefix = `table: presentation "${name}" for cell ${cellLabel}`;
  try {
    const definition = cellPresentationDefinitionOf(name, registry);
    const parsedOptions = deepFreeze(definition.optionsSchema.parse(presentation.options ?? {}));
    return parsePresentedChild(definition.present(input, parsedOptions as never));
  } catch (error) {
    throw new RetikzTableError(`${prefix}: ${errorMessageOf(error)}`, { cause: error });
  }
};
