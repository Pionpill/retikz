import { z } from 'zod';

// 由 Table tsc 验证的公开 Presentation 类型契约
import type { CellPresentationInput, IRTableCellAppearance, TableCellContext } from '../../src';

import { defineCellPresentation } from '../../src';

const context: TableCellContext = {
  cellId: 'cell.0',
  rowId: 'row.0',
  columnId: 'amount',
  rowIndex: 0,
  columnIndex: 0,
  location: 'body',
  roles: ['data'],
};

const appearance: IRTableCellAppearance = {
  background: { fill: '#fff4e5' },
  content: { color: '#9a4d00' },
};

const input: CellPresentationInput = {
  rawValue: 0.87,
  value: '87%',
  context,
  appearance,
};

defineCellPresentation({
  name: 'contract-probe',
  optionsSchema: z.strictObject({}),
  present: presentationInput => {
    void presentationInput.rawValue;
    void presentationInput.value;
    void presentationInput.context.cellId;
    void presentationInput.appearance.background?.fill;
    // @ts-expect-error Cell id 只存在于 context，不保留旧顶层 alias
    void presentationInput.cellId;
    return { type: 'node', position: [0, 0], text: String(presentationInput.value) };
  },
});

// @ts-expect-error 旧 callback input 缺少 rawValue、context 与 appearance
const removedInput: CellPresentationInput = { value: 'legacy', cellId: 'cell.0' };

void input;
void removedInput;
