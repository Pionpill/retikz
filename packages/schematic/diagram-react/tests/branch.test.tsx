import { normalizeBranchDiagram } from '@retikz/diagram-vanilla/branch';
import { BranchDiagramSchema } from '@retikz/diagram/branch';
import { createInputScene } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { createElement } from 'react';
import { expect, it } from 'vitest';

import { Branch, BranchDiagram, BranchNode } from '../src/branch';
import { collectBranchDiagramInput } from '../src/branch/authoring';

it('keeps React key metadata out of persistent node and branch props', () => {
  const source = collectBranchDiagramInput(
    {
      children: [
        createElement(BranchNode, { key: 'node', id: 'a' }),
        createElement(Branch, { key: 'path', id: 'main', nodes: ['a'] }),
      ],
    },
    false,
  );
  expect(Object.getOwnPropertyNames(source.nodes[0])).toEqual(['id']);
  expect(Object.getOwnPropertyNames(source.branches[0])).toEqual(['id', 'nodes']);
});

it('preserves shared ordered branches through the same Vanilla source', () => {
  const input = createInputScene(
    <BranchDiagram mainBranch="main">
      <BranchNode id="a" labels={[{ text: 'A' }]} />
      <BranchNode id="b" />
      <Branch id="main" nodes={['a', 'b']} />
    </BranchDiagram>,
  );
  const adapters = input.adapters.map(adapter => {
    if (adapter.lower === undefined) throw new Error('Expected synchronous adapter');
    return adapter;
  });
  const result = normalizeScene(input.scene, { adapters });
  const vanilla = normalizeBranchDiagram({
    mainBranch: 'main',
    nodes: [{ id: 'a', labels: [{ text: 'A' }] }, { id: 'b' }],
    branches: [{ id: 'main', nodes: ['a', 'b'] }],
  });
  expect(BranchDiagramSchema.parse(result.ir.children[0])).toEqual(BranchDiagramSchema.parse(vanilla));
});

it('rejects arbitrary child content and embedded host properties', () => {
  expect(() =>
    createInputScene(
      <BranchDiagram>
        <div />
      </BranchDiagram>,
    ),
  ).toThrow();
  expect(() =>
    createInputScene(
      <BranchDiagram width={600}>
        <BranchNode id="a" />
        <Branch id="main" nodes={['a']} />
      </BranchDiagram>,
    ),
  ).toThrow();
});
