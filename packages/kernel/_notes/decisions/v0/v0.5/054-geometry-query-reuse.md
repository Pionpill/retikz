---
description: Composite 坐标查询读取已有布局结果，复用正常目标解析和重放生命周期，移除隐式子树编译与独立查询缓存。
keywords: 几何查询、resolvePathTargets、LayoutChildResult、Flow、目标解析、事务隔离
---

# ADR-054：布局结果的几何查询

- 状态：Accepted
- 决策日期：2026-10-15
- 接受日期：2026-10-15
- 修订日期：2026-11-16
- 关联：[roadmap](./roadmap.md) · [ADR-053](./053-layout-measurement-reuse.md) · [Flow 路径查询](../../../../../schematic/_notes/decisions/diagram/v0/v0.1/017-flow-smooth-routing.md) · [Flow 端点放置](../../../../../schematic/_notes/decisions/diagram/v0/v0.1/019-flow-endpoint-placement.md) · [绘图完备性](../../../architecture/core-drawing-complete.md)

## 背景与目标

Flow 路线生成需要读取真实节点锚点和有序路径目标。节点几何已经由完整子布局产生，目标查询应读取该结果，不应隐式编译输入子树或维护独立的子树缓存。

完整布局是生成真实几何、诊断和可重放贡献的唯一子项求值路径。坐标查询与输出重放是同一布局结果的不同消费者；尺寸贡献不含真实几何，不能用于坐标查询。

## 决策：布局一次，按需查询已有结果

Composite 通过现有 `layoutChild(child, proposal)` 取得完整布局结果，再以 `resolvePathTargets(result, query)` 查询坐标。一次结果允许多次查询；查询不会重新编译、消费重放凭据或发布试算副作用。需要输出时，仍使用 `replay(result, wrapper)`，保持当前回调内一次放置的限制。

Core 拥有路径目标、锚点、边界和坐标语义；Reconciler 拥有布局执行、结果归属、引用快照和提交生命周期。普通路径与结果查询复用同一目标解析能力，内置与自定义 Shape / Boundary 使用相同注册与求值契约。Flow 只消费公开能力，不持有内部命名空间或重建矩形近似几何。

结果保留生成时的有效主题、引用快照、能力绑定和根局部坐标系。派生主题上下文查询旧结果仍读取原快照；子项、提案或环境变化后，调用方显式重新布局。查询不根据当前环境隐式重算，也不增加缓存 key、容量或失效配置。

目标查询读取被布局 child 根 Scope 的局部命名环境，保留内部遮蔽、真实祖先引用限制和嵌套命名空间边界，不穿透后代私有命名空间。每次查询独立初始化路径游标，按现有 smooth 规则消费相对与累计相对目标。

返回坐标属于布局结果的根局部空间，不包含未来 replay placement。重放环境变化可能沿现有规则重新物化，但不会追溯改变此前返回的坐标。依赖查询坐标生成其它绘图的作者负责保持该绘图与实际输出环境一致。

## 基础数据结构与公开契约

```ts
type PathTargetQuery = Readonly<{
  source: IRTarget;
  points: ReadonlyArray<IRTarget>;
}>;

type PathTargetQueryResult = Readonly<{
  source: Readonly<IRPosition>;
  points: ReadonlyArray<Readonly<IRPosition>>;
}>;

// CompositeCompileContext 成员
resolvePathTargets: (result: LayoutChildResult, query: PathTargetQuery) => PathTargetQueryResult;
```

查询只接受当前 callback 创建的真实布局结果，不公开额外的几何令牌或结果索引。`LayoutChildResult` 不增加可序列化几何字段，普通编译输出仍为 Scene 与领域 artifacts，不恢复通用世界坐标查询或观测出口。

`source` 是初始参考点，相对形式以局部原点为基准；`points` 保持输入数量和顺序。结果为有限局部坐标，不执行路径插值、最终端点裁剪、箭头或标签绘制。调用者修改输入点列或返回数组，不改变已布局的事实或后续查询。

## 行为、失败语义与兼容性

- 几何生成失败由既有 `layoutChild` 的 failed / raise 处理。无效目标抛出包含 source 或 points 下标的查询错误，保留 cause；失败查询不损坏已有结果，之后仍可查询合法目标。
- 伪造结果、其它 callback 或其它 compile 的结果违反归属契约；派生主题共享原 callback owner。查询不放宽重复重放限制。
- 未选中布局的图元、资源、诊断和 artifacts 不进入最终输出；查询不改变最终提交内容。
- 旧的 `query.child` 形式直接删除，不保留兼容入口或隐式布局分支。作者先布局，再显式查询该结果；这是扩展作者 TypeScript API 的 breaking 变更。
- React、Vanilla 和 headless 入口共用相同编译行为，不新增 authoring 字段、IR schema 或 renderer 能力。
- Flow 对相同有效元素投影保留布局结果进行多次查询，布局投影变化时重新布局。最终 Graph、Layout 和 Diagram 装配继续使用正常编译与重放；本决策统一处理链路，不承诺整个图示只编译一次，也不允许跨 callback 传递 replay 来绕过组合边界。
- 本修订替代此前以 child 输入隐式准备几何环境及独立查询 LRU 的决策，保留 ADR-053 的尺寸贡献缓存和现有重放所有权约束。
