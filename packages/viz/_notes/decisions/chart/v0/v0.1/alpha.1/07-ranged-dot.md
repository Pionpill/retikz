# ADR-07：Ranged Dot 的双端点与 projected Relation

- 状态：Proposed（公开 adapter 与 docs 受 ADR-04 capability gate 阻塞；可执行 lowering 另受 range-row atomicity gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-06](./06-regression.md)

## 背景与目标

Ranged Dot 比较同一类别的起点与终点。不 reshape dataset，也不需要新的 range 几何：Plot 可以用两个 Point 投影同一 row 的不同字段，并用 Relation 的 projected source / target 连接两端。

## 核心决策与基础数据结构

```ts
type RangedDotChartIR = ChartCommon & {
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

alpha.1 固定 horizontal 配方：category 绑定 y，start / end 绑定 x。recipe 生成 start Point、end Point 与连接两者的 projected Relation；Relation 位于端点之后声明、之前绘制。两个端点、连接关系、同一 row 投影和核心层级共同构成不可撤销 type identity。

顶层 `mark` 同时调整两个 Point，endpoint component 再局部覆盖；range component 只调整 Relation 的合法样式与 routing，不能改写 source / target、切换 ribbon、增加目标、改变核心层级、identity、view 或 encoding。Shared / endpoint Point patch 复用 ADR-04 `ScatterPointPatch` 并排除 `layer`；字段优先级为 recipe < shared `mark` < endpoint patch。Relation patch 只允许 Relation primitive style（排除 `zIndex`）、`path.routing`、`path.label`、`path.options` 的 dash / fill / line / marks 字段与 Relation 顶层 label，排除 kind、ribbon、source、target、id、layer、view、transform、encoding、path.via、path.route、额外 target、rotate、scale 与未知字段。

## 行为、失败语义与兼容性

- category / start / end 是严格 field-only roles；start 与 end 不自动排序，start > end 仍按 authored 角色连接
- start === end 保留两个重合 Point 与零长度 Relation
- 非空输入中，每行三类角色必须同时存在且可投影；任一缺失、null 或不可投影时整张 Chart 在 mark lowering 前 fail-loud，不留下孤立端点或省略 Relation
- 完全空 rows 是合法空结果，三个核心 member 不产生 datum geometry，也不报 range-row 错误
- color 通过 Plot encoding 同时作用于两个 Point 与 Relation；位置 scale 由 Plot 联合 projected fields 推断
- 三个 marks、axes 与共同 view 必须满足二维 role contract；无法保持 semantic mark composition 时 fail-loud
- 核心 marks、顺序、projected endpoints、Relation 层级、共同 view 或保留 identity 被破坏时 fail-loud

## 功能与包边界

Chart 拥有数据角色、三 Mark 配方、patch precedence 与核心层级；Plot 拥有 Point / Relation、projected target、scale inference、coordinate projection、routing、lowering 与 locator / provenance。Chart 不 reshape 数据、不复制 Relation 几何，也不伪造 Point anchor identity。

## 当前实现结果与遗留风险

本 ADR 已冻结同一 row 的双端点与 projected Relation 语义，状态仍为 Proposed。共享 row 的复合 Mark 必须在各 Mark 跳过不可投影值之前执行原子行校验，复用 Plot 的 field resolution、data model、coordinate projection 与诊断，并覆盖内置与兼容自定义 coordinate；Chart 不预扫描或清洗 rows。

长期风险是若复合 Mark 继续分别交付非法端点，Ranged Dot 会产生孤立 geometry 或错误 lineage；原子性必须保持在 Plot 的正式 lowering 主链，而不是 Chart 私有 filter 或 Relation 修补。
