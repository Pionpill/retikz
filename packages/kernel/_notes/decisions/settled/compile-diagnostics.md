---
description: '图元未绘制、位置无法解析和输入非法，对调用者意味着不同的补救措施。'
keywords: 'CompileWarning、RetikzCoreError、编译诊断与失败边界、compile、CompileOptions、onWarn、silent、fail、warning、console.warn、CompileOptions.onWarn、CompileWarning.code'
---

# 编译诊断与失败边界

## 设计目的

图元未绘制、位置无法解析和输入非法，对调用者意味着不同的补救措施。这里区分哪些情况可以带诊断继续、哪些必须终止，并让问题能追溯到输入位置。

## 决策

`CompileWarning` 是可收集的编译警告；`RetikzCoreError` 表示不能继续求值的 Core 错误。

引用未解析、锚点不存在或路径不足以绘制时，调用者应能获知问题及其输入位置。诊断不是 renderer 输出；程序化消费不应依赖解析控制台文案。

自动布局不把非有限坐标纳入范围计算，并报告诊断。默认文字测量在字号为零时返回零尺寸；负数或非数值不是零字号。空路径不应生成可见线段。

## 历史记录

- Kernel v0.1：区分不可解析的引用与不可绘制的输入（ADR-015、ADR-016）。
