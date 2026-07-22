import type { IRChild } from '@retikz/core';

import { ChildSchema, JsonObjectSchema } from '@retikz/core';

import type { AnyCellPresentationDefinition } from '../../contract';
import type { IRTableCellPayload } from '../../schemas';
import type { DeepReadonly } from '../../shared';

import { cellPresentationDefinitionOf } from '../../providers';
import { TableCellPayloadKind, TableCellPayloadSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

const errorMessageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** 把未知 provider 产物收窄为 detached、递归冻结的 Core child */
const parsePresentedChild = (value: unknown): IRChild => {
  const json = JsonObjectSchema.parse(value);
  const child = ChildSchema.parse(json);
  JsonObjectSchema.parse(child);
  return deepFreeze(child);
};

/** 把单个 Cell payload 转成可供 lowering 使用的 Core 内容 */
export const presentCellPayload = (
  payload: DeepReadonly<IRTableCellPayload>,
  cellId: string,
  registry: ReadonlyMap<string, AnyCellPresentationDefinition>,
): IRChild => {
  if (payload.kind === TableCellPayloadKind.Content) {
    try {
      const parsedPayload = TableCellPayloadSchema.parse(payload);
      if (parsedPayload.kind !== TableCellPayloadKind.Content) throw new Error('expected content payload');
      return parsePresentedChild(parsedPayload.content);
    } catch (error) {
      throw new Error(`table: content for cell "${cellId}": ${errorMessageOf(error)}`, { cause: error });
    }
  }

  const name = payload.presentation?.name ?? 'text';
  const prefix = `table: presentation "${name}" for cell "${cellId}"`;
  try {
    const parsedPayload = TableCellPayloadSchema.parse(payload);
    if (parsedPayload.kind !== TableCellPayloadKind.Value) throw new Error('expected value payload');
    const definition = cellPresentationDefinitionOf(name, registry);
    const rawOptions = JsonObjectSchema.parse(parsedPayload.presentation?.options ?? {});
    const parsedOptions = definition.optionsSchema.parse(rawOptions);
    const guardedOptions = JsonObjectSchema.parse(parsedOptions);
    return parsePresentedChild(definition.present({ value: parsedPayload.value, cellId }, guardedOptions as never));
  } catch (error) {
    throw new Error(`${prefix}: ${errorMessageOf(error)}`, { cause: error });
  }
};
