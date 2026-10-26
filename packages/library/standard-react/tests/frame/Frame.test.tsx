import { createInputScene, Node, Path, Step } from '@retikz/react';
import { AxesProvider, createFrame, FrameProvider, GridProvider } from '@retikz/standard/presentation';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { FrameProps } from '../../src/presentation';
import { Axes, Frame, FrameDescription, FrameTitle, Grid } from '../../src/presentation';
import { synchronousAdapters } from '../helpers/synchronous-adapters';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
};

/** 以 React 真实 authoring 路径归一化一个 Frame */
const contribute = ({ children, ...props }: FrameProps) => {
  const normalized = normalizeReactInput(<Frame {...props}>{children}</Frame>);
  return {
    node: normalized.ir.children[0],
    providerDependencies: normalized.contributions[0],
  };
};

describe('<Frame>', () => {
  it('将根 Scope 字段与嵌套边界 Path 字段分开', () => {
    const result = normalizeReactInput(
      <Frame
        id="root"
        meta={{ source: 'react' }}
        border={{ style: { stroke: '#0284c7', zIndex: 4 }, cornerRadius: 3 }}
        defaults={{ style: { stroke: '#0f172a' } }}
      >
        <Node position={[0, 0]} />
      </Frame>,
    );

    expect(result.ir.children[0]).toMatchObject({
      id: 'root',
      defaults: { style: { stroke: '#0f172a' } },
      meta: { source: 'react' },
      border: { style: { stroke: '#0284c7', zIndex: 4 }, cornerRadius: 3 },
    });
  });

  it('将语义头部部分和主体节点转换为规范框架 IR', () => {
    const props = {
      id: 'definition-contract/frame',
      padding: 12,
      border: { cornerRadius: 6 },
      headerDirection: 'vertical' as const,
      children: (
        <>
          <FrameTitle text="Explicit title" style={{ font: { family: 'serif' } }}>
            Ignored title
          </FrameTitle>
          <FrameDescription layout={{ maxTextWidth: 220 }}>One registry contract.</FrameDescription>
          <Node position={[0, 0]} text="A" />
        </>
      ),
    };
    const first = contribute(props);
    const second = contribute(props);

    expect(first.node).toEqual(
      createFrame({
        id: 'definition-contract/frame',
        padding: 12,
        border: { cornerRadius: 6 },
        headerDirection: 'vertical',
        title: {
          text: 'Explicit title',
          style: { font: { family: 'serif' } },
        },
        description: {
          text: 'One registry contract.',
          layout: { maxTextWidth: 220 },
        },
        children: [{ type: 'node', position: [0, 0], text: 'A' }],
      }),
    );
    expect(first.providerDependencies.providers[0]).toBe(FrameProvider);
    expect(second.providerDependencies.providers[0]).toBe(FrameProvider);
  });

  it('在 FrameTitle 和 FrameDescription 上保留 JSON 安全的 Node 字段', () => {
    const animations = [
      {
        property: 'opacity' as const,
        duration: 200,
        keyframes: [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
      },
    ];
    const contribution = contribute({
      id: 'styled/frame',
      children: (
        <>
          <FrameTitle
            id="heading"
            shape="circle"
            label={{ text: 'stable', position: 'right' }}
            meta={{ role: 'title' }}
            animations={animations}
            style={{ fill: '#fff' }}
            layout={{ padding: 3 }}
          >
            Contract
          </FrameTitle>
          <Node position={[0, 0]} />
        </>
      ),
    });

    expect(contribution.node).toMatchObject({
      title: {
        id: 'heading',
        text: 'Contract',
        shape: 'circle',
        style: { fill: '#fff' },
        layout: { padding: 3 },
        label: { text: 'stable', position: 'right' },
        meta: { role: 'title' },
        animations,
      },
    });
  });

  it('重复零件、不受支持的身体子零件和独立零件明确报错', () => {
    expect(() =>
      contribute({
        id: 'duplicate/frame',
        children: (
          <>
            <FrameTitle>First</FrameTitle>
            <FrameTitle>Second</FrameTitle>
            <Node position={[0, 0]} />
          </>
        ),
      }),
    ).toThrow(/one FrameTitle/i);

    expect(() =>
      contribute({
        id: 'invalid/frame',
        children: (
          <Path>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[10, 0]} />
          </Path>
        ),
      }),
    ).toThrow(/only accepts direct Node children/i);

    expect(() => normalizeReactInput(<FrameTitle>Standalone</FrameTitle>)).toThrow(/direct child of Frame/i);
    expect(() => normalizeReactInput(<FrameDescription>Standalone</FrameDescription>)).toThrow(
      /direct child of Frame/i,
    );
  });

  it('拒绝 React 边界处的对象样式标题和描述属性', () => {
    const objectHeaderProps = {
      title: { text: 'Object title' },
      description: { text: 'Object description' },
    };

    expect(() =>
      contribute({
        id: 'invalid/frame',
        children: <Node position={[0, 0]} />,
        ...objectHeaderProps,
      }),
    ).toThrow(/FrameTitle.*FrameDescription/i);
  });

  it('与 Grid 和 Axes 在不同的贡献命名空间下共存', () => {
    const result = normalizeReactInput(
      <>
        <Grid bounds={{ start: [0, 0], end: [20, 20] }} line={{ spacing: 10 }} />
        <Axes x={{ extent: 20 }} y={{ extent: 20 }} />
        <Frame id="group/frame">
          <FrameTitle>Group</FrameTitle>
          <Node position={[0, 0]} text="A" />
        </Frame>
      </>,
    );

    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
    expect(result.contributions.map(contribution => contribution.roots[0])).toEqual([
      GridProvider.key,
      AxesProvider.key,
      FrameProvider.key,
    ]);
    expect(result.ir.children[2]).toMatchObject({ id: 'group/frame' });
  });
});
