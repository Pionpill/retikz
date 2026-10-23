import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { defineTableThemeStyle, resolveTableThemeDefaults } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { resolveTableCellPlans } from '../../src/pipeline/rule';

const lightColors = resolveDefaultCoreThemeColors(ThemeMode.Light);

const resolvedBaseline = resolveTableThemeDefaults();

const sequential = resolvedBaseline.defaults.defaultVisual?.sequential;
if (sequential === undefined || sequential === null)
  throw new Error('test fixture requires the default sequential palette');
const scaleContext = {
  categoricalColors: resolvedBaseline.defaults.defaultVisual?.categorical ?? lightColors.categorical,
  sequentialColors: [sequential[0], sequential[1]] as const,
};

describe('Source defaults Cell mapping', () => {
  it('maps body/header slots, both font leaves, and exact defaults winner traces', () => {
    const model = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      { data: { reference: 'rows' }, datasets: { rows: [{ value: 1 }] } },
    );
    const defaultTable = resolveTableThemeDefaults({ style: 'mapping', mode: ThemeMode.Light, colors: lightColors }, [
      defineTableThemeStyle({
        name: 'mapping',
        resolve: () => ({
          defaults: {
            defaultAppearance: {
              body: {
                content: { defaults: { node: { style: { font: { family: 'monospace', weight: 400 } } } } },
              },
              columnHeader: { content: { defaults: { style: { color: '#123456' } } } },
            },
          },
        }),
      }),
    ]);
    const result = resolveTableCellPlans(model, { defaultTable, scaleContext });

    expect(result.cells[0]).toMatchObject({
      appearance: {
        background: { fill: '#ffffff', fillOpacity: 1 },
        content: {
          defaults: {
            style: { color: '#123456' },
            node: {
              style: { font: { family: 'sans-serif', weight: 500 } },
              label: { font: { family: 'sans-serif', weight: 500 } },
            },
            path: { label: { font: { family: 'sans-serif', weight: 500 } } },
          },
        },
        borders: { bottom: { kind: 'line', stroke: '#e4e4e7', width: 1 } },
      },
      trace: {
        appearance: {
          '/content/defaults/style/color': { kind: 'defaults', path: '$style/mapping/light' },
        },
      },
    });
    expect(result.cells[1]).toMatchObject({
      appearance: {
        content: {
          defaults: {
            style: { color: '#18181b' },
            node: {
              style: { font: { family: 'monospace', weight: 400 } },
              label: { font: { family: 'sans-serif', weight: 400 } },
            },
            path: { label: { font: { family: 'sans-serif', weight: 400 } } },
          },
        },
      },
      trace: {
        appearance: {
          '/content/defaults/node/style/font/family': { kind: 'defaults', path: '$style/mapping/light' },
          '/content/defaults/node/style/font/weight': { kind: 'defaults', path: '$style/mapping/light' },
        },
      },
    });
  });

  it('uses final fill as the background gate for explicit none backgrounds', () => {
    const model = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      { data: { reference: 'rows' }, datasets: { rows: [{ value: 1 }] } },
    );
    const defaultTable = resolveTableThemeDefaults(
      { style: 'transparent', mode: ThemeMode.Light, colors: lightColors },
      [
        defineTableThemeStyle({
          name: 'transparent',
          resolve: () => ({
            defaults: {
              defaultAppearance: {
                body: { background: { fill: 'none', fillOpacity: 0.5 } },
                columnHeader: { background: { fill: 'none', fillOpacity: 0.25 } },
              },
            },
          }),
        }),
      ],
    );
    const result = resolveTableCellPlans(model, { defaultTable, scaleContext });

    for (const cell of result.cells) {
      expect(cell.appearance.background).toMatchObject({ fill: 'none' });
      expect(cell.trace.appearance).toHaveProperty('/background/fill');
      expect(cell.trace.appearance).toHaveProperty('/background/fillOpacity');
    }
  });
});
