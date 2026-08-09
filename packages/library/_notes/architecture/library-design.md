# Library 能力库设计

> **状态：长期分组边界已确认并落地。** Library 由 Standard 与 Layout 两条相互独立的能力轴组成；排版布局由 Layout package family 唯一拥有，Standard 只通过公开 capability 消费。
>
> 关联：[`packages/library/AGENTS.md`](../../AGENTS.md) · [`Standard 拓展库设计`](./standard-library-design.md) · [`Layout 布局库设计`](./layout-library-design.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md)

---

## 定位

Library 是 Retikz 在 Kernel 之上的官方可选能力库分组。它不替代 Core 的 IR、definition / registry、compile、Scene 或 renderer，而是通过这些公开机制提供可独立安装、被直接作者和多个领域包复用的能力。

Library 不以“所有通用代码”作为收纳标准。进入本组的能力必须移除 Plot、Table、Notation、Graph、Flow、Workspace 等领域词汇后仍成立，拥有明确输入输出与扩展闭环，并且不会迫使 Core 反向依赖可选包。

## 两条能力轴

### Standard · 拓展

Standard 横向增加绘图词汇和简单组合能力，例如官方 Arrow / Shape Definition、常用绘图 composite 与 Sugar。每项能力相对其它 Standard 能力保持可选，通过 Core 的同一 Definition、registry 与 lowering 主链接入。

Standard 不拥有排版 solver、Layout artifact 或 Layout Inspector。Standard composite 需要排版时，以普通消费方身份组合 Layout 的公开能力。

### Layout · 布局

Layout 纵向提供领域无关的容器排版模型、约束求解、placement、overflow / clip、artifact、inspection 与跨宿主 authoring。Flex、Grid、Overlay 等布局共享同一 Core proposal / probe / replay 底座，但拥有独立于 Standard 的发布与演进节奏。

Layout 不拥有 Tree、Layered、Force、UML 自动排布、GraphModel、rank、port constraint、edge routing 或碰撞避让。这些能力依赖关系图与领域约束，属于算法布局及其领域 owner。

## 依赖方向

```text
Core / Math / Foundation
          ▲
          │
        Layout
          ▲
          ├───────────────┐
          │               │
       Standard       Notation / Plot / Table / 其它领域包
          ▲
          └───────────────领域包按需直接消费
```

- Layout 不依赖 Standard 或领域包
- Standard 可以消费 Layout，但 Layout 不反向消费 Standard
- 领域包分别声明实际使用的 Layout 与 Standard 依赖，不通过任一非 owner barrel 转手导出
- React / Vanilla adapter 只消费对应宿主无关包与 Kernel adapter，不复制 schema、solver、lowering 或 artifact

## 公共能力与扩展

Library 的官方内置能力必须与第三方实现复用同一 Core 扩展主链；不得建立 Library 私有全局注册、平行 Scene、renderer 分支或 import 副作用。含持久化语义的 Tier 2 输入保持 JSON-safe，直接 IR、React 与 Vanilla 对同一语义生成等价的 canonical 输入。

Standard 与 Layout 可以共享 Core / Math / Foundation 的原子契约，但不得以跨包复用为由复制 owner 的 schema 或内部算法。确需跨包组合时，由 owner 提供最小、稳定、可诊断的公共 capability。

## 文档与发布

文档站以 Library 为顶级模块，依次展示 `Standard · 拓展` 与 `Layout · 布局`。两组各自维护介绍、组件 / 能力、参考和更新日志。

Standard 与 Layout 使用独立 release group 和版本节奏。跨组依赖通过正常 package dependency 表达，不建立 lockstep；breaking owner 迁移必须由新 owner ADR 接管现行契约，旧 owner ADR 原地保留为 Superseded 历史。

## 非目标

- 把所有 Core 扩展实现集中到单个聚合包
- 让 Standard 或 Layout 成为 Core、renderer 或 adapter 的默认依赖
- 在 Library 中保存数据、图表、表格、图关系或编辑器状态
- 建立万能 Layout registry、算法布局总包或 renderer 回读测量旁路
- 通过兼容 re-export、双 namespace 或复制实现维持两个能力 owner
