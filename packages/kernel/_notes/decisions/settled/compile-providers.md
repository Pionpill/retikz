---
description: '自定义能力应能替换写死在编译器里的分支，而不能靠注册顺序偶然抢占同名能力。'
keywords: 'CoreProviderDefinition、能力注册与查找、compile、Provider、registry、contract、ReadonlyMap、key、ShapeDefinition.name、node.shape、ArrowDefinition.name、arrowDetail.shape'
---

# 能力注册与查找

## 设计目的

自定义能力应能替换写死在编译器里的分支，而不能靠注册顺序偶然抢占同名能力。统一身份与冲突规则，才能让内置与第三方定义有可预测的解析结果。

## 决策

`CoreProviderDefinition` 描述 Core 接受的能力定义；各类能力仍以自己的定义解释参数与行为。

内置与自定义定义通过同一 registry 解析；注册时检查 key 冲突，显式引用未知能力时报告错误，不按注册顺序静默覆盖。

字符串引用使用定义声明的 name 作为唯一注册身份，引用与注册端必须使用相同的 key，不从实现类名或参数内容派生第二种身份。

provider 以 Definition 集合注入，让内置与自定义项遵守同一注册、冲突和查找规则。集合描述有哪些能力，不应用后写覆盖掩盖重名。

adapter 只接入底层 Definition，不再为同一 provider 发明框架专用的注册语义。内置和自定义实现使用同一能力入口。

## 历史记录

- Kernel v0.4：统一注册集合、身份、冲突规则与适配器接线（ADR-022、ADR-023、ADR-024、ADR-025）。
