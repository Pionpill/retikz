# ADR-02：Ribbon 边界、对齐与采样语义

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-25
- 关联：[ADR-01](./01-ribbon.md) · [ADR-07](./07-path-kind-registry.md)

## 背景

Variable-width ribbon 需要稳定的中心线、边界、宽度采样、端点方向和对齐语义，否则同一份 IR 会在不同 renderer 或上层包中生成不同轮廓

## 决策

Ribbon 支持从中心线和宽度 profile 派生边界，也支持直接给出上下边界；端点、对齐和采样属于 Core 的 path-like 几何语义，Sankey layout、流量分配、排序和 crossing minimization 不属于 Core

ADR-07 收敛后的 `Path.ribbon` 字段为：

- `mode: "centerline" | "boundary"`：中心线或显式边界模式
- `width`、`start`、`end`、`interpolation`：宽度 profile 与端点参数
- `align: "center" | "left" | "right"`：宽度相对中心线的分布
- `samples` / `sampling`：确定曲线采样密度
- `upper` / `lower`：边界模式的两侧边界

## 兼容性与最终结果

字段由 `Path.ribbon` 的公共契约统一消费，Plot 等领域只负责产生合法的 Core 输入；中心线和边界两种模式均保持，缺省与非法参数的诊断由统一 Path compile 链路处理

## 遗留边界

不在 Core 内实现领域布局或通用路径避障；新增几何模式须扩展 Path kind 契约
