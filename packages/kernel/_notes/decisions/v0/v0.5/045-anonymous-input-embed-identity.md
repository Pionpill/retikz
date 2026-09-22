---
description: InputEmbed 缺省 identity 的稳定归一化；保留 Source identity 的显式语义边界
keywords: 'Vanilla、InputEmbed、identity、anonymous、normalize、React'
---

# ADR-045：InputEmbed 的匿名运行时身份

- 状态：Accepted
- 决策日期：2026-09-22
- 关联：[Vanilla Authoring](./029-vanilla-authoring-normalization.md) · [Runtime identity](./011-runtime-identity-owner-registry.md)

## 背景与目标

`InputEmbed` 需要身份以支持同次归一化、嵌套 adapter 和 retained 更新，但领域 Source 的 `id` 表达可持久化、可引用的语义身份。要求作者为两者重复提供相同字符串，会把运行时实现细节暴露为领域 API；反过来，为匿名图元生成 Source id 又会把只需绘制的内容发布到 Core namespace。

目标是让缺省的 `InputEmbed` 身份由 Vanilla 在归一化中稳定确定，同时不改变任何 Source IR、NodeTarget 或 renderer 语义。

## 决策

`InputEmbed.id` 变为可选的 authoring 字段。作者显式提供时，该值仍是 embed 的稳定运行时身份；缺省时，`normalizeScene` 按当前 InputScene 的声明路径与 embed kind 确定一个仅本次 authoring / runtime 链路可见的匿名身份。该身份不得随机生成，也不得写入 Source、Canonical、Scene、artifact 或 Core namespace。

领域 adapter 可以将领域 Source 的显式 `id` 作为 `InputEmbed.id`，从而让一个用户声明同时满足领域引用与 retained 更新定位。没有领域 `id` 的内容仍可作为匿名 embed 正常下沉和绘制；它不因此获得可引用 NodeTarget。

React JSX 的显式 `id` 与匿名收集规则与此相同：JSX / Vanilla 的相同领域 authoring 仍产生同一 Source IR，匿名运行时身份不属于其对等比较对象。

## 基础数据结构与公开契约

```ts
type InputEmbed<TProps> = Readonly<{
  type: 'embed';
  kind: string;
  id?: string;
  props: TProps;
}>;
```

`InputEmbedContext.id` 始终为可用的稳定 runtime identity。其匿名值是 Vanilla 内部结果，不承诺字符串格式，也不构成持久化 API。

## 行为、失败语义与兼容性

- 默认行为：缺省 embed id 不影响 adapter 下沉的领域 Source；显式 Source id 仍仅在领域 adapter 原样传递时发布到 Core namespace
- 失败与诊断：显式重复 identity 继续按既有 InputScene identity 规则诊断；不同匿名 embed 按其声明路径区分，不因为缺少领域 id 产生冲突
- 兼容性 / breaking：`InputEmbed.id` 改为可选；依赖其必填性的领域 Vanilla builder 必须迁移到单一领域输入，不保留旧双 id 调用形式
- React / Vanilla 等价性：两入口共享显式领域 id 的 Source 结果；匿名 runtime identity 不进入 Source 也不参与 Core 编译语义
