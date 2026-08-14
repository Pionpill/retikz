import type { InputTable } from '@retikz/table-vanilla';
import type { InputEmbedAdapter } from '@retikz/vanilla';

import { createManualTableSpec } from '@retikz/table';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import { describe, expect, it } from 'vitest';

import { DetailTable, ManualTable, Table } from '../../src';

type InputEmbeddableTableComponent = {
  inputEmbedAdapter?: InputEmbedAdapter<InputTable>;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>) => InputTable;
};

/** 读取 React Table 组件交给 Vanilla 的唯一输入 */
const inputOf = <TProps,>(component: InputEmbeddableTableComponent, props: TProps): InputTable => {
  if (component.inputEmbedAdapter !== TableInputEmbedAdapter) {
    throw new Error('expected the shared Table Vanilla adapter');
  }
  if (component.createInputEmbedProps === undefined) {
    throw new Error('expected a React-to-Vanilla input factory');
  }
  return component.createInputEmbedProps(props as Readonly<Record<string, unknown>>);
};

describe('Table React InputEmbed routing', () => {
  it('maps all React authoring entries to the shared Table Vanilla adapter', () => {
    const spec = createManualTableSpec({ id: 'generic', rows: [['Ada']] });
    const generic = inputOf(Table, { spec });
    const detail = inputOf(DetailTable, {
      id: 'detail',
      dataRef: 'people',
      data: [{ name: 'Grace' }],
      columns: [{ id: 'name', field: 'name' }],
    });
    const manual = inputOf(ManualTable, { id: 'manual', rows: [[98]] });

    expect(generic).not.toHaveProperty('spec');
    expect(generic).toMatchObject({
      table: { kind: 'manual', input: { id: 'generic', rows: [['Ada']] } },
      preserveRootIdentity: true,
    });
    expect(detail).toMatchObject({
      table: {
        kind: 'detail',
        input: { id: 'detail', dataRef: 'people', columns: [{ id: 'name', field: 'name' }] },
      },
      preserveRootIdentity: true,
    });
    expect(manual).toMatchObject({
      table: { kind: 'manual', input: { id: 'manual', rows: [[98]] } },
      preserveRootIdentity: true,
    });
  });
});
