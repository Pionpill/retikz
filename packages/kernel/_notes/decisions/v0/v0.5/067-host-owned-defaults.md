---
description: Scope 默认值按 Node 与 Path 宿主组织，补齐标签配置与箭头归属，统一字体继承及宿主级 reset
keywords: Scope、defaults、Node、Path、label、arrow、font、reset
---

# ADR-067：宿主持有的完整默认配置

- 状态：Accepted
- 后续关系：[071](./071-macro-visual-property-resolution.md) 替代本文箭头主色优先级：Path 有效主色同时覆盖 mark 实例主色，具体 paint 仍优先；其余宿主默认值规则保持有效
- 决策日期：2026-10-23
- 主责：Core；React / Vanilla 等价暴露，领域包消费 Core 默认配置契约
- 关联：[v0.5 roadmap](./roadmap.md) · [036](./036-source-ir-semantic-grouping.md) · [037](./037-theme-source-fragments.md) · [066](./066-complete-visual-style.md) · [Core 绘图完备设计](../../../architecture/core-drawing-complete.md)

## 背景与目标

Scope 的 Node / Path 默认值已经覆盖主体样式和布局，但标签只有公共视觉默认，无法统一配置 Node 标签的附着、旋转和引线，以及 Path 标签的沿线位置、倾斜和断线。标签与箭头独立于宿主成为顶层通道，使覆盖关系和重置范围难以对应实际绘图对象。字体在 Scope、实例和文本行之间的覆盖粒度也不一致。

目标是让已有绘图能力具备完整、可解释的默认配置：主体拥有其装饰默认值，实例字段作为配置契约真源，嵌套继承不丢失未覆盖的字体属性。默认配置不承担内容、身份或拓扑生成。

## 决策：默认配置按宿主组织

Scope defaults 只保留 style、node、path、reset。Node 标签默认归入 defaults.node.label，Path 和 Step 标签默认归入 defaults.path.label，箭头默认归入 defaults.path.arrow。删除顶层 label、arrow 通道，不同时提供其它等价入口。

Core 拥有 JSON 契约和继承语义。React、Vanilla 与领域包复用同一契约；renderer 只消费编译结果，不解释默认通道。此设计不新增独立图元、装饰 registry 或并行渲染机制。

理由：

1. 标签和箭头依赖宿主的几何、颜色和绘制规则，默认值归属与实际对象关系一致
2. Node 与 Path 标签有不同的位置和布局语义，各自完整表达，公共字段仍复用相同契约
3. 一个目标只有一个默认入口，宿主重置同时覆盖主体和装饰，避免通道相互残留
4. 默认值仅配置已声明对象，保持内容和结构由实例决定

## 基础数据结构与公开契约

```ts
defaults: {
  style: { stroke: '#666' },
  node: {
    style: { fill: '#fff' },
    layout: { padding: 8 },
    label: {
      font: { size: 12 },
      position: 'top',
      distance: 8,
      pin: true,
    },
  },
  path: {
    style: { strokeWidth: 2 },
    label: { sloped: true, distance: 4 },
    arrow: { shape: 'stealth', scale: 1.2 },
  },
  reset: ['node'],
}
```

### 可默认的配置

| 入口       | 允许字段及语义                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| style      | Node / Path 主体共有的图形样式；不直接把全部图形样式施加到标签、箭头或 Scope 外框                                                                                              |
| node       | shape、boundary、cornerRadius、rotate、scale、完整 style、完整 layout，以及 label 默认片段                                                                                     |
| node.label | NodeLabel 的全部非内容配置：textColor、opacity、font、position、align、placement、distance、rotate、keepUpright、pin；另保留 color 作为该类标签的上下文主色                    |
| path       | 完整 style、cornerRadius、rotate、scale，以及 label、arrow 默认片段                                                                                                            |
| path.label | PathLabel 的全部非内容配置：textColor、opacity、font、position、side、sloped、interrupt、gap、placement、distance；另保留 color 作为该类标签的上下文主色。同样应用于 Step 标签 |
| path.arrow | 完整箭头细节配置，包括形状、尺寸、颜色、paint、透明度、描边及 start/end 覆盖。start/end 分别应用于位置 0/1 的箭头，其余位置使用公共箭头配置                                    |
| reset      | 省略、false、true，或只含 node/path 的通道数组；空数组不重置                                                                                                                   |

默认片段与实例复用相同字段值域和领域不变量。style/layout 为字段命名空间，不是整体替换单元。默认片段保持稀疏；省略字段不提前物化为内置默认。

默认配置不包含 type、id、aliasIds、meta、animations、zIndex、Node 实例 position、text、Path kind/kindOptions、children 或 marks 等实例事实。标签的 position 属于宿主上的附着策略，可作为标签默认；它与 Node 的实例位置不同。

默认 label 是一个配置片段，不接受文本或标签数组。宿主已有多个标签时，分别应用同一默认；没有标签时不创建标签。path.arrow 不决定是否存在箭头及其位置。node.label.pin 可以为已有标签启用引线，但不会创建标签。

### 继承、覆盖与颜色

每个 Scope 先执行宿主通道屏障，再应用当前层共享 style 和当前层宿主配置；较内层的声明覆盖祖先累计值，同层宿主 style 覆盖共享 style。标签和箭头分别沿所属宿主通道继承，实例对应字段最终覆盖配置，随后补齐静态默认和宿主回退。

- font 在 Node、Label 的 Scope 默认与实例之间均逐字段继承；family、size、weight、style 独立覆盖。空 font 不清除已有字段。文本行和片段继续遵守各自字体继承与相对字号规则
- opacity 保持主体整体、填充、描边因子的独立覆盖语义；标签和箭头仍为各自标量透明度，保留与宿主透明度的既有乘积规则
- 箭头公共配置与 start/end 分支按字段继承，实例箭头配置覆盖有效公共及对应端点配置
- paint、shape 参数、boundary、shadow、spacing、scale、数组和判别联合保持明确的复合叶子替换，不采用通用递归合并；pin 的布尔值整体覆盖，两个对象形式的 pin 按描边字段及 opacity 继承
- 省略与合法 undefined 不覆盖祖先；0、false 和合法空值是显式值，不能按真假值忽略。已 parse 物化的字段按显式值处理，不恢复省略意图

本决策迁移装饰默认值的归属，不顺带改变既有颜色派生规则。两类标签各自的 color 是标签上下文主色，textColor 优先使用标签实例声明、对应标签默认，再回退有效标签/宿主主色。数值颜色权重在有效上下文确定后求值。Node 标签缺省字体仍可回退到宿主字体。

箭头保持既有主色规则：有效 Path 主色优先于继承箭头 color，并使继承的端点 color 跟随宿主；实例箭头显式颜色优先。显式 stroke/fill 与 color 保持原有关系。该规则不适用于任意字段，不能将宿主主色优先推广到全部默认属性。

### 宿主重置

reset: ['node'] 切断祖先 Node 主体、布局、几何和 Node 标签（包括 pin）的累计默认；reset: ['path'] 切断祖先 Path 主体、几何、Path/Step 标签和箭头默认。true 同时切断两者。

祖先共享 style 已参与对应宿主累计值，因此也随该通道切断；当前 Scope 自己的共享 style 与宿主配置仍然生效。默认通道重置不改变 Theme 环境、Scope 变换或实例内容。Scope 外框仍独立配置，其既有共享主色来源不因宿主 reset 清空。不提供单独标签或箭头 reset 通道。

## 行为、失败语义与兼容性

- 默认行为：未声明 defaults 或装饰默认时保留内置行为；空片段不清空继承，默认配置不创建标签、箭头或内容
- 失败与诊断：未知字段、旧顶层 label/arrow、旧 reset 标签/箭头通道以及非法值由输入契约拒绝；缺少文本的真实标签仍非法，默认片段则不要求也不允许 text
- 跨字段失败：合并后才产生的不变量由消费目标诊断。例如默认 pin:true 与实例 placement:'inside' 组合应失败，实例可用 pin:false 显式禁用；Path 标签 interrupt 等能力继续按实际宿主支持范围校验，不静默忽略
- JSON 与扩展：默认配置完全 JSON 可序列化；内置和注册的形状、箭头共享同一默认值和解析机制，不用 provider 名称白名单收窄现有能力
- 兼容性 / breaking：删除旧顶层 label/arrow 默认和对应 reset 值，迁移到宿主配置；Node 字体由整体覆盖改为逐字段继承。不得保留旧名别名、双轨或自动迁移解释
- 设计关系：本决策获接受后替代 ADR-036 / ADR-037 中 Core 四通道 defaults/reset 和 Node font 整体覆盖的规定，其余 Source 分组、领域 ownership、Theme 和复合叶子规则继续有效；ADR-066 的绘制能力保持
- React / Vanilla 等价性：两者表达与 Direct IR 相同的宿主默认结构和行为，领域包复用同一 Core 契约；不得在 adapter 或领域 lowering 中恢复旧通道
- 编译结果：完整编译与增量更新遵循同一默认语义。宿主默认改变应使实际依赖的主体和装饰更新；不要求本决策提供更细的性能优化或新的 Scene 字段
