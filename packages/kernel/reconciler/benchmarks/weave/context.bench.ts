import type { IRNode, IRScene, IRScope } from '@retikz/core';

import { defineCacheScenario } from './_scenario';
import type { CacheScenario } from './_scenario';

for (const count of [1, 100, 1000]) {
  defineCacheScenario((): CacheScenario => {
    const nodes: Array<IRNode> = Array.from({ length: count }, (_, index) => ({
      type: 'node',
      id: `node-${index}`,
      position: [index * 120, 0],
      text: `body ${index}`,
      label: [{ text: `label ${index}`, position: 'top' }],
      style: { fill: 'red' },
    }));
    const index = Math.floor(count / 2);
    const next: IRNode = { ...nodes[index], style: { fill: 'blue' } };
    const scene: IRScene = { type: 'scene', version: 1, children: nodes };
    return {
      domain: 'node',
      label: `带标签节点改色/${count}`,
      scene,
      steps: [
        {
          label: '仅修改主体填色',
          update: next,
          scene: { ...scene, children: nodes.map((node, slot) => (slot === index ? next : node)) },
        },
      ],
    };
  });

  defineCacheScenario((): CacheScenario => {
    const nodes: Array<IRNode> = Array.from({ length: count }, (_, index) => ({
      type: 'node',
      id: `node-${index}`,
      position: [index * 120, 0],
      text: `body ${index}`,
      label: [{ text: `label ${index}`, position: 'top' }],
    }));
    const scope: IRScope = { type: 'scope', id: 'container', children: nodes };
    const next: IRScope = { ...scope, transforms: [{ kind: 'translate', x: 10, y: 20 }] };
    const scene: IRScene = { type: 'scene', version: 1, children: [scope] };
    return {
      domain: 'scope',
      label: `文字标签后代的祖先平移/${count}`,
      scene,
      steps: [{ label: '仅修改祖先坐标变换', update: next, scene: { ...scene, children: [next] } }],
    };
  });

  defineCacheScenario((): CacheScenario => {
    const nodes: Array<IRNode> = Array.from({ length: count }, (_, index) => ({
      type: 'node',
      id: `node-${index}`,
      position: [index * 120, 0],
      text: `body ${index}`,
    }));
    const index = Math.floor(count / 2);
    const scope: IRScope = {
      type: 'scope',
      id: 'container',
      transforms: Array.from({ length: 16 }, (_, slot) =>
        slot % 2 === 0 ? { kind: 'translate', x: 2, y: 3 } : { kind: 'rotate', degrees: 5 },
      ),
      children: nodes,
    };
    const next: IRNode = { ...nodes[index], position: [index * 120, 50] };
    const scene: IRScene = { type: 'scene', version: 1, children: [scope] };
    return {
      domain: 'scope',
      label: `复杂变换下的后代移动/${count}`,
      scene,
      steps: [
        {
          label: '仅移动一个后代',
          update: next,
          parentPath: [0],
          scene: {
            ...scene,
            children: [{ ...scope, children: nodes.map((node, slot) => (slot === index ? next : node)) }],
          },
        },
      ],
    };
  });
}
