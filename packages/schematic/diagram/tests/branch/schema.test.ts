import { describe, expect, it } from 'vitest';

import { BranchDiagramSchema, BranchLayoutIntentSchema } from '../../src/branch/schemas';

describe('Branch Source', () => {
  const source = {
    namespace: 'diagram',
    type: 'branch',
    nodes: [{ id: 'a' }],
    branches: [{ id: 'main', nodes: ['a'] }],
  };
  it('round-trips a single-node branch and defaults layout intent', () => {
    const parsed = BranchDiagramSchema.parse(source);

    expect(BranchDiagramSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(BranchLayoutIntentSchema.parse({})).toEqual({ direction: 'right', nodeGap: 48, laneGap: 48 });
  });

  it.each([
    { ...source, relations: [] },
    { ...source, nodes: [] },
    { ...source, branches: [{ id: 'main', nodes: [] }] },
    { ...source, nodes: [{ id: 'a', text: 'body' }] },
    { ...source, nodes: [{ id: 'a', position: [0, 0] }] },
  ])('rejects invalid Source %j', invalid => {
    expect(BranchDiagramSchema.safeParse(invalid).success).toBe(false);
  });
});
