import type { IRChild } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import type { AnyCellPresentationDefinition, IRManualTableCell } from '../../src';
import { defineCellPresentation, resolveCellPresentationRegistry } from '../../src';
import { presentTable } from '../../src/pipeline/presentation';
import { resolveTableStructure } from '../../src/pipeline/structure';
import { formatDefaultTable } from '../utils/stages';

const presentedCellOf = (
  cell: IRManualTableCell,
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>,
) => {
  const identifiedCell =
    typeof cell === 'object' ? { ...cell, id: cell.id ?? 'cell.r0.c0' } : { id: 'cell.r0.c0', value: cell };
  const formatted = formatDefaultTable(resolveTableStructure({ kind: 'manual', rows: [[identifiedCell]] }));

  return presentTable(formatted, { presentationDefinitions }).cells[0];
};

describe('Cell 表示注册表', () => {
  it.each([
    ['Revenue', 'Revenue'],
    [42, '42'],
    [true, 'true'],
    [false, 'false'],
    [null, ''],
  ] as const)('通过内置文本定义呈现标量 %j', (value, text) => {
    expect(presentedCellOf({ value }).content).toEqual({
      type: 'node',
      position: [0, 0],
      text,
      style: { stroke: 'none', fill: 'none' },
      layout: { padding: 0 },
    });
  });

  it('使用原始、格式化、上下文和外观输入调度自定义定义', () => {
    const badge = defineCellPresentation({
      name: 'badge',
      optionsSchema: strictObject({ prefix: string() }),
      present: ({ rawValue, value, context, appearance }, options) => ({
        type: 'node',
        position: [0, 0],
        text: `${options.prefix}${String(rawValue)}>${String(value)}@${context.cellId}:${String(
          appearance.background?.fill,
        )}`,
      }),
    });
    const formatted = formatDefaultTable(
      resolveTableStructure({
        kind: 'manual',
        rows: [[{ id: 'cell.r0.c0', value: 7, presentation: { name: 'badge', options: { prefix: '#' } } }]],
      }),
    );
    const presented = presentTable(formatted, {
      cells: [
        {
          kind: 'value',
          cellId: 'cell.r0.c0',
          presentation: { name: 'badge', options: { prefix: '#' } },
          appearance: { background: { fill: '#fff4e5' } },
        },
      ],
      presentationDefinitions: [badge],
    });

    expect(presented.cells[0].content).toMatchObject({ text: '#7>7@cell.r0.c0:#fff4e5' });
  });

  it('传递规范地址，而不为匿名 Cell 发明身份', () => {
    let observed: unknown;
    const inspect = defineCellPresentation({
      name: 'anonymous-inspect',
      optionsSchema: strictObject({}),
      present: input => {
        observed = input.context;
        return { type: 'node', position: [0, 0], text: String(input.value) };
      },
    });
    const formatted = formatDefaultTable(
      resolveTableStructure({
        kind: 'manual',
        rows: [[{ value: 'ok', presentation: { name: 'anonymous-inspect' } }]],
      }),
    );

    const presented = presentTable(formatted, { presentationDefinitions: [inspect] });

    expect(presented.cells[0]).not.toHaveProperty('cellId');
    expect(observed).toEqual({
      rowIndex: 0,
      columnIndex: 0,
      location: 'body',
      roles: ['data'],
      source: { kind: 'manual', row: 0, column: 0 },
    });
  });

  it('将省略的选项验证为空对象', () => {
    const empty = defineCellPresentation({
      name: 'empty',
      optionsSchema: strictObject({}),
      present: ({ value }, options) => ({
        type: 'node',
        position: [0, 0],
        text: `${String(value)}:${Object.keys(options).length}`,
      }),
    });

    expect(presentedCellOf({ value: 'ok', presentation: { name: 'empty' } }, [empty]).content).toMatchObject({
      text: 'ok:0',
    });
  });

  it('拒绝重复、内置冲突和缺失的定义', () => {
    const definition = defineCellPresentation({
      name: 'badge',
      optionsSchema: strictObject({}),
      present: () => ({ type: 'node', position: [0, 0] }),
    });
    const duplicate = defineCellPresentation({ ...definition });
    const builtinConflict = defineCellPresentation({ ...definition, name: 'text' });

    expect(() => resolveCellPresentationRegistry([definition, duplicate])).toThrow(/duplicate.*badge/i);
    expect(() => resolveCellPresentationRegistry([builtinConflict])).toThrow(/duplicate.*text/i);
    expect(() => presentedCellOf({ value: 1, presentation: { name: 'missing' } })).toThrow(
      /table: presentation "missing" for cell "cell\.r0\.c0"/,
    );
  });

  it('使用精确选项转换并保留快照错误', () => {
    const transformedOptions = defineCellPresentation({
      name: 'transformed-options',
      optionsSchema: strictObject({}).transform(() => ({ value: Number.NaN })),
      present: (_input, options) => ({
        type: 'node',
        position: [0, 0],
        text: Number.isNaN(options.value) ? 'transformed' : 'unexpected',
      }),
    });
    const nonJsonOutput = defineCellPresentation({
      name: 'non-json-output',
      optionsSchema: strictObject({}),
      present: () => ({ namespace: 'custom', type: 'child', render: () => 'x' }),
    });

    expect(
      presentedCellOf({ value: 1, presentation: { name: 'transformed-options' } }, [transformedOptions]).content,
    ).toMatchObject({ text: 'transformed' });
    expect(() => presentedCellOf({ value: 1, presentation: { name: 'non-json-output' } }, [nonJsonOutput])).toThrow(
      /table: presentation "non-json-output" for cell "cell\.r0\.c0"/,
    );
  });

  it('返回分离的递归冻结的直接内容和生成的内容', () => {
    const direct: IRChild = { type: 'scope', children: [{ type: 'node', position: [0, 0], text: 'direct' }] };
    const nestedOutput = {
      type: 'scope' as const,
      children: [{ type: 'node' as const, position: [0, 0] as [number, number], text: 'generated' }],
    };
    const nested = defineCellPresentation({
      name: 'nested',
      optionsSchema: strictObject({}),
      present: () => nestedOutput,
    });
    const directContent = presentedCellOf({ content: direct }).content;
    const generatedContent = presentedCellOf({ value: 'generated' }).content;
    const nestedContent = presentedCellOf({ value: 'generated', presentation: { name: 'nested' } }, [nested]).content;

    expect(directContent).not.toBe(direct);
    expect(nestedContent).not.toBe(nestedOutput);
    expect(Object.isFrozen(directContent)).toBe(true);
    expect(Object.isFrozen((directContent as { children: Array<IRChild> }).children)).toBe(true);
    expect(Object.isFrozen(generatedContent)).toBe(true);
    expect(Object.isFrozen((nestedContent as { children: Array<IRChild> }).children)).toBe(true);
    expect(Object.isFrozen((nestedContent as { children: Array<IRChild> }).children[0])).toBe(true);
    expect(Object.isFrozen(direct)).toBe(false);
    expect(Object.isFrozen(nestedOutput)).toBe(false);
  });
});
