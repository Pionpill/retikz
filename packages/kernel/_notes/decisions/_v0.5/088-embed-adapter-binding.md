---
description: 作者节点直接绑定领域 adapter，数据准备与主题解析分离，场景入口不再注册 adapter
keywords: InputEmbed、InputScene、adapter、异步准备、Chart、主题
---

# ADR-088：作者嵌入节点绑定领域 adapter

- 状态：Accepted
- 关联：[roadmap](./roadmap.md) · [029](./029-vanilla-authoring-normalization.md) · [047](./047-async-authoring-preparation.md)

领域工厂在构造节点时就知道如何处理其 props。作者输入直接关联这个实现；普通图元与领域嵌入项均可组合到同一场景，无需在根入口另行注册。内置与第三方采用同一契约。此变更替代 029 与 047 中按 kind 注册及提前传递有效主题的约定。

每个位置调用所绑定 adapter 的同步 lower。kind 用于身份与诊断，不用于在实现之间选择；同一棵树的不同位置可以绑定同 kind 的不同实现。领域容器通过 normalizeChildren 转交子项贡献，运行时输入按实例位置绑定。

数据准备依据数据源、变换及分区声明。Chart 正式编译时消费 Scene 和 Scope 的有效主题。Vanilla 不向作者回调提供已解析主题，也不改变作者声明的 Scene 或 Scope 主题。主题定义和 provider 的解析仍由各自的 owner 负责。

自定义节点通过 `embed({ adapter, props })` 构造，TypeScript 在此处校验配对；直接手写或展开后重新组合的对象不能充当已绑定节点。

adapter 引用仅存在于作者输入，不能写入可持久化 Source IR。宿主不能使用注册数组替换既有节点的实现；要使用不同实现，构造对应的作者节点。归一化入口只接收场景，不保留旧的 options 参数。
