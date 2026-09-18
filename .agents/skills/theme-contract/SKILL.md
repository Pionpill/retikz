---
name: theme-contract
description: Use when designing, implementing, reviewing, or documenting Retikz themes, categorical palettes, Light/Dark modes, or Neutral, Academic, Clean, and Vibrant styles.
---

# 主题规范

主题改变视觉默认，不改变数据、几何、交互或编码语义。先确认视觉语义的 owner，再读取该包当前 definition、preset、测试与主题文档。

## 所有权与覆盖

- Core 拥有 Theme 继承、registry、开放 style selector 和内置 Neutral；docs 通过公开 definition 维护 Academic、Clean、Vibrant 参考风格。
- 领域包只实现本包角色与默认值，不复制其他 owner 的 palette/preset，不增加主题特判或跨 owner registry。
- adapter 只传递 selector 和 definitions；显式输入保持原值、顺序、数量与优先级，不按主题重新调色。
- semantic colors 表达成功、警告、错误，不与 categorical 混用。
- Light/Dark 保持相同信息层级和数据语义，不机械反色。
- 改公开 Theme、IR、schema、registry 或跨包边界时，停止局部调色，转根 AGENTS 的架构流程。

## 按需加载

| 当前任务                       | 必读 reference                     |
| ------------------------------ | ---------------------------------- |
| 分类 palette、Hue 顺序、覆盖   | [色板契约](references/palette.md)  |
| 默认、均衡、低意见化视觉       | [Neutral](references/neutral.md)   |
| 论文、技术报告、灰度与精确阅读 | [Academic](references/academic.md) |
| 扁平、克制、编辑式视觉         | [Clean](references/clean.md)       |
| 屏幕展示、鲜明层级             | [Vibrant](references/vibrant.md)   |

只加载涉及的风格；跨风格对比才读取多份。reference 的外部设计来源只用于提炼原则，不复制源码、精确配置、资源或色值。

## 验证

以相同内容对比修改前后，在真实宿主尺寸检查 Light/Dark、默认与显式覆盖、继承与局部覆盖、常用透明度。风格差异不能牺牲内容辨识；palette 不能只测大色块。运行受影响 owner 的类型与定向测试，报告未做的视觉检查。
