# 博客元数据、引用与翻译

## Frontmatter 与目录

路径为 `contents/blog/<section>/<slug>/index.{zh,en}.mdx`；title、description、date、tags 必填，标题由页面生成 H1。date 是发布日期，修改正文不自动更新；tags 用 1–3 个现有相关标签，不为系列新增未经支持的元数据字段。

系列按真实版本、时间或主题命名，不用无语义的 post-1；是否拆篇由独立主题决定。

## 引用

允许第三方外链。正文就近链接，文末“引用 / References”按首次出现顺序去重汇总，每条说明引用语境；无引用则省略。

只汇总正文实际出现的可点击链接，不凑相关阅读。站内用真实路由，项目文件用完整 GitHub URL；普通文件路径不算引用。站点未支持的脚注编号不要手写。

## 双语

zh 必需，en 可选；缺 en 时站点按现有逻辑回退 zh。提供 en 时保持主线、示例、引用与技术语义一致，保留 API 标识符与领域术语，不混淆 anchor/position、elbow/corner。检查页面元数据、TOC 与语言回退。

## 外站可读性

外站转换由独立 skill 负责；写作时保证 ComponentPreview/Comparison 周围有足够说明。转换时站内路由改真实站点绝对 URL，图从真实浏览器导出；当前写作任务不自动上传或发布。
