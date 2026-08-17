# ADR-01: Compile Structure Convention

- 状态：Accepted
- 决策日期：2026-07-06
- 关联：[alpha.6 ADR-07](../alpha.6/07-path-kind-registry.md) / [alpha.8 ADR-06](../alpha.8/06-builtin-path-generator-ribbon-profile.md)

## 背景

Compile 是 Kernel IR 到 renderer-agnostic Scene 的确定性消费层，长期同时承载 domain、pipeline phase、几何算法和历史聚合逻辑，尤其 Path host、stroke、ribbon、label、mark、arrow 与 output 职责边界不清

## 决策

Compile 采用“全局流水线 + domain 局部实现”。全局层负责 orchestration、namespace、position、scope、transform、style、resource、scene 等跨 domain 能力；Node、Path、Text 等 domain 按相同动词组织

全局阶段顺序固定为：

```text
context -> lower -> traverse/register -> resolve/normalize -> layout/geometry -> emit -> decorate -> resource -> bounds/finalize
```

动词职责固定：`create` 创建上下文或缓存，`resolve` 解析 provider / 默认值并可诊断，`normalize` 做不查表的结构归一化，`lower` 下沉语义，`layout` 计算中间布局，`emit` 生成 Scene primitive，`collect` 收集派生数据，`register` 写入 namespace/resource/cache，`lookup` 只读查表，`compute` 纯计算，`format` 只格式化

Authoring sugar 若可提前消除则归 parser；compile runtime 无关的 helper 归 core shared；跨包纯几何归 math。Domain 可按需使用 `types`、`resolve`、`normalize`、`lower`、`layout`、`geometry`、`emit`、`decorations`、`output` 和 barrel，但 barrel 不承担实现

## 行为、失败语义与兼容性

本 ADR 只规定内部职责和命名，不改变 IR、公开 DSL、Scene primitive、provider 语义、renderer 行为或 warning / error 语义。未来 schema、provider contract 或 public DSL 改变须另立 ADR

## 最终结果与遗留边界

Compile 已按阶段与 domain 收敛，纯几何、authoring sugar 和 orchestration 具有明确 owner。Compile 仍是复杂内部模块；新增能力必须继续遵守上述阶段职责，不把领域逻辑回塞全局层
