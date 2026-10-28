import { describe, expect, it } from 'vitest';

import { presentTable } from '../../src/pipeline/presentation';
import { resolveTableStructure } from '../../src/pipeline/structure';
import { formatDefaultTable } from '../utils/stages';

const formatted = () =>
  formatDefaultTable(
    resolveTableStructure({
      kind: 'manual',
      rows: [
        [
          { value: 'value' },
          {
            content: {
              type: 'node',
              position: [0, 0],
              text: 'direct',
              style: { color: '#ffffff', strokeWidth: 3 },
            },
          },
        ],
      ],
    }),
  );

describe('Table Cell 内容外观', () => {
  it('保持空内容样式不受匿名 Scope 包装器的影响', () => {
    const presented = presentTable(formatted());

    expect(presented.cells[0].content).toMatchObject({ type: 'node', text: 'value' });
    expect(presented.cells[1].content).toMatchObject({ type: 'node', text: 'direct' });
  });

  it('将值和直接内容包装在一个匿名 Core Scope 中，并具有精确的默认样式', () => {
    const content = {
      defaults: {
        style: { color: '#9a4d00', strokeWidth: 2 },
        node: { style: { font: { weight: 600 } } },
        reset: ['path' as const],
      },
    };
    const presented = presentTable(formatted(), {
      cells: [
        { kind: 'value', presentation: { name: 'text' }, appearance: { content } },
        { kind: 'content', appearance: { content } },
      ],
    });

    for (const cell of presented.cells) {
      expect(cell.content).toMatchObject({
        type: 'scope',

        defaults: {
          style: { color: '#9a4d00', strokeWidth: 2 },
          node: {
            style: { font: { weight: 600 } },
          },
          reset: ['path'],
        },
      });
      expect(cell.content).not.toHaveProperty('id');
      expect(cell.content).not.toHaveProperty('meta');
      expect(cell.content).not.toHaveProperty('placement');
      expect((cell.content as { children: Array<unknown> }).children).toHaveLength(1);
    }

    expect((presented.cells[1].content as { children: Array<Record<string, unknown>> }).children[0]).toMatchObject({
      type: 'node',
      style: { color: '#ffffff', strokeWidth: 3 },
    });
    expect(Object.isFrozen(content)).toBe(false);
    expect(Object.isFrozen(presented.cells[0].content)).toBe(true);
  });
});
