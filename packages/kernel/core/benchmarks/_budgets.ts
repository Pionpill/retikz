import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 单次操作的消费预算；次数是规划假设，不代表代码硬上限或实测业务分布 */
type CoreBudgetPolicy = {
  /** P90 警告阈值，单位为毫秒 */
  warningMs: number;
  /** P90 错误阈值，单位为毫秒 */
  errorMs: number;
  /** 消费路径、调用频率和阶段时间分配依据 */
  rationale: string;
};

/** 按稳定场景标识选择预设预算，不读取测量值；新增类别未配置时显式报错 */
export const resolveCoreBudget = (scenario: BenchmarkScenario): BenchmarkBudget | undefined => {
  const identity = scenario.id.slice(scenario.id.lastIndexOf(' > ') + 3);
  const [layer, family, variant, scale] = identity.split('/');
  // 1024 边是支持上限参考，尚未承诺普通节点批量实时更新预算；仅报告，不等同于达标
  if (layer === 'providers' && family === 'shape' && variant === 'polygon' && /"sides":1024(?:,|})/.test(scale)) {
    return undefined;
  }
  let policy: CoreBudgetPolicy;
  if (layer === 'compile' && family === 'resource') {
    const count = Number(scale);
    if (![10, 100, 1000].includes(count)) throw new Error(`Missing Core resource scale budget: ${identity}`);
    policy = {
      warningMs: count === 10 ? 1 : count === 100 ? 4 : 8,
      errorMs: count === 10 ? 4 : count === 100 ? 8 : 16.6,
      rationale:
        '一次工作区或结果组装中的完整注册表生命周期，包含创建及N次登记/导入；假设10次为局部编辑（1/4ms），100次为普通更新（4/8ms），1000次为大批资源处理（8/16.6ms）。该阶段接近一帧即有同步阻塞风险，复杂Pattern不放宽预算；不含输入解析和renderer，不代表整帧保证或稳定回归上限',
    };
  } else if (layer === 'compile' && family === 'scene') {
    const count = Number(scale);
    if (variant === 'layout-auto' || variant === 'layout-explicit') {
      if (count !== 1) throw new Error(`Missing Core scene layout budget: ${identity}`);
      policy = {
        warningMs: 0.01,
        errorMs: 0.05,
        rationale:
          'Reconciler scene/output每次输出消费一次自动边界或显式viewBox转换，固定输入单次操作分配0.01/0.05ms；取整回调在计时内，rounder工厂在环境准备时创建，不通过批量循环放大固定成本，不代表整帧保证',
      };
    } else if (variant === 'marker-auto' || variant === 'marker-fixed') {
      if (![8, 128].includes(count)) throw new Error(`Missing Core scene marker budget: ${identity}`);
      policy = {
        warningMs: count === 8 ? 0.05 : 0.5,
        errorMs: count === 8 ? 0.2 : 2,
        rationale:
          'Core箭头可见边界放置一个已编译marker，递归物化同样用于path marks；假设100个8叶图元普通标记，每次分配0.05/0.2ms，阶段约5/20ms，单个128叶图元复杂标记分配0.5/2ms。固定3层嵌套组，数量不含组节点；包括变换、描边色和透明度物化，不含provider生成、路径采样或renderer，规模为规划假设',
      };
    } else if (variant === 'merge-plain' || variant === 'merge-shadow') {
      if (![16, 1024].includes(count)) throw new Error(`Missing Core scene merge budget: ${identity}`);
      policy = {
        warningMs: count === 16 ? 0.05 : 0.5,
        errorMs: count === 16 ? 0.2 : 2,
        rationale:
          'Reconciler subtree逐项合并布局贡献，每样本一次新点集与已有边界合并；假设100个16点普通贡献各分配0.05/0.2ms，阶段约5/20ms，单个1024点长贡献分配0.5/2ms。输入点数不是合并调用次数，阴影与普通贡献同预算，不包含调用方逐贡献调度或renderer，消费频率为规划假设',
      };
    } else {
      if (
        !['polyline', 'bezier', 'ellipse', 'arrows', 'hidden-arrows', 'clipped-group'].includes(variant) ||
        ![16, 1024].includes(count)
      )
        throw new Error(`Missing Core scene bounds budget: ${identity}`);
      policy = {
        warningMs: count === 16 ? 0.05 : 0.5,
        errorMs: count === 16 ? 0.2 : 2,
        rationale:
          'Reconciler局部几何或Composite探测消费一次完整可见边界汇总；假设100个16命令短路径更新，每次分配0.05/0.2ms，边界阶段约5/20ms；单个1024命令长路径分配0.5/2ms。命令规模包含move，裁剪组额外固定5条clip命令；箭头及裁剪不放宽预算，不含路径生成、布局、renderer或浏览器，不代表已验证业务上限',
      };
    }
  } else if (layer === 'compile' && family === 'text') {
    const count = Number(scale);
    if (variant === 'block-segments-plain' || variant === 'block-segments-mixed') {
      if (![8, 128].includes(count)) throw new Error(`Missing Core text line scale budget: ${identity}`);
      policy = {
        warningMs: count === 8 ? 0.05 : 0.5,
        errorMs: count === 8 ? 0.2 : 2,
        rationale:
          '节点正文与节点/路径标签的单行文本块布局，包含分词与行槽准备；假设一次更新100条短行，每块8片段分配0.05/0.2ms，阶段约5/20ms；128片段作为单个长混排块编辑，分配0.5/2ms。确定性度量与固定公式结果回调计时，Core公式快照计时，真实字体测量和TeX引擎不计时；两类片段使用相同预算，与原私有单行函数的旧计时边界不同',
      };
    } else if (variant === 'block-nowrap') {
      if (![32, 1024].includes(count)) throw new Error(`Missing Core text nowrap scale budget: ${identity}`);
      policy = {
        warningMs: 0.1,
        errorMs: 0.5,
        rationale:
          '单个无自动折行文本块的完整布局，包含Intl.Segmenter准备和行槽计算；32/1024字符均假设20个普通宿主更新，每块分配0.1/0.5ms，阶段约2/10ms。保持相同准备成本目标，不把源码加载结果当作整帧或原生ESM保证',
      };
    } else if (['block-english', 'block-chinese', 'block-longword', 'block-styled', 'block-mixed'].includes(variant)) {
      const mixed = variant === 'block-mixed';
      if (!(mixed ? [8, 64] : [128, 2048]).includes(count)) {
        throw new Error(`Missing Core text block scale budget: ${identity}`);
      }
      const large = count === (mixed ? 64 : 2048);
      policy = {
        warningMs: large ? 2 : 0.2,
        errorMs: large ? 8 : 1,
        rationale:
          '节点正文与节点/路径标签共用单文本块折行；假设20个普通宿主更新，128字符/字素或8混排片段每块分配0.2/1ms，阶段约4/20ms；2048字符/字素或64混排片段作为单个长内容更新，分配2/8ms。字符/字素与片段不是同一输入单位，报告分别标明；按代表性普通/长内容需求分档，不因中文、长词、样式切分或公式复杂度放宽预算',
      };
    } else if (variant === 'emit-plain' || variant === 'emit-mixed') {
      if (![4, 64].includes(count)) throw new Error(`Missing Core text emit scale budget: ${identity}`);
      policy = {
        warningMs: count === 4 ? 0.05 : 0.5,
        errorMs: count === 4 ? 0.2 : 2,
        rationale:
          '单个已布局文本块转换为Scene图元；假设一次更新20个普通四行文本块，每块分配0.05/0.2ms，输出阶段约1/4ms；64物理行作为单个长块输出，分配0.5/2ms。不重新布局、测量或降解；含公式时每行固定2字形路径，预算与普通文字相同',
      };
    } else if (variant === 'token-english' || variant === 'token-chinese') {
      if (![128, 2048].includes(count)) throw new Error(`Missing Core text token scale budget: ${identity}`);
      policy = {
        warningMs: count === 128 ? 0.05 : 0.5,
        errorMs: count === 128 ? 0.2 : 2,
        rationale:
          '节点最小内容宽度消费一次最宽文本单元查询；假设100条普通128字符行，每行分配0.05/0.2ms，阶段约5/20ms；2048字符作为单条长内容查询，分配0.5/2ms。只测分词与确定性度量，不含节点布局或浏览器字体测量',
      };
    } else {
      throw new Error(`Missing Core compile text budget: ${identity}`);
    }
  } else if (layer === 'providers') {
    switch (family) {
      case 'shape':
      case 'boundary':
        policy = {
          warningMs: 0.01,
          errorMs: 0.04,
          rationale:
            'compile/node/layout、anchors、emit 逐节点/连接消费；假设交互更新100个普通形状及约200次连接面查询，单次几何操作10/40μs，给每类100次操作分配约1/4ms。1024边polygon另列支持上限参考，仅报告，不纳入普通形状实时预算',
        };
        break;
      case 'arrow':
      case 'mark':
      case 'clip':
        policy = {
          warningMs: 0.01,
          errorMs: 0.04,
          rationale:
            'compile/path/stroke/marks 与 orchestration/traversal 消费；假设100个装饰或裁剪对象更新，每次生成10/40μs，对应该类工作约1/4ms，给路径几何与渲染留时',
        };
        break;
      case 'pattern':
        policy = {
          warningMs: 0.05,
          errorMs: 0.2,
          rationale:
            'compile 的 paint 资源生成消费一个图案单元；假设一批20种图案资源，各分配50/200μs，阶段约1/4ms。8/32项周期均是同一资源操作，预算不按周期放宽',
        };
        break;
      case 'registry':
        policy =
          variant === 'lookup'
            ? {
                warningMs: 0.002,
                errorMs: 0.01,
                rationale:
                  'resolve/provider 及各能力绑定逐元素查表；假设一次更新1000次查表，查表阶段约2/10ms，单次2/10μs，8/128项表使用相同预算',
              }
            : {
                warningMs: 0.1,
                errorMs: 0.5,
                rationale:
                  'compile/environment 每环境构建约10类 registry，属于准备阶段而非逐节点；每表0.1/0.5ms，对应准备阶段约1/5ms。8自定义项与128项通用表都应满足同一准备操作预算',
              };
        break;
      case 'theme':
        policy = {
          warningMs: 0.05,
          errorMs: 0.2,
          rationale:
            'resolve/theme 经 scene、scope、element context 消费；假设一次更新20处有效主题切换，每次配色50/200μs，阶段约1/4ms。明暗与稀疏覆盖不改变预算',
        };
        break;
      case 'path':
        policy = {
          warningMs: 0.002,
          errorMs: 0.01,
          rationale:
            'compile/element/path 的 stroke provider 委托，仅测固定宿主回调和结果捕获；假设1000条路径，委托阶段约2/10ms，单次2/10μs，不包含真实路径编译',
        };
        break;
      default:
        throw new Error(`Missing Core provider budget: ${identity}`);
    }
  } else if (layer === 'contract') {
    const count = Number(scale);
    switch (family) {
      case 'scene':
        policy = {
          warningMs: count <= 100 ? 1 : 4,
          errorMs: count <= 100 ? 4 : 16.6,
          rationale:
            'Render/Inspect 消费一次完整 Scene 内容遍历；假设一次交互处理100/1000宿主，分配1/4ms目标、4/16.6ms错误线，几何与绘制另计。嵌套8层或每宿主8项Pattern仍沿用同档交互预算；回调只计数，业务回调开销不含在内',
        };
        break;
      case 'provider':
        policy = {
          warningMs: count <= 16 ? 0.5 : count <= 128 ? 2 : 4,
          errorMs: count <= 16 ? 2 : count <= 128 ? 8 : 16.6,
          rationale:
            'Vanilla/Plot在一次环境准备中解析提供者依赖图；假设16/128/512个唯一提供者分别分配0.5/2/4ms目标与2/8/16.6ms错误线，不是逐图元查表。重复贡献固定8份；工厂返回预建定义，领域构建成本不包含',
        };
        break;
      case 'composite':
        policy = variant.startsWith('select-')
          ? {
              warningMs: count <= 100 ? 0.1 : 0.5,
              errorMs: count <= 100 ? 0.5 : 2,
              rationale:
                'Composite一次子树选择；假设一次更新选择10个子树，100/1000项Source每次目标0.1/0.5ms、错误线0.5/2ms，整体约1/5ms目标。绑定扫描属于单次操作，计时不外包循环；深度8作为作者组合参考需求',
            }
          : {
              warningMs: count <= 100 ? 1 : 4,
              errorMs: count <= 100 ? 4 : 16.6,
              rationale:
                'Composite一次Source快照捕获或绑定配对检查；假设一次更新100/1000项Source，分别分配1/4ms目标与4/16.6ms错误线，后续编译另计。捕获含复制冻结，配对检查含结构比较；不包含作者运行时数据准备',
            };
        break;
      default:
        throw new Error(`Missing Core contract budget: ${identity}`);
    }
  } else if (layer === 'resolve') {
    switch (family) {
      case 'coordinate':
        policy = {
          warningMs: 0.005,
          errorMs: 0.02,
          rationale:
            'Reconciler 逐坐标声明确定化；假设1000个坐标更新，解析阶段目标5ms、错误线20ms，单次5/20μs；不含引用查询或几何计算',
        };
        break;
      case 'scope':
        policy = {
          warningMs: 0.05,
          errorMs: 0.2,
          rationale:
            'Reconciler 进入子树前解析单个Scope；假设100个作用域更新，解析阶段目标5ms、错误线20ms，单次50/200μs；包含继承、变换配置和能力绑定，不含子树编译与几何聚合',
        };
        break;
      case 'path': {
        const count = Number(scale);
        policy =
          count <= 16
            ? {
                warningMs: 0.05,
                errorMs: 0.2,
                rationale:
                  'compile/element/path 逐路径解析；假设100条短路径更新，每条16步骤以内分配0.05/0.2ms，解析阶段约5/20ms，几何和渲染另计；绝对/相对/引用/标签/smooth 使用相同目标',
              }
            : count <= 1_000
              ? {
                  warningMs: 1,
                  errorMs: 4,
                  rationale:
                    'compile/element/path；假设交互更新一条1000步骤或点的复杂路径，单次解析1/4ms，为后续几何与绘制保留帧预算；不同输入形态不放宽',
                }
              : {
                  warningMs: 4,
                  errorMs: 16.6,
                  rationale:
                    'compile/element/path；假设一次编辑更新一条10000步骤或点的大路径，解析目标4ms、错误线16.6ms。错误线表示解析已占满一帧，不代表整次更新可在一帧完成；同规模各形态预算一致',
                };
        break;
      }
      case 'node':
        policy = {
          warningMs: 0.05,
          errorMs: 0.2,
          rationale:
            'compile/node/compile、synthetic 逐节点解析；假设100个节点编辑更新，解析阶段约5/20ms，单节点50/200μs。含16标签的节点仍保持同一交互目标，不含字体测量和布局',
        };
        break;
      case 'text': {
        const count = Number(identity.split('/').at(-1));
        const large = variant === 'plain' ? count > 1_024 : count > 128;
        policy = large
          ? {
              warningMs: 0.5,
              errorMs: 2,
              rationale:
                'compile/node/content/layout、node/label/layout、path/host/label 共用行解析；假设单个长行编辑（16384字符或2048混排片段），给分段及字体确定化0.5/2ms，字体测量和TeX排版另计',
            }
          : {
              warningMs: 0.05,
              errorMs: 0.2,
              rationale:
                'compile 的节点正文与标签逐行消费；假设100行可见内容更新，单行分段与字体解析50/200μs，阶段约5/20ms。普通行最多1024字符或256片段；公式开关不放宽预算',
            };
        break;
      }
      case 'defaults':
        policy = {
          warningMs: 0.01,
          errorMs: 0.05,
          rationale:
            'compile/orchestration/traversal 进入Scope时合并一次默认值；假设100层或同级Scope更新，每次10/50μs，继承阶段约1/5ms；直接继承、稀疏覆盖、reset 使用相同目标',
        };
        break;
      default:
        throw new Error(`Missing Core resolver budget: ${identity}`);
    }
  } else {
    throw new Error(`Missing Core benchmark budget: ${identity}`);
  }
  return { kind: 'workload', metric: 'p90', blocking: false, ...policy };
};
