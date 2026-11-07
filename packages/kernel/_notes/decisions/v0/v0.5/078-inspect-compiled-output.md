---
description: Inspect 独立消费 Scene 与 Composite 产物，通过普通编译生成辅助层，明确选择、坐标与失败隔离边界
keywords: Inspect、CompileResult、Scene、CompositeArtifact、InspectorDefinition、只读图层
---

# ADR-078：Inspect 消费普通编译结果

- 状态：Accepted
- 决策日期：2026-10-29
- 接受日期：2026-10-29
- 关联：[roadmap](./roadmap.md) · [077](./077-compile-output-contract.md) · [021](./021-extensible-inspector-content.md) · [039](./039-builtin-inspection.md) · [绘图完备性](../../../architecture/core-drawing-complete.md)

## 背景与目标

[077](./077-compile-output-contract.md) 将普通编译输出收敛为 Scene 与 Composite artifacts。Inspect 需要据此重新定义可观察对象，生成与当前结果对应的辅助绘图。检查工具的安装、注册、选择、开关及失败都不能改变主图编译与提交。

Scene 保留渲染图元、分组变换及资源，不保留完整作者语义；Composite artifact 保留领域结果，但不保证存在到 Scene 的空间映射。Inspect 的能力以这些真实信息为上限，不要求 Core 恢复观测出口，也不从渲染结果猜测原始 Node、Scope 或布局求解过程。

## 决策：结果驱动的独立辅助绘图

`@retikz/inspect` 接收已经成功产出的普通 `CompileResult`。直接消费 Scene 时，以空 artifacts 组装同一输入。Inspect 拥有检查器定义、注册、选择、选项、诊断及辅助编译；Core 与 Reconciler 不知道 Inspect 的存在，基础 adapter 与 Render 不反向依赖它。

数据流为：普通编译结果 → 检查器生成普通 Core IR → 独立普通编译 → 辅助 Scene 与放置变换 → 宿主只读叠加。第二次编译仅处理辅助 IR，不重新执行主图输入，不将主图 Scene 转回作者 IR。辅助结果中的 artifacts 不递归进入检查。

辅助编译使用显式提供的普通编译配置；缺省遵循普通 Core 默认值。它不捕获主图的主题、引用、provider 会话、文字排版或其他编译上下文。使用自定义绘图能力的检查器必须声明所需的普通编译依赖，由调用方提供；主图对象不能作为辅助图的跨图引用目标。

## 基础数据结构与公开契约

### 对象与选择

检查对象分为 Scene 图元与 Composite artifact，两者均来自当前输入快照，不建立平行的 owner 输出模型。

```ts
type InspectionTarget =
  Readonly<{ kind: 'primitive'; path: ReadonlyArray<number> }> | Readonly<{ kind: 'artifact'; index: number }>;

type InspectorSubject =
  | Readonly<{ kind: 'primitive'; type: ScenePrimitive['type'] }>
  | Readonly<{ kind: 'artifact'; namespace: string; type: string }>;

type InspectionRequest = Readonly<{
  inspector: Readonly<{ namespace: string; type: string }>;
  target?: InspectionTarget;
  options?: JsonObject;
}>;

type InspectorFragment = Readonly<{
  coordinateSpace: 'local' | 'scene';
  child: IRChild;
}>;
```

`path` 从 `scene.primitives` 开始，后续索引仅进入 group.children；不进入 marker、pattern 等资源模板。`index` 指向当前结果的 artifacts 数组。两者仅在当前快照内有效，不承诺跨 revision 的身份稳定性。artifact 自带的 occurrence 可供领域检查器辨识来源，但不用于推导 Scene path、祖先关系或空间变换。

每条 request 明确一个 Inspector key。省略 target 时检查所有符合该 Definition subject 的对象；显式 target 必须存在且类型匹配。空 request 数组不绘制任何内容，注册不等于启用。删除 authored self、sourcePath 子树规则、继承覆盖、barrier 与元素 wrapper 接线，不保留同义兼容层。

请求按数组顺序处理；批量图元按 Scene 树深度优先、父先于子的顺序，artifact 按输入数组顺序。相同 Inspector 对同一目标被多条请求选中时拒绝，不隐式合并选项或重复绘制。不同 Inspector 可以消费同一对象。

### 统一扩展契约

`defineInspector` 与 registry 同时服务内置和第三方检查器。Definition 包含 key、subject、选项契约和 `inspect` 回调；同 key 重复注册失败。primitive subject 将回调对象收窄为对应 Scene 图元，artifact subject 保留 namespace、type 与领域值的类型关联，不增加 Core 注册要求。

回调接收只读对象及上下文：当前 target、只读 CompileResult、解析后的 options、辅助 appearance、诊断回调；primitive 另有从局部坐标到主 Scene 的仿射变换，artifact 没有隐式变换。没有 owner、原始输入、编译轮次、provenance 祖先链或片段编译回调。

选项省略等价于空对象；Definition 未声明选项时仅允许空对象。显式选项在请求入口完成解析与默认应用，合法但无匹配对象的批量请求也必须通过选项检查。不再存在选项继承与 mergeOptionsInput。已类型化的编译结果和回调输出不重复做 schema 结构校验。

回调返回 fragment 数组，空数组表示无辅助几何。Inspect 对传给扩展的快照做变异隔离，不冻结或修改调用方的原对象；只读约束同样覆盖嵌套对象。输出独立编译、隔离资源，并移除辅助 Scene 的公共身份、meta 与动画，不移除内部资源引用。

### 坐标与可观察能力

primitive 的 local 坐标指该图元的几何坐标系；group 使用其 children 所在坐标系。Inspect 沿实际 Scene group 链组合变换，local 辅助 Scene 在只读层上应用该变换；scene 片段已经使用主 Scene 坐标，应用单位矩阵。图元自身的旋转等几何属性由对应检查器按公开图元语义处理，不重复加入 group 变换。允许负缩放、非均匀缩放与有限奇异变换，不要求逆矩阵。

artifact 检查器只能返回 scene 片段，且必须从领域契约与已有结果确定位置。缺少可靠坐标映射时返回空输出并报告 `UnsupportedGeometry`；不能把局部坐标当世界坐标，不能通过 occurrence、id 或 meta 猜测关系。Layout 产物仍可供其正常消费者使用，但仅有局部布局盒不足以承诺嵌套 Layout 的主图叠加。不得为恢复该能力新增通用 transform、空间索引或仅供 Inspect 使用的领域字段。

内置能力收敛为实际渲染结构：

| Inspector key   | 对象                      | 内容及显式启用后的默认值                                                                         |
| --------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `inspect/path`  | Scene path                | `controlPoints: true`、`vertices: false`、`labels: false`；显示最终二次/三次曲线控制柄及可选端点 |
| `inspect/group` | Scene group               | `origin: true`、`axes: false`、`labels: false`；显示实际 group 局部坐标系                        |
| `inspect/clip`  | 带 clipRef 的 Scene group | `outline: true`；读取其实际引用的 clip 路径，显示完整边缘                                        |

path 命令索引只是该 Scene path 的命令索引，不冒充作者 step；断线、lowering 后的片段各自检查，不恢复逻辑路径。圆弧不伪装成贝塞尔控制点，圆弧构造轴与中心辅助线不在内置能力中提供。group 不冒充作者 Scope 或 Composite，不承诺逻辑层级与布局包络。clip 显示资源在当前 group 的使用位置，不求裁剪交集，辅助层本身不继承主图裁剪。

删除旧 Node outline/boundary/box/content/baselines/keyPoints、Coordinate 点位、Scope 包络及原始 Path 构造语义的内置检查。可见 Node 外框继续是普通图形，不能据此外推不可见连接边界或正文布局。marker、pattern 实例、文字 glyph、动画采样及渲染像素范围不属于本次对象遍历契约。

appearance 使用辅助编译显式环境的公共色板，不恢复每个原始对象的主题。按确定的请求与目标顺序分配颜色；辅助线宽、点半径和文字尺寸使用 user units，不承诺屏幕像素恒定。颜色和尺寸不影响主图默认值。

### 输出与宿主

辅助编译输出 `InspectionPlane | null` 与独立 diagnostics；plane 条目包含辅助 Scene、放置 transform、Inspector key 和 target。空输出的 plane 为 null。输入 CompileResult 不复制进输出，不在 Inspect 建立主图结果或 revision 的第二真源。

纯计算入口同步执行；React 与 Vanilla 的可选入口复用同一结果消费与辅助编译链，React 仅适配生命周期。入口消费普通编译结果或已提交结果通知，不替换主图 compile driver，不注册 observer，不收集作者位置。

宿主按主图视口、相机与尺寸显示辅助内容，主图独自决定 fit、布局、资源、命中与交互。Inspect 使用独立的辅助呈现生命周期，不能把辅助 Scene 加入主图 Reconciler 提交的必需事务。现有普通只读层契约可用于辅助呈现，但其整帧原子性不能用于阻塞主图提交；组合导出可以显式将已成功生成的辅助层交给普通 renderer。

主图结果变化后，先撤下旧辅助层，再针对新快照计算与显示；同一快照上的检查选项更新也先撤下旧层。主图更新不等待检查成功。宿主使用自身已有的结果版本或任务令牌防止迟到呈现覆盖新结果；Inspect 不给 CompileResult 新增 revision。关闭或卸载检查时释放辅助资源和订阅。SSR 使用相同纯计算链，检查失败时仍可返回主图及独立诊断。

## 行为、失败语义与兼容性

- 注册、选项、目标不匹配、回调或辅助编译失败，使本次检查失败，不交付半份 plane。检查错误由 `RetikzInspectError` 表达，保留原始 cause；宿主捕获并报告独立诊断，显示主图且撤下旧辅助层，不回滚主图。
- `UnsupportedGeometry` 是明确的非致命缺口；保留同次其他受支持输出。普通辅助编译警告进入独立 diagnostics，不伪装成主图编译警告。
- 辅助呈现失败只清理辅助呈现；不改变 Core / Reconciler / Render 原有主图错误及事务语义。诊断通知回调抛错不能破坏已经提交的主图。
- 主图 Scene、artifacts、资源、输入对象和命中结果在检查前后保持不变。Inspect 不保证隔离任意第三方回调在进程外或全局变量中的副作用。
- 这是 0.x breaking 变更。旧 observed compile 驱动、authoring wrapper、选择规则、owner context 与旧内置 key 直接删除；不能把旧 Node/Scope API 改为含义不同的 Scene 图元检查而继续沿用名称。
- 本决策接受后替代 [021](./021-extensible-inspector-content.md) 与 [039](./039-builtin-inspection.md) 中的 Inspect 输入、选择、上下文、内置能力及与主图绑定的失败语义；可选包、统一扩展和普通只读图层的原则继续保留。[077](./077-compile-output-contract.md) 的 Core / Reconciler 边界不变。
