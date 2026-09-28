import { translateInspectApiReference } from './inspect.en';
import { translateLayoutApiReference } from './layout.en';

/** 布局组件公开说明的受审阅英文翻译 */
const translations: Readonly<Record<string, string>> = {
  交给可选编译驱动解释的不透明声明数据: 'Opaque authoring data interpreted by an optional compilation driver',
  '由 FlexLayout 静态读取的直属布局子项': 'Direct layout item read statically by FlexLayout',
  '由 GridLayout 静态读取的直属布局子项': 'Direct layout item read statically by GridLayout',
  '由 OverlayLayout 静态读取的直属布局子项': 'Direct layout item read statically by OverlayLayout',
  '容器与子项输入，保留传入对象引用': 'Container and item input; the input object reference is retained',
  '交给编译驱动的不透明声明数据；省略时不附加声明':
    'Opaque data for the compilation driver; omitted input adds no authoring data',
  '由布局适配器消费的 InputEmbed，不在创建时求解布局':
    'An InputEmbed consumed by the layout adapter; creation does not solve the layout',
  '直属布局 child 的作者侧输入': 'Authoring input for a direct layout child',
  '三种 Layout 容器的 InputEmbed adapter catalog': 'InputEmbed adapter catalog for the three layout containers',
  '容器与子项配置；静态默认值由 Schema 解析时应用':
    'Container and item configuration; Schema parsing applies static defaults',
  '带 layout 命名空间与容器类型的 Source IR，不修改 input':
    'Source IR with the layout namespace and container type; input is not mutated',
  '创建单轴尺寸策略时允许的 schema 输入': 'Schema input for an axis sizing policy',
  创建双轴尺寸策略时允许省略默认轴的输入: 'Two-axis sizing input allowing default axes to be omitted',
  物理轴上的项目对齐方式: 'Item alignment along a physical axis',
  单轴容器尺寸策略: 'Container sizing policy for one axis',
  剩余空间分布方式: 'Remaining-space distribution mode',
  布局项目所属的容器种类: 'Container kind owning a layout item',
  容器视觉溢出策略: 'Container visual overflow policy',
  '是否检查当前布局实例，或覆盖本实例的检查选项':
    'Whether to inspect the current layout occurrence, or override its inspection options',
  '默认注册三种 Layout 布局检查器的可选布局宿主':
    'Optional inspection host registering all three layout inspectors by default',
  'Layout 检查宿主的属性': 'Props for the layout inspection host',
  '除三种 Layout 布局检查器外合并的自定义检查 registry':
    'Custom inspector registry merged with the three layout inspectors',
  'Layout 检查编译驱动的创建选项': 'Options for creating the layout inspection compilation driver',
  创建阻止当前图形或作用域内全部检查器的边界标记:
    'Create a barrier disabling all inspectors in the current drawing or scope',
  '创建默认包含三种 Layout 布局检查器的 Vanilla 编译驱动':
    'Create a Vanilla compilation driver including the three layout inspectors by default',
  '当前实例的检查请求，省略时为 true；false 关闭当前实例的请求':
    'Inspection request for this occurrence; defaults to true, while false disables its request',
  'FlexLayout 主轴方向取值': 'FlexLayout main-axis direction values',
  '创建 FlexLayout 时允许省略固定 discriminator 与 可选字段的输入':
    'FlexLayout input allowing fixed discriminators and optional fields to be omitted',
  '创建 FlexLayout item 时允许省略默认字段的输入': 'FlexLayout item input allowing defaulted fields to be omitted',
  'FlexLayout 换行策略取值': 'FlexLayout wrapping policy values',
  'FlexLayout 主轴剩余空间分布取值': 'FlexLayout main-axis remaining-space distribution values',
  '持久化的 Layout FlexLayout composite': 'Persistent FlexLayout composite input',
  '持久化的 FlexLayout item': 'Persistent FlexLayout item input',
  'FlexLayout 的主轴方向': 'FlexLayout main-axis direction',
  'FlexLayout 的换行策略': 'FlexLayout wrapping policy',
  'GridLayout 自动放置流向取值': 'GridLayout automatic placement direction values',
  'GridLayout fully explicit overlap 策略取值': 'GridLayout fully explicit overlap policy values',
  'Grid 单轴 placement 的作者输入': 'Authoring input for placement along one grid axis',
  'Grid track breadth 的作者输入': 'Authoring input for a grid track breadth',
  'Grid track 的作者输入': 'Authoring input for a grid track',
  'GridLayout 的 resolved track artifact': 'Resolved GridLayout track artifact',
  'GridLayout 轨道产物来源取值': 'GridLayout track artifact source values',
  'GridLayout 单轴最多解析的显式与隐式 track 数':
    'Maximum combined number of explicit and implicit tracks along one grid axis',
  'GridLayout 自动放置的流向': 'GridLayout automatic placement direction',
  'GridLayout 显式区域重叠策略': 'GridLayout explicit-area overlap policy',
  'GridLayout 布局产物中轨道的定义尺寸来源': 'Authored sizing source for a track in GridLayout artifacts',
  'Overlay 结构尺寸参与策略值': 'Overlay intrinsic-size participation policy values',
  'Overlay placement 的作者输入': 'Authoring input for Overlay placement',
  'Overlay placement 判别值': 'Overlay placement discriminator values',
  'Overlay item 是否参与 container intrinsic size': 'Whether an Overlay item contributes to intrinsic container size',
  'Overlay item 的 placement 模式': 'Overlay item placement mode',
  'Layout Flex 布局的 React 声明组件': 'React declaration component for FlexLayout',
  'Flex 布局的 React 属性': 'React props for FlexLayout',
  '必须由 Flex 类型布局项目组成的子元素': 'Direct children must be flex layout items',
  'FlexLayout 直属 item 的 React authoring props': 'React authoring props for a direct FlexLayout item',
  '创建FlexLayout 嵌入项': 'Create a FlexLayout embed',
  'Vanilla FlexLayout authoring 输入': 'Vanilla authoring input for FlexLayout',
  'Vanilla FlexLayout item 输入': 'Vanilla input for a FlexLayout item',
  'Layout Flex 布局的 InputEmbed adapter': 'InputEmbed adapter for FlexLayout',
  '创建保留省略字段与简写的 FlexLayout 持久化输入':
    'Create persistent FlexLayout input preserving omitted fields and shorthand',
  'FlexLayout 的 JSON-safe compile artifact payload': 'JSON-safe compilation artifact payload for FlexLayout',
  'Layout FlexLayout 的官方 Core layout-aware composite definition':
    'Official layout-aware composite definition for FlexLayout',
  'FlexLayout 的 Core Composite dependency provider': 'Composite dependency provider for FlexLayout',
  '为当前 Flex 布局实例声明检查请求': 'Declare an inspection request for the current FlexLayout occurrence',
  '带检查能力的 Flex 布局属性': 'Props for FlexLayout with inspection support',
  '创建带当前实例检查请求的FlexLayout 嵌入项':
    'Create a FlexLayout embed with an inspection request for this occurrence',
  'Flex 布局检查器的预设选项': 'Preset options for the FlexLayout inspector',
  '从最终 Flex 布局产物生成辅助内容的检查器定义':
    'Inspector definition generating guides from the final FlexLayout artifact',
  'Flex 布局检查器的稳定注册键': 'Stable registration key for the FlexLayout inspector',
  '把 Flex 布局产物转换为普通 Core 辅助子元素': 'Convert a FlexLayout artifact into ordinary Core guide children',
  'FlexLayout factory 接受的作者输入': 'Authoring input accepted by the FlexLayout factory',
  'FlexLayout item 的作者输入': 'Authoring input for a FlexLayout item',
  'FlexLayout 的 canonical JSON IR': 'Persistent JSON input for FlexLayout',
  'FlexLayout item 的 canonical JSON IR': 'Persistent JSON input for a FlexLayout item',
  'Layout Grid 布局的 React 声明组件': 'React declaration component for GridLayout',
  'Grid 布局的 React 属性': 'React props for GridLayout',
  '必须由 Grid 类型布局项目组成的子元素': 'Direct children must be grid layout items',
  'GridLayout 直属 item 的 React authoring props': 'React authoring props for a direct GridLayout item',
  '创建GridLayout 嵌入项': 'Create a GridLayout embed',
  'Vanilla GridLayout authoring 输入': 'Vanilla authoring input for GridLayout',
  'Vanilla GridLayout item 输入': 'Vanilla input for a GridLayout item',
  'Layout Grid 布局的 InputEmbed adapter': 'InputEmbed adapter for GridLayout',
  '创建保留省略字段与简写的 GridLayout 持久化输入':
    'Create persistent GridLayout input preserving omitted fields and shorthand',
  'GridLayout 的 JSON-safe compile artifact payload': 'JSON-safe compilation artifact payload for GridLayout',
  'Layout GridLayout 的官方 Core layout-aware composite definition':
    'Official layout-aware composite definition for GridLayout',
  'GridLayout 的 Core Composite dependency provider': 'Composite dependency provider for GridLayout',
  '为当前 Grid 布局实例声明检查请求': 'Declare an inspection request for the current GridLayout occurrence',
  '带检查能力的 Grid 布局属性': 'Props for GridLayout with inspection support',
  '创建带当前实例检查请求的GridLayout 嵌入项':
    'Create a GridLayout embed with an inspection request for this occurrence',
  'Grid 布局检查器的预设选项': 'Preset options for the GridLayout inspector',
  '从最终 Grid 布局产物生成辅助内容的检查器定义':
    'Inspector definition generating guides from the final GridLayout artifact',
  'Grid 布局检查器的稳定注册键': 'Stable registration key for the GridLayout inspector',
  '把 Grid 布局产物转换为普通 Core 辅助子元素': 'Convert a GridLayout artifact into ordinary Core guide children',
  'GridLayout factory 接受的作者输入': 'Authoring input accepted by the GridLayout factory',
  'GridLayout item 的作者输入': 'Authoring input for a GridLayout item',
  'GridLayout 的 canonical JSON IR': 'Persistent JSON input for GridLayout',
  'GridLayout item 的 canonical JSON IR': 'Persistent JSON input for a GridLayout item',
  'Layout Overlay 布局的 React 声明组件': 'React declaration component for OverlayLayout',
  'Overlay 布局的 React 属性': 'React props for OverlayLayout',
  '必须由 Overlay 类型布局项目组成的子元素': 'Direct children must be overlay layout items',
  'OverlayLayout 直属 item 的 React authoring props': 'React authoring props for a direct OverlayLayout item',
  '创建OverlayLayout 嵌入项': 'Create a OverlayLayout embed',
  'Vanilla OverlayLayout authoring 输入': 'Vanilla authoring input for OverlayLayout',
  'Vanilla OverlayLayout item 输入': 'Vanilla input for a OverlayLayout item',
  'Layout Overlay 布局的 InputEmbed adapter': 'InputEmbed adapter for OverlayLayout',
  '创建保留省略字段与简写的 OverlayLayout 持久化输入':
    'Create persistent OverlayLayout input preserving omitted fields and shorthand',
  'OverlayLayout 的 JSON-safe compile artifact payload': 'JSON-safe compilation artifact payload for OverlayLayout',
  'Layout OverlayLayout 的官方 Core layout-aware composite definition':
    'Official layout-aware composite definition for OverlayLayout',
  'OverlayLayout 的 Core Composite dependency provider': 'Composite dependency provider for OverlayLayout',
  '为当前 Overlay 布局实例声明检查请求': 'Declare an inspection request for the current OverlayLayout occurrence',
  '带检查能力的 Overlay 布局属性': 'Props for OverlayLayout with inspection support',
  '创建带当前实例检查请求的OverlayLayout 嵌入项':
    'Create a OverlayLayout embed with an inspection request for this occurrence',
  'Overlay 布局检查器的预设选项': 'Preset options for the OverlayLayout inspector',
  '从最终 Overlay 布局产物生成辅助内容的检查器定义':
    'Inspector definition generating guides from the final OverlayLayout artifact',
  'Overlay 布局检查器的稳定注册键': 'Stable registration key for the OverlayLayout inspector',
  '把 Overlay 布局产物转换为普通 Core 辅助子元素': 'Convert a OverlayLayout artifact into ordinary Core guide children',
  'OverlayLayout factory 接受的作者输入': 'Authoring input accepted by the OverlayLayout factory',
  'OverlayLayout item 的作者输入': 'Authoring input for a OverlayLayout item',
  'OverlayLayout 的 canonical JSON IR': 'Persistent JSON input for OverlayLayout',
  'OverlayLayout item 的 canonical JSON IR': 'Persistent JSON input for a OverlayLayout item',
  '提供恰好一个可绘制 JSX 子元素；不能同时传 ir': 'Provide exactly one drawable JSX child; cannot be combined with ir',
  'JSX 分支不接受 IR 输入': 'The JSX branch does not accept IR input',
  'IR 分支不接受 JSX 子元素': 'The IR branch does not accept JSX children',
  '已声明的可序列化子图形；不能同时传 children': 'A serializable child drawing; cannot be combined with children',
  选择匹配的直属布局容器: 'Select the matching direct layout container',
  '容器内稳定身份；省略时内部按位置生成，不读取 React key':
    'Stable identity within the container; omission generates a positional internal key, independently of React key',
  '必须由 Flex 类型布局项目组成的子元素；省略时容器为空':
    'Direct children must be flex layout items; omission creates an empty container',
  '必须由 Grid 类型布局项目组成的子元素；省略时容器为空':
    'Direct children must be grid layout items; omission creates an empty container',
  '必须由 Overlay 类型布局项目组成的子元素；省略时容器为空':
    'Direct children must be overlay layout items; omission creates an empty container',
  '作者声明的直属子项，省略时按空列表处理': 'Authored direct items; omission is treated as an empty list',
  同次编译已求解的布局产物: 'Solved layout artifact from the same compilation',
  包含已解析检查选项与主题外观的检查上下文: 'Inspection context containing resolved options and themed appearance',
  '只读辅助子图形列表，不重新求解或修改布局产物':
    'Read-only guide children; does not solve again or mutate the layout artifact',
  '可选驱动配置；省略时只注册内置布局检查器':
    'Optional driver configuration; omission registers only the built-in layout inspectors',
  '传给 Vanilla render 或 mount 入口的检查编译驱动': 'Inspection compilation driver passed to Vanilla render or mount',
  '交给 Vanilla authored site 的不透明屏障标记': 'Opaque barrier marker attached to a Vanilla authored site',
};

/** 复用宿主与检查器词典，未收录说明仍阻止生成 */
export const translateLayoutComponentApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  if (translations[source]) return translations[source];
  try {
    return translateInspectApiReference(source);
  } catch {
    return translateLayoutApiReference(source);
  }
};
