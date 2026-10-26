import { describe, expect, it } from 'vitest';

import { BranchDiagramSchema, BranchLayoutIntentSchema } from '../../src/branch/schemas';

describe('分支 Source', () => {
  const source = {
    namespace: 'diagram',
    type: 'branch',
    nodes: [{ id: 'a' }],
    branches: [{ id: 'main', nodes: ['a'] }],
  };
  it('往返单节点分支并默认布局意图', () => {
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
  ])('拒绝无效的 Source %j', invalid => {
    expect(BranchDiagramSchema.safeParse(invalid).success).toBe(false);
  });
});
