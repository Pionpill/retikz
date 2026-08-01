# ADR-07：Ranged Dot 的双端点与 projected Relation

- 状态：Proposed（公开 adapter 与 docs 受 ADR-04 capability gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-06](./06-regression.md)

## 背景与目标

Ranged Dot 比较同一类别的起点与终点。它不需要把每行 reshape 成两行，也不需要新的 range 几何：Plot 已能用两个 Point 投影同一 row 的不同字段，并用 Relation 的 projected source / target 连接两端。

## 决策：每行生成 start、end 两个 Point 与一条 projected Relation

```ts
type RangedDotChartSpec = ChartCommon & {
  type: 'ranged-dot';
  encoding: {
    category: { field: string };
    start: { field: string };
    end: { field: string };
    color?: StrictColorChannel;
  };
  mark?: RangedDotSharedPointPatch;
  components?: {
    start?: RangedDotPointPatch;
    end?: RangedDotPointPatch;
    range?: RangedDotRelationPatch;
  };
};
```

alpha.1 固定 horizontal 配方：category 绑定 y，start / end 绑定 x。recipe 生成 start Point、end Point 与连接两者的 projected Relation；Relation 在视觉层级上位于端点之后声明、之前绘制。两个端点、连接关系、同一 row 投影和核心层级共同构成不可撤销 type identity。

顶层 `mark` 同时调整两个 Point，endpoint component 再做局部覆盖；range component 只调整 Relation 的合法样式与 routing，不能改写 source / target、切换 ribbon、增加额外目标、改变核心层级、identity、view 或 encoding。

Shared 与 endpoint Point patch 都精确复用 ADR-04 `ScatterPointPatch`，并进一步排除 `layer`。字段级优先级固定为 recipe encoding / color < shared `mark` < `components.start` 或 `components.end`；后层只覆盖它实际 authored 的 leaf，未写 sibling 保留。

`RangedDotRelationPatch` 是 strict object，只允许：

- Relation primitive style，但排除 `zIndex`
- `path.routing` 与 `path.label`
- `path.options` 中的 `dashPattern`、`fillRule`、`lineCap`、`lineJoin`、`roundedCorners`、`marks`
- Relation 顶层 geometry `label`

这些字段复用 Plot Relation 的公开 value contract。`kind`、`ribbon`、`source`、`target`、`id`、`layer`、`coordinateView`、`transform`、`encoding`、`path.via`、`path.route`、额外 projected target、`rotate` 与 `scale` 明确不属于 patch。Relation 的 recipe color 先成立，再由 range style 覆盖合法绘制字段。

## 行为、失败语义与兼容性

- category / start / end 是严格 field-only roles，不接受无消费语义的 binding-level scale
- start 与 end 不自动排序；start > end 时仍按 authored 角色连接
- start === end 时保留两个重合 Point 与零长度 Relation，不由 Chart 删除
- color 通过 Plot 正式 encoding 同时作用于两个 Point 与 Relation；Point / Relation local style 按各自 owner 规则覆盖
- 缺省位置 scale 由 Plot 联合三个 marks 的 projected fields 推断
- coordinate / composition 必须提供二维 role；三个 marks 与 axes 始终属于同一 active/default view
- 当前 Plot facet lowering 不保持所需 semantic mark layer，因此含 facet arrangement 的 composition fail-loud，而不是产生错误层级
- 核心 marks、顺序、projected endpoints、Relation 层级、共同 view 或保留 identity 被破坏时 fail-loud

## 功能与包边界

- Chart 拥有 Ranged Dot 的数据角色、三 Mark 配方、patch precedence 与核心层级
- Plot 拥有 Point / Relation、projected target、scale inference、coordinate projection、routing、lowering 与 locator / provenance
- Chart 不 reshape dataset、不复制 Relation 几何，也不为 Relation 伪造 Point anchor identity

## 架构验证

- Canonical Type 判定：同一 row 的两个端点与 range relation 是稳定复合语义
- 内部表达：完全组合 Plot Point + Relation projected target，无新 transform 或 geometry
- 外部扩展：可追加 Reference / label 等正式 Plot marks，但不能替换三个核心 members
- trace：两个 Point 对同一 row 保持相同 row lineage；Relation 保持 mark-level lineage，不承诺不存在的 per-row datum locator

## 被否决方案

- reshape 成两行 Scatter：会复制数据、改变 lineage 并丢失同一 row 的端点关系
- 新建 range Mark：现有 Relation projected target 已能完整表达
- Chart 私调 lowered children 修复 facet 层级：会越过 Plot composition / lowering owner

## 测试策略摘要

需要 schema、三 Mark recipe、shared / endpoint / range patch precedence、projected target、coordinate / composition、层级 gate、degenerate range、inspection / trace 与三入口 parity 证据。关键不变量是两个端点与 Relation 始终存在、投影同一 row、层级稳定且 presentation 不改变 Point lineage。

## 不在本 ADR 范围

- dumbbell / lollipop 的独立 type 判定
- 多于两个端点
- 自动计算或清洗 start / end
- direction pattern 的公共 API；alpha.1 只冻结 horizontal 默认
