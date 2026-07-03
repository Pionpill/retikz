# ADR-04：shared scaffold tracks

- 状态：Accepted（实现字段以 ADR-09 为准）
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md)

## 背景

用户给出的径向信息图和环形组学图都有一个共同特征：多个局部图层共享一部分坐标基底，但另一部分 range 分成不同带。极坐标里常见为共享 center / angle，按 radius 分 ring；笛卡尔里可以共享 x，按 y 分 lane；混合图里甚至只共享 bbox / anchor / data identity，各自投影。

这类图形不是普通 facet。facet 的 panel 之间通常是彼此分离的小图；shared scaffold tracks 则强调“同一骨架上的多个轨道”。它也不等同双轴 overlay：overlay 多数共用同一 plotArea，tracks 则把某些 role 的 range 分配到不同 band。

ADR-01 已预留 `placement.kind = 'track'` 与 `scaffold` / `track` 引用。ADR-04 定义 scaffold registry，使 track 能以坐标系无关的方式声明“共享哪些 role、哪些 role 局部化、每个 track 占据哪段 range”。

## 决策：composition.scaffolds 声明共享坐标骨架，track scope 挂载到 scaffold track

`PlotSpec.composition` 新增 `scaffolds`。每个 scaffold 声明一个基础 coordinate、共享 role 列表和 track 列表。track scope 通过 ADR-01 的 `placement: { kind: 'track', scaffold, track }` 挂载到某个 track。共享 role 的 scale/domain/range 由 scaffold 管理；local role 的 range 由 track band 管理。

```ts
type SharedScaffoldSpec = {
  id: string;
  coordinate: CoordinateOperation;
  sharedRoles: Array<string>;
  tracks: Array<ScaffoldTrackSpec>;
  frame?: ScaffoldFrameModeValue;
};

const ScaffoldFrameMode = {
  Shared: 'shared',
  Independent: 'independent',
} as const;

type ScaffoldFrameModeValue = ValueOf<typeof ScaffoldFrameMode>;

type ScaffoldTrackSpec = {
  id: string;
  band: {
    role: string;
    start: number;
    end: number;
  };
  order?: number;
};

type CoordinateCompositionSpec = {
  scaffolds?: Array<SharedScaffoldSpec>;
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

## 待决策点 🔻

- **`sharedRoles` 是否允许为空**：本草案允许，用于 mixed coordinate 只共享 frame / anchor 的场景。实现时需至少有 `frame: 'shared'` 或非空 `sharedRoles`，避免无意义 scaffold。
- **track band 是否用 fraction**：本草案倾向 fraction，因为它 JSON-safe、响应式、无文字测量依赖。具体 pixel gap 由 ADR-05 spacing 控制。
- **track scope 是否可覆盖 coordinate**：本草案允许，但必须 fail-loud 校验 shared role 可对齐；否则复杂 composite 无法表达 mixed ring / annotation。
- **band 重叠是否允许**：本草案默认不允许重叠，除非未来新增 `overlap: true`。先保证可解释性。

## DSL 表面

极坐标 rings：

```ts
const spec = {
  type: 'plot',
  data: { reference: 'omics' },
  scales,
  composition: {
    defaultScope: 'heat',
    scaffolds: [
      {
        id: 'circular',
        coordinate: { type: 'polar2D', angle: 'genome', radius: 'abundance' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'heat', band: { role: 'y', start: 0.2, end: 0.72 } },
          { id: 'bars', band: { role: 'y', start: 0.78, end: 1 } },
        ],
      },
    ],
    scopes: [
      { id: 'heat', placement: { kind: 'track', scaffold: 'circular', track: 'heat' } },
      { id: 'bars', placement: { kind: 'track', scaffold: 'circular', track: 'bars' } },
    ],
  },
  marks: [
    { type: 'interval', coordinateScope: 'heat', encoding: { x: { field: 'gene' }, y: { field: 'abundance' } } },
    { type: 'interval', coordinateScope: 'bars', encoding: { x: { field: 'gene' }, y: { field: 'argCount' } } },
  ],
};
```

笛卡尔 lanes：

```ts
const spec = {
  type: 'plot',
  data: { reference: 'timeline' },
  scales,
  composition: {
    defaultScope: 'events',
    scaffolds: [
      {
        id: 'lanes',
        coordinate: { type: 'cartesian2D', x: 'time', y: 'laneValue' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'events', band: { role: 'y', start: 0, end: 0.45 } },
          { id: 'volume', band: { role: 'y', start: 0.55, end: 1 } },
        ],
      },
    ],
    scopes: [
      { id: 'events', placement: { kind: 'track', scaffold: 'lanes', track: 'events' } },
      { id: 'volume', placement: { kind: 'track', scaffold: 'lanes', track: 'volume' } },
    ],
  },
  marks,
};
```

## 测试设计

`packages/graph/plot/tests/composition/shared-scaffold-tracks.test.ts` 覆盖：

- polar rings 共享 angle scale，两个 track 使用不同 radius band。
- cartesian lanes 共享 x scale，两个 track 使用不同 y band。
- track scope 省略 coordinate 时继承 scaffold coordinate。
- track scope 覆盖 coordinate 时仍可共享 frame。
- shared role domain 来自所有 track rows；local role domain 按 track-local rows 训练。
- band start/end 越界、反向、重叠 fail-loud。
- track placement 引用不存在的 scaffold / track fail-loud。
- custom coordinate scaffold 使用 definition roles 校验 sharedRoles。
- provenance 带 scaffold id / track id。

## 影响

- `PlotSpec.composition` 新增 `scaffolds`。
- lowering 需要在 resolveFrame 前建立 scaffold frame 和 track-local range。
- coordinate providers 需要允许外部传入 role range override。
- guide lowering 需要知道 track band，ADR-05 再处理 guide 展示策略。
- locator / provenance 需要带 scaffold / track identity，ADR-06 收口 public API。

## 不在本 ADR 范围

- 不做高层 composite / chart preset；这里只提供 plot primitive。
- 不做自动环宽 / lane 高度分配算法；本 ADR 使用显式 fraction。
- 不做 track label / group label / axis title 布局；ADR-05 处理。
- 不做跨 scaffold 的复杂对齐。

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。

原因：新增 scaffold schema，改变 coordinate range 分配和 lowering frame 构造。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.scaffolds` | `z.array(SharedScaffoldSchema).optional()` | 无 | Plot 内共享坐标骨架 registry |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.scaffolds[].id` | `z.string().min(1)` | 无 | scaffold 的稳定引用 id |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.scaffolds[].coordinate` | `CoordinateOperationSchema` | 无 | scaffold 的基础 coordinate operation |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.scaffolds[].sharedRoles` | `z.array(z.string().min(1))` | 无 | 由 scaffold 统一管理的 coordinate roles |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `ScaffoldFrameMode` | `as const` value object + `z.enum(ScaffoldFrameMode)` | 无 | scaffold frame 共享模式枚举：shared / independent |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.scaffolds[].frame` | `z.enum(ScaffoldFrameMode).optional()` | `'shared'` | 是否共享 scaffold frame / bbox |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.scaffolds[].tracks` | `z.array(ScaffoldTrackSchema).min(1)` | 无 | scaffold 下的 track 列表 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks[].id` | `z.string().min(1)` | 无 | track 的稳定引用 id |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks[].band.role` | `z.string().min(1)` | 无 | 被 track 局部化的 coordinate role |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks[].band.start` | `z.number().min(0).max(1)` | 无 | track band 起点 fraction |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks[].band.end` | `z.number().min(0).max(1)` | 无 | track band 终点 fraction |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks[].order` | `z.number().optional()` | 声明顺序 | track 排序提示 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 改 | `composition.scopes[].coordinate` | `CoordinateOperationSchema.optional()` + track 条件校验 | track scope 可继承 scaffold coordinate | track scope 可省略 coordinate；非 track scope 仍必填 |

### 文件 scope

- `packages/graph/plot/src/schemas/plot/schema.ts`
- `packages/graph/plot/src/schemas/coordinate/**`
- `packages/graph/plot/src/pipeline/**`
- `packages/graph/plot/src/providers/coordinate/**`
- `packages/graph/plot/tests/composition/shared-scaffold-tracks.test.ts`
- `apps/docs/src/contents/graph/**`（文档阶段）

### 测试象限

**Happy path**：

- `polar rings share angle`：两个 ring track 共享 x / angle。
- `cartesian lanes share x`：两个 lane track 共享 x。
- `inherited scaffold coordinate`：track scope 省略 coordinate 时继承 scaffold coordinate。

**边界**：

- `single track scaffold`：单 track scaffold 等价局部 band 图。
- `sharedRoles empty with shared frame`：mixed scope 只共享 frame 可用。
- `band touches edges`：start=0 / end=1 合法。

**错误路径**：

- `bad band range`：start >= end / 越界报错。
- `overlapping bands`：同 role band 重叠报错。
- `missing scaffold or track`：track placement 引用不存在时报错。
- `shared role collides local role`：band.role 出现在 sharedRoles 中报错。

**交互**：

- `facet plus scaffold`：facet panel 内可生成 scaffold tracks。
- `guide track binding`：axis guide 绑定 track scope。
- `provenance track id`：输出 meta 带 scaffold / track。

### 依赖的现有元素

- ADR-01 track placement：scope 挂载到 scaffold track。
- coordinate definitions roles：校验 sharedRoles / band.role。
- scale resolver：共享 role 与 local role 的 domain / range 训练。
- core `Scope`：track 仍 lower 成普通 Scope。
