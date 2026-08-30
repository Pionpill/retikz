import type { IRChild } from '@retikz/core';

import { compileToScene, DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { FlexLayoutDefinition } from '@retikz/layout';
import { createLegend, LegendDefinition, SurfaceDefinition } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { assembleDiagram, resolveDiagramAppearance } from '../../src/foundation';

const drawing: IRChild = { type: 'node', position: [0, 0], text: 'Drawing', padding: 0, minimumSize: 20 };

const legend = createLegend({
  content: {
    kind: 'items',
    items: [
      {
        key: 'one',
        sample: { type: 'node', position: [0, 0], minimumSize: 4 },
        label: { type: 'node', position: [0, 0], text: 'One', padding: 0 },
      },
    ],
  },
});

describe('Diagram private assembly', () => {
  it.each(['top', 'right', 'bottom', 'left'] as const)(
    'places the Legend on the %s side without changing logical slots',
    position => {
      const appearance = resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, undefined, undefined, new Map());
      const assembled = assembleDiagram({
        presentation: { title: 'Title', description: 'Description', legend },
        drawing,
        frame: { legendPosition: position },
        appearance,
      });

      expect(JSON.stringify(assembled)).toContain('Title');
      expect(JSON.stringify(assembled)).toContain('standard');
      const serialized = JSON.stringify(assembled);
      expect(serialized.indexOf('Title')).toBeLessThan(serialized.indexOf('Description'));
      expect(serialized.indexOf('Description')).toBeLessThan(serialized.indexOf('Drawing'));
    },
  );

  it('collapses missing presentation slots and keeps explicit zero gaps', () => {
    const appearance = resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, undefined, undefined, new Map());
    const assembled = assembleDiagram({
      presentation: { title: 'Title' },
      drawing,
      frame: { titleDescriptionGap: 0, headingMainGap: 0 },
      appearance,
    });

    expect(JSON.stringify(assembled)).not.toContain('description');
    expect(JSON.stringify(assembled)).not.toContain('legend');
    expect(JSON.stringify(assembled)).toContain('Title');
  });

  it('puts all existing regions inside one Surface and Core Scene', () => {
    const assembled = assembleDiagram({
      presentation: { title: 'Title', description: 'Description', legend },
      drawing,
      appearance: resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, undefined, undefined, new Map()),
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [assembled] },
      { composites: [SurfaceDefinition, FlexLayoutDefinition, LegendDefinition], padding: 0 },
    );

    expect(JSON.stringify(output.scene)).toEqual(expect.stringContaining('Title'));
    expect(JSON.stringify(output.scene)).toEqual(expect.stringContaining('Description'));
    expect(JSON.stringify(output.scene)).toEqual(expect.stringContaining('One'));
    expect(output.scene.primitives.length).toBeGreaterThan(0);
  });
});
