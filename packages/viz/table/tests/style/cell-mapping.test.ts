import { describe, expect, it } from 'vitest';

import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { resolveTableCellPlans } from '../../src/pipeline/rule';
import { resolveTableStyleTokens } from '../../src/providers/style';

const scaleContext = { categoricalColors: ['red'], sequentialColors: ['white', 'black'] } as const;

describe('style token Cell mapping', () => {
  it('maps body/header slots, both font leaves, and exact token winner traces', () => {
    const model = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      { data: { reference: 'rows' }, datasets: { rows: [{ value: 1 }] } },
    );
    const styleTokens = resolveTableStyleTokens('neutral', 'light', {
      'cell.content.font.family': 'monospace',
      'columnHeader.content.color': '#123456',
    });
    const result = resolveTableCellPlans(model, { styleTokens, scaleContext });

    expect(result.cells[0]).toMatchObject({
      appearance: {
        background: { fill: '#ffffff', fillOpacity: 1 },
        content: {
          color: '#123456',
          nodeDefault: { font: { family: 'sans-serif', weight: 500 } },
          labelDefault: { font: { family: 'sans-serif', weight: 500 } },
        },
        borders: { bottom: { kind: 'line', stroke: '#e4e4e7', width: 1, priority: -100 } },
      },
      trace: {
        appearance: {
          '/content/color': {
            kind: 'styleToken',
            tokenKey: 'columnHeader.content.color',
            tokenSource: 'user',
          },
          '/content/nodeDefault/font/family': {
            kind: 'styleToken',
            tokenKey: 'columnHeader.content.font.family',
            tokenSource: 'preset',
          },
          '/content/labelDefault/font/family': {
            kind: 'styleToken',
            tokenKey: 'columnHeader.content.font.family',
            tokenSource: 'preset',
          },
        },
      },
    });
    expect(result.cells[1]).toMatchObject({
      appearance: {
        content: {
          color: '#18181b',
          nodeDefault: { font: { family: 'monospace', weight: 400 } },
          labelDefault: { font: { family: 'monospace', weight: 400 } },
        },
      },
    });
  });

  it('uses final fill as the background gate and honors header null clearing', () => {
    const model = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      { data: { reference: 'rows' }, datasets: { rows: [{ value: 1 }] } },
    );
    const styleTokens = resolveTableStyleTokens('neutral', 'light', {
      'cell.background.fill': null,
      'cell.background.fillOpacity': 0.5,
      'columnHeader.background.fill': null,
      'columnHeader.background.fillOpacity': 0.25,
    });
    const result = resolveTableCellPlans(model, { styleTokens, scaleContext });

    for (const cell of result.cells) {
      expect(cell.appearance).not.toHaveProperty('background');
      expect(cell.trace.appearance).not.toHaveProperty('/background/fill');
      expect(cell.trace.appearance).not.toHaveProperty('/background/fillOpacity');
    }
  });
});
