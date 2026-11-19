---
description: 'Core 的可观察输出是结构化命令和变换，不是序列化后的 SVG'
keywords: 'core、helper、renderer、mirror、buildPathD、buildTransform、PathCommand、quad'
---

# ADR-018：core 测试 helper 去除 renderer mirror 漂移风险

- 状态：Accepted
- 决策日期：2026-05-13
- 参见：[kernel v0.1/004](004-scene-primitive-structured.md)

## 决策

Core 的可观察输出是结构化命令和变换，不是序列化后的 SVG。Core 直接核对命令及顺序，后端负责核对字符串输出；否则测试会复制一份 renderer，并在两个实现同时出错时仍给出通过结果。
