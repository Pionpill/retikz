import { type ReactElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { IR, IRChild } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';
import { Draw } from '../../src/sugar/Draw';
import { TIKZ_NODE, TIKZ_PATH, TIKZ_STEP } from '../../src/kernel/_displayNames';
import { buildIR } from '../../src/kernel/_builder';
import { convertIRToReactNode } from '../../src/kernel/_unbuilder';

const emptyScene: IR = {
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: [],
};

/** 把 ReactNode 收成 ReactElement 数组，过滤掉 null/string 等非 element 项 */
const toElements = (node: ReturnType<typeof convertIRToReactNode>): Array<ReactElement> => {
  const arr = Array.isArray(node) ? node : [node];
  return arr.filter(isValidElement);
};

describe('convertIRToReactNode', () => {
  it('空 scene → 空数组', () => {
    const out = convertIRToReactNode(emptyScene);
    expect(toElements(out)).toHaveLength(0);
  });

  it('单 Node 还原为 <Node /> element，displayName 与关键 props 原样', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [10, 20],
          text: 'Hi',
          fill: '#fff',
          stroke: '#000',
          strokeWidth: 2,
        },
      ],
    };
    const [el] = toElements(convertIRToReactNode(ir));
    expect((el.type as { displayName?: string }).displayName).toBe(TIKZ_NODE);
    expect(el.props).toMatchObject({
      id: 'A',
      position: [10, 20],
      text: 'Hi',
      fill: '#fff',
      stroke: '#000',
      strokeWidth: 2,
    });
  });

  it('IR Node 上 undefined 字段不写进 element props', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0] }],
    };
    const [el] = toElements(convertIRToReactNode(ir));
    expect(el.props).not.toHaveProperty('id');
    expect(el.props).not.toHaveProperty('text');
    expect(el.props).not.toHaveProperty('fill');
  });

  it('Path + 2 Step 还原：<Path> 含两个 <Step> children，displayName / kind / to 全对', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: 'red',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    };
    const [pathEl] = toElements(convertIRToReactNode(ir));
    expect((pathEl.type as { displayName?: string }).displayName).toBe(TIKZ_PATH);
    expect(pathEl.props).toMatchObject({ stroke: 'red' });

    const stepEls = toElements(pathEl.props.children as ReturnType<typeof convertIRToReactNode>);
    expect(stepEls).toHaveLength(2);
    expect((stepEls[0].type as { displayName?: string }).displayName).toBe(TIKZ_STEP);
    expect(stepEls[0].props).toMatchObject({ kind: 'move', to: 'A' });
    expect(stepEls[1].props).toMatchObject({ kind: 'line', to: [100, 100] });
  });

  it('Kernel-only round-trip：IR → React → IR 等价', () => {
    const ir: IR = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        { type: 'node', id: 'B', position: [50, 0], text: 'B' },
        {
          type: 'path',
          stroke: 'blue',
          strokeWidth: 1,
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'line', to: 'B' },
          ],
        },
      ],
    };
    const back = buildIR(convertIRToReactNode(ir));
    expect(back).toEqual(ir);
  });

  it('Sugar 降级：<Draw> → IR → React 还原成 <Path>，二次 round-trip IR 稳定', () => {
    const ir1 = buildIR(<Draw way={['A', [10, 0]]} stroke="red" />);
    const ir2 = buildIR(convertIRToReactNode(ir1));
    expect(ir2).toEqual(ir1);

    const [pathEl] = toElements(convertIRToReactNode(ir1));
    expect((pathEl.type as { displayName?: string }).displayName).toBe(TIKZ_PATH);
    expect((pathEl.type as { displayName?: string }).displayName).not.toBe('Draw');
  });

  it('未知 child.type → 抛 "unknown IR child type" 错误', () => {
    const badIR = {
      version: CURRENT_IR_VERSION,
      type: 'scene' as const,
      children: [{ type: 'bogus' } as unknown as IRChild],
    };
    expect(() => convertIRToReactNode(badIR)).toThrow(/convertIRToReactNode: unknown IR child type/);
  });
});
