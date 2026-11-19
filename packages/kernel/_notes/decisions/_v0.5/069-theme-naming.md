---
description: 统一主题名称选择与跨包主题定义命名，区分主题引用和实例样式配置
keywords: Theme、name、Definition、主题、命名
---

# ADR-069：统一主题名称与定义命名

- 状态：Accepted
- 决策日期：2026-10-23
- 关联：[024](./024-lightweight-theme-resolution.md) · [037](./037-theme-source-fragments.md)

## 背景与目标

主题选择器使用 style 字符串，而实例 style 表示具体视觉配置对象。同一词在跨包公开契约中承担不同角色，增加理解和接入成本。

## 决策

Theme 使用 `{ name?: string, mode?: ThemeMode }`。name 是非空开放主题名称，引用实际消费 owner 注册的同名定义；mode 保持既有 light/dark 契约。主题名称类型统一为 ThemeName。有效主题也使用 name，实例及默认片段内的 style 对象保持原义。

运行时定义统一为 ThemeDefinition 和各 owner 的 XxxThemeDefinition，工厂使用 defineTheme / defineXxxTheme，集合入口使用 themeDefinitions / xxxThemeDefinitions。registry、Provider、诊断与文档采用相同词汇。Chart 已有的 ChartThemeDefinition 保持领域独立性，不与 Core 定义混同。

本决策替代既有 ADR 中 Theme selector 的 style 字段及 ThemeStyle 系列命名，其他主题职责、继承与默认值决策继续有效。

## 行为与兼容性

name 与 mode 按字段独立继承。匿名默认环境、mode 基准颜色、领域默认与实例覆盖顺序不变；名称缺失时不引入隐式命名主题。同名定义仍由实际消费 owner 独立提供，重复注册、未注册主题与无效定义仍明确失败。

React、Vanilla、直接 JSON 与 Composite 传递同一名称契约。此为公开命名 breaking change：旧字段及旧导出删除，不保留别名、双读或迁移层。可持久化 IR 仍只保存选择器，运行时定义不会进入 IR。
