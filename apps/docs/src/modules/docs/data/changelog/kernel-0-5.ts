import type { Release } from '../types';

export const kernelV05: Release = {
  minor: 'v0.5',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/core',
      version: 'v0.5',
      description: {
        zh: 'v0.5 继续补齐跨图元布局能力；alpha.1 增加 Node 锚点对齐，并统一节点标签的视觉框间距、基线、引线与边界。',
        en: 'v0.5 continues the cross-primitive layout foundation; alpha.1 adds Node anchor alignment and unifies label visual-box spacing, baselines, leaders, and bounds.',
      },
      highlights: [
        {
          label: { zh: 'Node 锚点对齐定位', en: 'Node anchor-to-anchor placement' },
          content: {
            zh: '`Node.position` 新增 `{ kind: "anchor", target, selfAnchor? }`：文本、shape、padding、margin、scale 与 rotate 布局完成后再整体平移；目标支持已完成布局的 Node、Coordinate 与 Scope，双方 anchor 默认 center。未定义、后置、自引用和仍在布局的祖先 Scope 会直接报错，已解析空 Scope 合法。',
            en: '`Node.position` adds `{ kind: "anchor", target, selfAnchor? }`. The compiler completes text, shape, padding, margin, scale, and rotation layout before translating the whole Node. Targets may be already-laid-out Nodes, Coordinates, or Scopes, and both anchors default to center. Undefined, later, self, and still-open ancestor Scope targets fail loudly, while a resolved empty Scope remains valid.',
          },
        },
        {
          label: { zh: 'Node 标签视觉框间距', en: 'Node label visual-box spacing' },
          content: {
            zh: '`Node.label.distance` 现在表示节点边界到旋转后标签视觉框的净距，而不是到标签中心的距离；`distance: 0` 精确贴边，inside / outside 共用同一盒几何。标签度量在节点矩形前完成，之后不再重新测量；基线、pin 精确交点、Scene 边界与自动 viewBox 复用同一结果。非法默认距离或 `measureText` 度量会立即报错；非法 TeX 盒仍发出 `TEX_INVALID` warning 并跳过对应 run。',
            en: '`Node.label.distance` now means the net gap from the node boundary to the rotated label visual box rather than the label center. `distance: 0` touches exactly, and inside / outside share the same box geometry. Label metrics settle before the node rectangle and the same result drives baselines, exact pin intersections, Scene bounds, and the automatic viewBox. Invalid default distances or `measureText` metrics fail loudly; invalid TeX boxes still emit a `TEX_INVALID` warning and skip the affected run.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-22',
          summary: {
            zh: '新增 Node anchor-to-anchor 定位；标签间距改按旋转视觉框计算，并统一基线、pin 终点与自动 viewBox，保持 IR 与 renderer 契约不变。',
            en: 'Adds Node anchor-to-anchor placement; label spacing now uses the rotated visual box with unified baselines, pin endpoints, and automatic viewBox, while IR and renderer contracts stay unchanged.',
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
