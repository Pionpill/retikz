# @retikz/inspect 包工作指南

本包拥有 Inspector Definition、registry、结果选择、辅助编译、diagnostics、plane 与内置 Path / Group / Clip 检查。输入是普通 `CompileResult`，输出是独立编译的辅助 Scene 与放置变换；React / Vanilla 子入口管理独立辅助呈现生命周期。Core、Reconciler 与基础 adapter 不感知 Inspect。

不拥有主图编译、几何求解、主图排版、renderer 语义或领域产物的空间映射。只能消费公开编译结果；缺少事实时缩减能力或报告 `UnsupportedGeometry`，不得要求基础包增加检查专用字段。

根入口依赖 Core、Foundation、Math 与 Zod；可选宿主位于 React / Vanilla 子入口，使用普通 Render 只读层，不增加 Inspect 专用 renderer 入口。

请求属于运行时消费配置，不进入主图 IR 或 Scene。primitive 只遍历 Scene 图元树；artifact 仅使用领域公开事实，不从 occurrence 推导空间。内置与第三方共用 Definition、registry 和编译链。传给扩展的嵌套数据必须隔离；辅助输出移除公共 identity、meta 与 animation，保留内部资源引用。

辅助更新先撤下旧层，检查或呈现失败不改变主图提交。卸载释放辅助资源；宿主自身的版本或任务令牌防止过期呈现覆盖新结果。
