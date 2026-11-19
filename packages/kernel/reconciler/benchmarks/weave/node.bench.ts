import type { IRNode, IRScene, IRScope } from '@retikz/core';

import { defineCacheScenario } from './_scenario';
import type { CacheScenario } from './_scenario';

defineCacheScenario((): CacheScenario => {
  const node: IRNode = { type: 'node', id: 'body', text: 'body', position: [0, 0] };
  const sibling: IRNode = { type: 'node', id: 'other', text: 'other', position: [100, 0] };
  const moved: IRNode = { ...sibling, position: [200, 0] };
  const scene: IRScene = { type: 'scene', version: 1, children: [node, sibling] };
  return {
    domain: 'node',
    label: '无关旁支更新不进入目标阶段',
    scene,
    steps: [
      {
        label: '移动无依赖的兄弟节点',
        update: moved,
        scene: { ...scene, children: [node, moved] },
      },
    ],
  };
});

for (const identity of ['same', 'shallow', 'nested'] as const)
  defineCacheScenario((): CacheScenario => {
    const node: IRNode = { type: 'node', id: 'body', text: 'body', position: [0, 0] };
    const next = identity === 'same' ? node : identity === 'shallow' ? { ...node } : structuredClone(node);
    const scene: IRScene = { type: 'scene', version: 1, children: [node] };
    return {
      domain: 'node',
      label: `等值输入/${identity}`,
      scene,
      steps: [
        {
          label: '提交等值节点',
          update: next,
          scene: { ...scene, children: [next] },
        },
      ],
    };
  });

defineCacheScenario((): CacheScenario => {
  const node: IRNode = { type: 'node', id: 'body', text: 'body', position: [0, 0], style: { fill: 'red' } };
  const painted: IRNode = { ...node, style: { fill: 'blue' } };
  const moved: IRNode = { ...painted, position: [50, 20] };
  const resized: IRNode = { ...moved, layout: { width: 80 } };
  const renamed: IRNode = { ...resized, text: 'new body' };
  const scene: IRScene = { type: 'scene', version: 1, children: [node] };
  return {
    domain: 'node',
    label: '样式位置尺寸文字连续变化',
    scene,
    steps: [
      {
        label: '只改填色',
        update: painted,
        scene: { ...scene, children: [painted] },
      },
      {
        label: '只改位置',
        update: moved,
        scene: { ...scene, children: [moved] },
      },
      {
        label: '约束宽度变化',
        update: resized,
        scene: { ...scene, children: [resized] },
      },
      {
        label: '正文变化',
        update: renamed,
        scene: { ...scene, children: [renamed] },
      },
    ],
  };
});

defineCacheScenario((): CacheScenario => {
  const node: IRNode = { type: 'node', id: 'body', text: 'body', label: [{ text: 'label', position: 'top' }] };
  const moved: IRNode = { ...node, label: [{ text: 'label', position: 'bottom' }] };
  const renamed: IRNode = { ...moved, label: [{ text: 'renamed', position: 'bottom' }] };
  const scene: IRScene = { type: 'scene', version: 1, children: [node] };
  return {
    domain: 'node',
    label: '标签局部复用',
    scene,
    steps: [
      {
        label: '标签换边',
        update: moved,
        scene: { ...scene, children: [moved] },
      },
      {
        label: '标签改字',
        update: renamed,
        scene: { ...scene, children: [renamed] },
      },
    ],
  };
});

defineCacheScenario((): CacheScenario => {
  const node: IRNode = { type: 'node', id: 'body', text: 'body' };
  const scope: IRScope = {
    type: 'scope',
    id: 'container',
    defaults: { node: { style: { fill: 'red' } } },
    children: [node],
  };
  const changed: IRScope = { ...scope, defaults: { node: { style: { fill: 'blue' } } } };
  const scene: IRScene = { type: 'scene', version: 1, children: [scope] };
  return {
    domain: 'node',
    label: '继承默认样式变化',
    scene,
    steps: [
      {
        label: '修改父级默认填色',
        update: changed,
        scene: { ...scene, children: [changed] },
      },
    ],
  };
});
