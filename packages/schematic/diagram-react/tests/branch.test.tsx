import { normalizeBranchDiagram } from '@retikz/diagram-vanilla/branch';
import { BranchDiagramSchema } from '@retikz/diagram/branch';
import { convertReactToInputScene } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { createElement } from 'react';
import { expect, it } from 'vitest';

import { RetikzDiagramReactError, RetikzDiagramReactErrorCode } from '../src';
import { Branch, BranchDiagram, BranchNode } from '../src/branch';
import { collectBranchDiagramInput } from '../src/branch/authoring';

it('将 React 关键元数据保留在持久节点和分支 props 之外', () => {
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

it('通过相同的 Vanilla 源保留共享有序分支', () => {
  const input = convertReactToInputScene(
    <BranchDiagram mainBranch="main">
      <BranchNode id="a" labels={[{ text: 'A' }]} />
      <BranchNode id="b" />
      <Branch id="main" nodes={['a', 'b']} />
    </BranchDiagram>,
  );
  const result = normalizeScene(input);
  const vanilla = normalizeBranchDiagram({
    mainBranch: 'main',
    nodes: [{ id: 'a', labels: [{ text: 'A' }] }, { id: 'b' }],
    branches: [{ id: 'main', nodes: ['a', 'b'] }],
  });

  expect(BranchDiagramSchema.parse(result.ir.children[0])).toEqual(BranchDiagramSchema.parse(vanilla));
});

it('拒绝任意子内容和嵌入的宿主属性', () => {
  expect(() =>
    convertReactToInputScene(
      <BranchDiagram>
        <div />
      </BranchDiagram>,
    ),
  ).toThrowError(
    expect.objectContaining({
      constructor: RetikzDiagramReactError,
      code: RetikzDiagramReactErrorCode.BranchChildInvalid,
    }),
  );
  expect(() =>
    convertReactToInputScene(
      <BranchDiagram width={600}>
        <BranchNode id="a" />
        <Branch id="main" nodes={['a']} />
      </BranchDiagram>,
    ),
  ).toThrowError(
    expect.objectContaining({
      constructor: RetikzDiagramReactError,
      code: RetikzDiagramReactErrorCode.BranchHostPropsInvalid,
    }),
  );
});
