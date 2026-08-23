import { describe, expect, it } from 'vitest';

import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { presentTable } from '../../src/pipeline/presentation';
import { formatDefaultTable } from '../utils/stages';

const formatted = () =>
  formatDefaultTable(
    normalizeTableStructure({
      kind: 'manual',
      rows: [
        [
          { value: 'value' },
          {
            content: {
              type: 'node',
              position: [0, 0],
              text: 'direct',
              color: '#ffffff',
              strokeWidth: 3,
            },
          },
        ],
      ],
    }),
  );

describe('Table Cell content appearance', () => {
  it('keeps empty content style free of an anonymous Scope wrapper', () => {
    const presented = presentTable(formatted());

    expect(presented.cells[0].content).toMatchObject({ type: 'node', text: 'value' });
    expect(presented.cells[1].content).toMatchObject({ type: 'node', text: 'direct' });
  });

  it('wraps value and direct content in one anonymous Core Scope with exact style defaults', () => {
    const content = {
      color: '#9a4d00',
      strokeWidth: 2,
      nodeDefault: { font: { weight: 600 } },
      resetStyle: ['path' as const],
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
        color: '#9a4d00',
        strokeWidth: 2,
        nodeDefault: { font: { weight: 600 } },
        resetStyle: ['path'],
      });
      expect(cell.content).not.toHaveProperty('id');
      expect(cell.content).not.toHaveProperty('meta');
      expect(cell.content).not.toHaveProperty('placement');
      expect((cell.content as { children: Array<unknown> }).children).toHaveLength(1);
    }

    expect((presented.cells[1].content as { children: Array<Record<string, unknown>> }).children[0]).toMatchObject({
      type: 'node',
      color: '#ffffff',
      strokeWidth: 3,
    });
    expect(Object.isFrozen(content)).toBe(false);
    expect(Object.isFrozen(presented.cells[0].content)).toBe(true);
  });
});
