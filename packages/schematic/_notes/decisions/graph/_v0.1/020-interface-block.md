---
description: Graph 接口实体节点，覆盖接口内容组织与 Block 组合；不承担代码执行
keywords: 'InterfaceBlock、interface、接口、Block'
---

# ADR-020：InterfaceBlock

- 状态：Proposed
- 决策日期：2026-09-08
- 关联：[roadmap](./roadmap.md) · [Tier 3 与共享内容](./019-code-block-contract.md)

## 背景与目标

接口表达属性与方法契约，方法内的逻辑表达行为约定。实体独立描述代码事实，并组合共享内容生成 Header 与内容区；逻辑说明不执行。

## 决策

InterfaceBlock 是 namespace `graph` 下的独立 composite，使用 `type: 'interfaceBlock'`，拥有独立 schema、Definition 和 provider，复用 ADR-019 的共享数据、主题配置、完整 Block lower-facing surface 与三入口规则。

实体固定下沉为一个 Block。Header 始终存在，左侧默认 icon 为文字 I，右侧默认 trail 为 interface；name 为标题，description 为可选说明。默认标记由实体生成 `{ type: 'node', text: 'I' }` 等无 id 的 Core Node child，不把字符串直接交给 icon/trail，也不把生成 child 写回实体 Source。默认 icon 使用 accentColor，默认 trail 使用 mutedTextColor，其余复用 Core 文字默认，三入口产生同样的结果。标记是语言无关的说明符号，不依赖外部字体图标资源。显式 icon/trail child 或 null 遵循共享契约。

接口根包含必需 name，以及可选 description、properties、methods。properties 是有序属性契约数组，methods 是有序可调用契约数组。继承关系由外部 Relation 表达，不保存第二份 extends 列表，不自动生成边。

默认内容顺序为 Header → Properties → Methods。空数组与缺省都不产生对应内容区；只有名称的接口仍是合法实体。属性显示名称、可选标记、只读标记与类型，说明存在时在同一属性区域追加次要行。缺省类型省略右侧类型文字，不猜测 any/unknown。

方法先显示名称与签名，有 logic 时在该方法区域内追加逻辑段；不把方法逻辑提升成整个接口的执行流程。只有 methods 非空时才生成 Methods 区，方法的 description 来自 signature.description，不再维护同义字段。

## 基础数据结构与公开契约

| 实体字段                   | 契约                                      |
| -------------------------- | ----------------------------------------- |
| namespace/type             | graph / interfaceBlock                    |
| name                       | 必需非空字符串                            |
| description                | 可选说明                                  |
| properties                 | 可选有序属性契约数组                      |
| methods                    | 可选有序可调用契约数组                    |
| signature/logic            | 根不允许；签名与逻辑属于 methods 中的成员 |
| icon/trail                 | 复用共享契约                              |
| Block lower-facing surface | 完整复用，排除 discriminator 与 children  |

签名参数按数组顺序显示为 `name?: typeText`，optional 为 false 时省略问号，typeText 缺省时省略冒号和类型。省略 parameters 显示 `(…)`，显式空数组显示 `()`；有返回类型时显示 `→ returnType`，缺省不推断 void。参数 description 与 signature.description 作为签名区域内的次要说明，存在时按参数顺序显示。

属性 readonly 为 true 时在名称前显示 readonly，optional 为 true 时追加问号；它们是说明标记，不执行访问控制。

方法逻辑中的 text 显示普通说明，steps 按作者顺序逐项显示并添加从 1 开始的展示序号；序号不是 id，不参与关系寻址。

默认区标题为固定英文 Properties、Methods，不读取宿主 locale。`labels` 为严格对象，只允许 properties/methods，均为可选非空字符串，用于显式本地化，不进入 graphDefaults 或主题。方法 logic.title 缺省时不生成单独的逻辑标题。

```json
{
  "namespace": "graph",
  "type": "interfaceBlock",
  "id": "repository",
  "name": "Repository",
  "properties": [{ "id": "repositoryName", "name": "name", "typeText": "string", "readonly": true }],
  "methods": [
    {
      "id": "findMethod",
      "name": "find",
      "signature": { "parameters": [{ "name": "id", "typeText": "string" }], "returnType": "Record" },
      "logic": { "body": { "kind": "text", "text": "按标识查找记录" } }
    }
  ]
}
```

内部呈现由实体固定组合，使用 ADR-019 的 codeBlockTokens 统一控制视觉角色，不接受实例 presentation。方法名称与签名使用 codeFontFamily，说明和类型注释使用 mutedTextColor，逻辑正文使用 textColor；不提供逐成员或逐逻辑段样式覆盖。

`@retikz/graph-react` 暴露 `InterfaceBlock` 及对应 Props，`@retikz/graph-vanilla` 暴露 `interfaceBlock` 及对应 Input。两入口使用相同实体字段与 JSON-safe icon/trail；本轮不额外开放 JSX children 或 React-only slot，以保持确定的实体内容模型。通过既有 Input embed adapter 与 Core provider 注入接入 Layout；不创建实体 Block 专用渲染宿主或编辑器。

## 行为、失败语义与兼容性

属性 id 指向整个属性呈现区域，方法 id 指向包含签名与逻辑的整个方法区域，logic.id 指向逻辑内容区域。没有 identity 的展示区不生成公开 id。成员名称和方法重载不决定寻址；重排有显式 id 的成员不改变关系目标。

继承 Block 的 localNamespace 及整体尺寸、placement、transform、clip 和根边界。根 id 只发布一次；内部内容不因视觉分区增加隐藏 namespace。跨实体连线使用现有 Relation，缺失引用或重复显式 id 由 Core 诊断。

Source schema 拒绝错实体字段、空名称、非法逻辑判别和空步骤数组；签名不校验 TypeScript 语法、不推断重载兼容性。JSON schema 校验与 typed authoring 的 TypeScript 约束保持同一契约，不为纯 JavaScript 调用添加平行校验层。

主题缺失、冲突和 callback 失败沿 ADR-019 的错误边界，尺寸、引用和布局失败保留下层 cause。该实体是新增能力，不改变 Graph Block 用法，不引入兼容别名或新旧双轨。
