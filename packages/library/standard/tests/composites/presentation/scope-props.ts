import type { IRScopeProps } from '@retikz/core';

/** 覆盖 Core Scope 全部 authored surface 的测试输入，供各 presentation composite 复用 */
export const fullScopeProps = {
  id: 'scope-root',
  localNamespace: true,
  boundingShape: 'circle',
  theme: { mode: 'dark' },
  transforms: [{ kind: 'translate', x: 4, y: 5 }],
  position: { kind: 'anchor', target: [10, 20], selfAnchor: 'center' },
  zIndex: 3,
  clip: { kind: 'rect', x: -10, y: -10, width: 40, height: 30 },
  meta: { source: 'scope-props-test' },
  animations: [
    {
      property: 'opacity',
      duration: 200,
      keyframes: [
        { at: 0, value: 0.5 },
        { at: 1, value: 1 },
      ],
    },
  ],
  defaults: {
    style: {
      color: '#0f172a',
      stroke: '#334155',
      fill: '#f8fafc',
      strokeWidth: 2,
      opacity: { overall: 0.9, fill: 0.4, stroke: 0.8 },
    },
    reset: ['path'],
    node: { style: { fill: '#e2e8f0' }, layout: { padding: 2 }, label: { textColor: '#475569', opacity: 0.7 } },
    path: {
      style: { stroke: '#64748b', strokeWidth: 1.5 },
      label: { textColor: '#475569', opacity: 0.7 },
      arrow: { shape: 'stealth', scale: 1.2 },
    },
  },
} satisfies IRScopeProps;
