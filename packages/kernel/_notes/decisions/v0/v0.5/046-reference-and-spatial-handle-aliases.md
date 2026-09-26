---
description: 允许同一 Node 命名目标和同一 qualified spatial handle 以多个名称查询，不重复创建几何或空间记录
keywords: Node、aliasIds、命名引用、SpatialHandle、id、key、别名、identity
---

# ADR-046：命名目标与空间句柄别名

- 状态：Accepted
- 决策日期：2026-09-23
- 关联：[roadmap](./roadmap.md) · [ADR-028](./028-qualified-spatial-handles.md) · [Standard ADR-034](../../../../../library/_notes/decisions/standard/v0/v0.1/034-list-cell-identities.md)

## 背景与目标

一个绘图区域可能同时具有作者给定的稳定名称和由容器位置推导的名称。当前 Node 只有一个 `id`，qualified spatial handle 只有一个 `id`。为同一区域分别建立多个不可见节点或多条空间记录，会重复表达几何，使别名之间可能在布局、变换、replay 或 inspection 中产生差异。

Core 需要让多个名称指向同一个命名目标，并让多个 owner-local id 查询到同一条空间记录。命名引用和 spatial handle 仍是独立契约：别名不会把 handle 自动变成路径 target，也不会从命名节点反推 handle。

## 决策：两种查询分别支持同一目标的别名

Node 的主 `id` 可带非空、唯一的 `aliasIds`。Core 对主 id 和所有别名登记同一个已结算的 Node 布局；锚点、边界、变换与延迟引用结果完全一致，不增加 Node、Scene primitive 或测量。别名沿 Node 所在的命名 frame 注册，遵守现有 `localNamespace`、遮蔽、跨元素重复名称诊断和查找顺序。Scope 和 Coordinate 不因本决策新增别名字段。

Spatial handle declaration 的主 `id` 可带非空字符串且唯一的 `aliasIds`。Core 每个 declaration 仍只发布一条 qualified handle；`selectSpatialHandles` 与 `resolveSpatialHandle` 的 `selector.id` 精确匹配主 id 或任一别名，返回同一条结果，而不是别名副本。qualified 结果保留主 id 与别名集合；ownerPath、role、geometry、payload、occurrence 和最终世界坐标只有一份。别名不改变查询结果顺序或 `entries` 数量。

理由：

1. Node 命名引用和 qualified spatial handle 的登记、作用域与查询均由 Core 拥有，上层包不能通过私有索引或 renderer 复制这两种机制
2. 两个名称共享同一目标与同一空间记录，才能保证路径引用、inspection 和最终变换后的几何一致
3. 别名是封闭的数据字段，不需要 Definition、registry 或 renderer 扩展点

## 基础公开契约

```ts
type IRNode = {
  id?: string;
  aliasIds?: Array<string>;
  // 其余 Node 字段不变
};

type SpatialHandleDeclaration = {
  id: string;
  aliasIds?: ReadonlyArray<string>;
  role: string;
  bounds: Readonly<BoundsRect>;
  // 其余 declaration 字段不变
};

type QualifiedSpatialHandle = {
  id: string;
  aliasIds?: ReadonlyArray<string>;
  // 其余 qualified 字段不变
};
```

`aliasIds` 只有在 Node 有主 `id` 时可用。Node 内别名不得等于主 id，也不得重复；handle 的别名不得等于主 id，也不得重复。主 id 与别名共同占用当前 composite occurrence 的 owner-local id 空间，不允许一个名称指向两条 handle。普通 Node 不带别名、普通 declaration 不带别名时，输出保持原有形态。

## 行为、失败语义与兼容性

- 命名：主 id 与别名参与相同的 Node target、锚点、路径延迟引用、定位及命名空间规则；跨不同元素的同 frame 碰撞继续沿 Core 既有重复名称 warning 与 last-wins 规则，不为别名添加隐式优先级
- 空间查询：主 id 或别名 id 选中同一个 frozen qualified entry；多 owner 匹配时仍按现有 ambiguity 规则失败，别名不推断 owner
- Source 错误：缺少主 id 却提供 `aliasIds`、空白或重复的 Node 别名，在 Node schema 边界失败；空字符串、重复或与其它 handle 主 id / 别名冲突的空间 id 在 declaration 边界或发布时失败。空间 id 的校验不收紧现有契约：长度大于零的纯空白字符串仍合法
- 输出：别名不产生额外 Scene primitive、Node 几何、spatial entry、renderer 状态或独立 revision；与 Scene 同 revision 的空间索引继续沿现有原子提交规则
- 兼容性：空间 declaration、selector 与 qualified 结果的 `key` 直接改为 `id`，不保留旧名或兼容读取；`aliasIds` 是统一的查询别名字段。不带别名时不增加该输出字段。`key` 留给 runtime 区分、集合匹配与 diff，`name` 留给定义或领域符号名称；Map 键值、provider 注册键及非图形域实例身份不机械改名
- React / Vanilla：二者透传同一 JSON-safe Node Source，并消费相同 Core compile 结果；不在 adapter 中维护别名表或改写查询结果
