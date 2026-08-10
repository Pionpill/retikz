import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as notationExports from '../src';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
  retikz: { domain: string; releaseGroup: string };
  exports: Record<string, unknown>;
  publishConfig: { exports: Record<string, unknown> };
};

describe('@retikz/notation package boundary', () => {
  it('declares the Diagram Notation release metadata and one root export', () => {
    expect(manifest).toMatchObject({
      name: '@retikz/notation',
      version: '0.1.0-alpha.1',
      retikz: { domain: 'diagram', releaseGroup: 'notation' },
    });
    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.']);
  });

  it('exposes the six accepted Notation elements without compatibility aliases', () => {
    expect(notationExports.NOTATION_NAMESPACE).toBe('notation');
    expect(notationExports.LogicFrameDefinition).toBeDefined();
    expect(notationExports.ConnectorDefinition).toBeDefined();
    expect(notationExports.TerminalSchema).toBeDefined();
    expect(notationExports.StageSchema).toBeDefined();
    expect(notationExports.DecisionSchema).toBeDefined();
    expect(notationExports.JunctionSchema).toBeDefined();
    expect(notationExports.NotationElementType).toEqual({
      LogicFrame: 'logicFrame',
      Terminal: 'terminal',
      Stage: 'stage',
      Decision: 'decision',
      Junction: 'junction',
      Connector: 'connector',
    });
    expect(notationExports).not.toHaveProperty('StandardLogicFrameDefinition');
    expect(notationExports).not.toHaveProperty('StandardTerminal');
  });

  it('exposes cross-owner shared contracts and keeps implementation shapes private', () => {
    expect(notationExports.NonBlankStringSchema).toBeDefined();
    expect(notationExports.LogicSpacingSchema).toBeDefined();
    expect(notationExports.LogicNeutralStyleSchema).toBeDefined();
    expect(notationExports.LogicContentSizeDefault).toBeDefined();
    expect(notationExports).not.toHaveProperty('STANDARD_LAYOUT_NAMESPACE');
    expect(notationExports).not.toHaveProperty('LogicUnitAppearanceBaseShape');
    expect(notationExports).not.toHaveProperty('ConnectorAppearanceCanonicalSchema');
  });

  it('preserves owner-routed public contracts and removes dead shared surface', () => {
    expect(notationExports.NotationElementType).toBeDefined();
    expect(notationExports.ConnectorRole).toBeDefined();
    expect(notationExports).not.toHaveProperty('CalloutSide');
    expect(notationExports).not.toHaveProperty('CalloutSideSchema');
    expect(notationExports).not.toHaveProperty('CalloutPlacementSchema');
    expect(notationExports).not.toHaveProperty('CalloutSchema');
    expect(notationExports).not.toHaveProperty('CalloutArtifactSchema');
    expect(notationExports).not.toHaveProperty('LogicDiagramTargetSchema');
    expect(notationExports).not.toHaveProperty('ConnectorAppearanceSchema');
    expect(notationExports).not.toHaveProperty('createCallout');
    expect(notationExports).not.toHaveProperty('CalloutDefinition');
    expect(notationExports).not.toHaveProperty('LogicUnitAppearanceSchema');
  });

  it('rejects the old Standard composite namespace', () => {
    expect(() =>
      notationExports.LogicFrameSchema.parse({
        namespace: 'standard',
        type: 'logicFrame',
        id: 'legacy',
        sections: [{ key: 'section', child: { type: 'node', id: 'child' } }],
      }),
    ).toThrow();
    expect(() =>
      notationExports.ConnectorSchema.parse({
        namespace: 'standard',
        type: 'connector',
        id: 'legacy',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 10] },
        ],
      }),
    ).toThrow();
  });
});
