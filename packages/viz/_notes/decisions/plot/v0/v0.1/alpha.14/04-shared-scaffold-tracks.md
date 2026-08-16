# ADR-04：shared scaffold tracks

- 状态：Superseded
- 替代：[ADR-09](./09-composition-api-structure.md)；shared tracks 保留，公开结构统一进入 tracks arrangement
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md)

## 背景

用户给出的径向信息图和环形组学图都有一个共同特征：多个局部图层共享一部分坐标基底，但另一部分 range 分成不同带。极坐标里常见为共享 center / angle，按 radius 分 ring；笛卡尔里可以共享 x，按 y 分 lane；混合图里甚至只共享 bbox / anchor / data identity，各自投影。

这类图形不是普通 facet。facet 的 panel 之间通常是彼此分离的小图；shared scaffold tracks 则强调“同一骨架上的多个轨道”。它也不等同双轴 overlay：overlay 多数共用同一 plotArea，tracks 则把某些 role 的 range 分配到不同 band。

ADR-01 已预留 `placement.kind = 'track'` 与 `scaffold` / `track` 引用。ADR-04 定义 scaffold registry，使 track 能以坐标系无关的方式声明“共享哪些 role、哪些 role 局部化、每个 track 占据哪段 range”。

## 决策：composition.scaffolds 声明共享坐标骨架，track scope 挂载到 scaffold track

`IRPlot.composition` 新增 `scaffolds`。每个 scaffold 声明一个基础 coordinate、共享 role 列表和 track 列表。track scope 通过 ADR-01 的 `placement: { kind: 'track', scaffold, track }` 挂载到某个 track。共享 role 的 scale/domain/range 由 scaffold 管理；local role 的 range 由 track band 管理。

```ts
type SharedScaffold = {
  id: string;
  coordinate: IRPlotCoordinateOperation;
  sharedRoles: Array<string>;
  tracks: Array<ScaffoldTrack>;
  frame?: ScaffoldFrameModeValue;
};

const ScaffoldFrameMode = {
  Shared: 'shared',
  Independent: 'independent',
} as const;

type ScaffoldFrameModeValue = ValueOf<typeof ScaffoldFrameMode>;

type ScaffoldTrack = {
  id: string;
  band: {
    role: string;
    start: number;
    end: number;
  };
  order?: number;
};

type CoordinateComposition = {
  scaffolds?: Array<SharedScaffold>;
};
```

例子：

- polar rings：`coordinate: polar2D`，`sharedRoles: ['x']`，每个 track 的 `band.role = 'y'`，`start/end` 表示 radius fraction。
- cartesian lanes：`coordinate: cartesian2D`，`sharedRoles: ['x']`，每个 track 的 `band.role = 'y'`。
- mixed scopes：`sharedRoles: []`，`frame: 'shared'`，只共享 bbox / anchor identity；各 track scope 可声明自己的 coordinate。

规则：

1. `sharedRoles` 中的 role 由 scaffold 统一训练 scale/domain；所有 track scope 共享同一 range。
2. `band.role` 必须不在 `sharedRoles` 中；它是被 track 局部化的 role。
3. `band.start/end` 是 0..1 的 scaffold-local fraction，lowering 转成具体 range。`start < end`。
4. track scope 若省略自己的 coordinate，则继承 scaffold coordinate；若提供 coordinate，则必须能消费 scaffold 的 shared role 或仅共享 frame。
5. track scope 仍是 coordinate scope，可被 mark / guide / locator 通过 `coordinateScope` 引用。

理由：

1. 用 role 名而不是 polar-specific `angle` / `radius` 字段，保持坐标系无关。
2. scaffold 管共享 basis，track 管局部 band，职责清晰，后续 v0.3 composite 可直接展开。
3. `start/end` 使用 fraction，避免在 schema 中固化像素测量；实际尺寸由 lowering 根据 plotArea 计算。
4. 自定义 coordinate 可通过 roles 加入 scaffold，不需要内置白名单。

## 不在本 ADR 范围

- 不做高层 composite / chart preset；这里只提供 plot primitive。
- 不做自动环宽 / lane 高度分配算法；本 ADR 使用显式 fraction。
- 不做 track label / group label / axis title 布局；ADR-05 处理。
- 不做跨 scaffold 的复杂对齐。
