import type { Release } from '../types';

export const kernelV05: Release = {
  minor: 'v0.5',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/core',
      version: 'v0.5',
      description: {
        zh: 'v0.5 继续补齐跨图元布局能力；alpha.1 让 Node 可在自身真实几何完成后对齐已解析实体的锚点。',
        en: 'v0.5 continues the cross-primitive layout foundation; alpha.1 lets a Node align its final geometry to an anchor on a resolved entity.',
      },
      highlights: [
        {
          label: { zh: 'Node 锚点对齐定位', en: 'Node anchor-to-anchor placement' },
          content: {
            zh: '`Node.position` 新增 `{ kind: "anchor", target, selfAnchor? }`：文本、shape、padding、margin、scale 与 rotate 布局完成后再整体平移；目标支持已完成布局的 Node、Coordinate 与 Scope，双方 anchor 默认 center。未定义、后置、自引用和仍在布局的祖先 Scope 会直接报错，已解析空 Scope 合法。',
            en: '`Node.position` adds `{ kind: "anchor", target, selfAnchor? }`. The compiler completes text, shape, padding, margin, scale, and rotation layout before translating the whole Node. Targets may be already-laid-out Nodes, Coordinates, or Scopes, and both anchors default to center. Undefined, later, self, and still-open ancestor Scope targets fail loudly, while a resolved empty Scope remains valid.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-22',
          summary: {
            zh: '新增 Node anchor-to-anchor 定位，复用既有 anchor、boundary、namespace 与 Scope transform 语义，并保持 Scene / renderer 不变。',
            en: 'Adds Node anchor-to-anchor placement by reusing existing anchor, boundary, namespace, and Scope-transform semantics without changing Scene or renderers.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/react',
      version: 'v0.5',
      description: {
        zh: 'React `<Node position>` 等价暴露 core 的 anchor-to-anchor 定位，并保持 builder / unbuilder 原样往返。',
        en: 'React `<Node position>` exposes core anchor-to-anchor placement with lossless builder / unbuilder roundtrips.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-22',
          summary: {
            zh: '`NodeProps.position` 接受 `IRAnchorPosition`，不增加 React 私有 shorthand 或默认值改写。',
            en: '`NodeProps.position` accepts `IRAnchorPosition` without React-only shorthand or materialized defaults.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/vanilla',
      version: 'v0.5',
      description: {
        zh: 'Vanilla plain spec 直接透传同一份 `IRAnchorPosition`，与 core / React 保持等价。',
        en: 'Vanilla plain specs pass through the same `IRAnchorPosition`, remaining equivalent to core and React.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-22',
          summary: {
            zh: '`node()` 无新增平行 helper，直接接受 core IR 的 anchor position。',
            en: '`node()` adds no parallel helper and directly accepts core IR anchor positions.',
          },
          items: [],
        },
      ],
    },
  ],
};
