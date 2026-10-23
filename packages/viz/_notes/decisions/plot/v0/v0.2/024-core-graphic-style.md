---
description: Plot 样式复用 Core 图形原子，补齐描边能力、上下文颜色及透明度简写，并保持字段编码与固定属性分离
keywords: 样式、graphic、描边、opacity、上下文颜色、通道
---

# ADR-024：统一 Core 图形样式消费

- 状态：Accepted
- 决策日期：2026-10-23
- 关联：[020](./020-mark-encoding-properties.md)、[022](./022-label-encoding.md)
- 修订：[068](../v0.1/068-channel-core-coverage.md) 的宿主描边能力范围

## 背景与目标

Core 已提供独立的颜色、填充、描边、透明度、效果和文本布局契约。Plot 重复包装这些值域容易遗漏新字段，并使同一图形样式在不同宿主之间不一致。

## 决策

固定样式复用 Core 的值域和语义片段，Plot 只拥有数据编码、属性覆盖与几何构造语义。Point、Interval、Path 及关系几何共享适用的描边字段。基础 Mark 的 dashOffset 支持有限正负数；Point/Interval 的 lineCap、lineJoin 与 Core Node 对齐，并支持对应字段编码。未设置时继续继承既有默认，不人为物化新的缺省值。

固定 fill、stroke 支持 Core PaintValue，即 CSS 颜色、归一化上下文颜色权重或结构化 Paint。文字颜色复用 ContextualColor；数值表示相对最终有效主色的权重，不能当作数据尺度输入。字段颜色仍经 Plot 颜色比例尺解析。

固定 opacity 支持数值或 { overall?, fill?, stroke? }，数值等价于 overall。字段编码保持独立因子对象，只覆盖同名因子；未编码因子仍保留固定配置及继承。最终透明度遵循 Core 的因子乘积语义。

样式、布局、变换与装饰按职责组合，不改变 encodings/properties 的外部组织方式，不将所有 Core 字段无约束开放给所有 Mark。无独立语义的样式 schema 别名删除，消费者直接使用权威原子，不保留兼容导出。

Guide 复用适用的 Core 文本与描边片段，保留 drawOpacity 等领域语义。Table 内容默认样式复用 Core 级联样式字段，保持稀疏配置与 null 清除低优先级默认的语义；边框虚线仍要求正数，不因复用改变值域。

## 行为与接入

JSON、Vanilla、React 表达同一契约。非法固定值在外部 schema 入口失败；字段读取与尺度校验继续由 Plot 通道完成。通道覆盖固定值、默认色分配、几何拓扑与数据实例数量保持原语义。Core 拥有最终绘图与渲染行为，Viz 不建立平行样式模型。
