# ADR-05：Border Graph 与共享边冲突解析

- 状态：Accepted
- 决策日期：2026-07-23
- 收口日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [Cell box 与 span](./03-cell-box-span-and-alignment.md) · [layout lowering 与 manifest](./06-layout-lowering-manifest-and-migration.md)

## 背景

Table border 同时来自 Table defaults 与 Cell 四边。共享边、span、空槽和 gap 会让“每个 Cell 各画四条线”产生重复绘制、内部断线或依赖输入顺序的结果。边框需要先形成 canonical topology，再解析候选并 lowering 为 Core Path。

Border Graph 是 Table 的封闭布局结构，不是新的 Definition / registry。Structure 与 Presentation 仍只提供模型和内容，renderer 只消费最终 Core Path。

## 决策

### 公开 schema

Table 公开两类 border candidate：

- `{ kind: 'none', priority? }`：显式抑制边线
- `{ kind: 'line', stroke?, width?, strokeOpacity?, dashPattern?, dashOffset?, priority? }`

line defaults 为 `currentColor`、width `1`、opacity `1`、dashOffset `0`；priority 是有限整数，默认 `0`。`stroke: 'none'` 不作为 line 接受，隐藏语义只用 `kind: 'none'`。

`IRTableCellLayout.borders` 按 `top/right/bottom/left` 提供 Cell 候选。`IRTableLayout.borders` 提供 `mode`、`outer`、`horizontal`、`vertical` defaults；mode 默认为 `collapse`，也支持 `separate`。

### canonical atoms

Border Graph 从已求解的 canonical tracks 与 Cell occupancy 构造：

- `collapse` 以逻辑 row / column boundary 的最小区间为 atom；同一 spanning Cell 内部的 boundary 不生成 atom
- `separate` 为每个真实 Cell side 建立独立 atom，span side 覆盖完整 Cell box
- gap 存在时，collapse boundary 位于相邻轨道端点中点；separate 使用各 Cell box 的物理边
- 空表、稀疏槽位、零尺寸轨道与空候选集合都有确定输出

atom 与 contribution key 由 canonical index、side 与 source 产生，不使用 Cell 数组顺序或 module counter。所有几何必须 finite、轴对齐且非反向；重复 key、非法 occupancy 或非法 candidate fail-loud。

### 冲突 tuple

collapse atom 的 winner 按以下 tuple 确定：

1. priority 高者优先
2. Cell side 比 Table default 更具体
3. 同级时显式 `none` 优先于 line
4. line width 大者优先
5. canonical owner side rank
6. canonical source order key

该排序与 Cell id、输入数组顺序和对象属性顺序无关。manifest 保留 winner 与 canonical ordered contributors，使冲突结果可诊断、可追溯。

winner 为 line 且 width / opacity 大于 `0` 时才可见。连续可见 atoms 仅在 collapse 模式、样式完全相同、solid string paint、无 dash 且连接点没有垂直交叉时合并；这样不会改变 paint bbox、dash phase 或交点语义。separate 模式不合并 Cell sides。

### lowering 与 bounds

每条最终 edge lowering 为 Core Path，使用 butt cap / miter join，并附带 JSON-safe `tableBorder` meta。manifest 同时记录 edge geometry、style、atomic provenance 与可选 path id。

border stroke 的可见范围进入 Table `visualOverflowBounds`，但不进入 allocation bounds、轨道 contribution 或 Cell alignment。Border Graph 不修改 Cell 内容 replay。

## 不采用的方案

- 不直接逐 Cell emit 四边：无法稳定处理共享边与 span
- 不让 renderer 或 CSS 负责 collapse：会破坏 renderer parity 与 manifest
- 不用“后声明覆盖先声明”：结果会依赖 Structure 输出顺序
- 不把 border 作为 Presentation provider：边框属于布局拓扑，不是内容表现
- 不合并 dashed、resource paint 或穿过交点的 atoms

## 公开影响与兼容性

- `IRTableLayout` 与 `IRTableCellLayout` 增加 border schema；默认无边框，保持 alpha.1 可见结果
- `TableBorderMode`、`TableBorderKind`、相关 schema / type 与 manifest schema 从 `@retikz/table` 导出
- manifest 新增 `borders`，包含稳定 edge、Path locator 与每个 atom 的 provenance
- border 不进入 Kernel IR；lowering 后仍只有 Core Path 与 JSON-safe meta

## 最终实现与验证

实现位于 `schemas/border`、`pipeline/layout/border/{build,resolve,merge}.ts`、lower emit 与 manifest contract。transaction 对 Border Scope layout 失败补充明确 stage、Table id 与原始 cause。

正式测试覆盖 collapse / separate、span 内边抑制、空槽、gap、priority/specificity/none/width/owner tie-break、顺序无关、合并限制、零 width/opacity、Path meta、manifest provenance 与失败诊断。关键证据位于 `tests/layout/border-graph.test.ts`、`tests/manifest/manifest.test.ts` 与 `tests/pipeline/layout-transaction.test.ts`。

主题、条件编码、复杂 stroke paint 合并、junction decoration 与跨页 fragmentation 不在 alpha.2 范围；后续能力必须继续复用本 ADR 的 canonical topology 与 provenance。
