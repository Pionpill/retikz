import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 单次操作的消费预算；次数是规划假设，不代表代码硬上限或实测业务分布 */
type CoreBudgetPolicy = {
  /** P50 警告阈值，单位为毫秒 */
  warningMs: number;
  /** P50 错误阈值，单位为毫秒 */
  errorMs: number;
  /** 消费路径、调用频率和阶段时间分配依据 */
  rationale: string;
};

/** 按稳定场景标识选择预设预算，不读取测量值；新增类别未配置时显式报错 */
export const resolveCoreBudget = (scenario: BenchmarkScenario): BenchmarkBudget | undefined => {
  const identity = scenario.id.slice(scenario.id.lastIndexOf(' > ') + 3);
  const [layer, family, variant, scale, reuseMode] = identity.split('/');
  // 1024 边是支持上限参考，尚未承诺普通节点批量实时更新预算；仅报告，不等同于达标
  if (layer === 'providers' && family === 'shape' && variant === 'polygon' && /"sides":1024(?:,|})/.test(scale)) {
    return undefined;
  }
  let policy: CoreBudgetPolicy;
  if (layer === 'compile' && family === 'resource') {
    const count = Number(scale);
    if (![16, 64, 256].includes(count)) throw new Error(`Missing Core resource scale budget: ${identity}`);
    policy = {
      warningMs: count === 16 ? 1 : count === 64 ? 2 : 4,
      errorMs: count === 16 ? 2 : count === 64 ? 4 : 8,
      rationale:
        '一次工作区或结果组装中的完整注册表生命周期，包含创建及N次登记/导入；用户指定16/64/256档、256为本测试上限，非产品硬限制。按消费预算假设为16次局部使用分配1/2ms、64次较多资源分配2/4ms、256次上限分配4/8ms（警告/错误）；上限错误预算不超过约半个60Hz帧，为其它编译与渲染阶段留出时间。重复登记只有1个资源，不同内容或导入有N个资源；复杂Pattern不放宽预算，不含输入解析和renderer，不代表实际资源分布、整帧保证或稳定回归上限',
    };
  } else if (layer === 'compile' && family === 'path') {
    const count = Number(scale);
    const complete =
      /^complete-(absolute|relative-axis|reference-clip|curves-shapes|smooth|rounded-subpaths|step-labels|interrupt-labels|marks|combined)$/.exec(
        variant,
      );
    const completeValid =
      complete !== null &&
      (reuseMode === 'none'
        ? [16, 1024].includes(count)
        : count === 1024 &&
          ((['absolute', 'interrupt-labels', 'combined'].includes(complete[1]) &&
            ['targets', 'geometry', 'layout', 'stroke', 'all'].includes(reuseMode)) ||
            (['interrupt-labels', 'combined'].includes(complete[1]) &&
              ['labels-half', 'labels-all', 'label-content', 'drawing'].includes(reuseMode)) ||
            (complete[1] === 'combined' && ['marks-placement', 'marks-content'].includes(reuseMode))));
    const update = /^update-(color|label|endpoint)-(none|partial)$/.test(variant);
    const custom = /^custom-(iterable|double-stroke|materialized)$/.test(variant);
    const binding = variant === 'bind-targets';
    const stage = variant === 'stroke-layout' || variant === 'stroke-emit';
    const valid =
      complete !== null
        ? completeValid
        : binding
          ? [16, 1024].includes(count)
          : stage
            ? count === 1024
            : update
              ? count === (variant.startsWith('update-color-') ? 16 : 1024)
              : custom
                ? variant === 'custom-iterable'
                  ? [8, 128].includes(count)
                  : count === (variant === 'custom-double-stroke' ? 1024 : 16)
                : false;
    if (!valid) throw new Error(`Missing Core path operation budget: ${identity}`);
    // 千步骤路径属于少见的大规模负载；保留采样和复用对照，不承诺批量实时预算
    if (count === 1024) return undefined;
    const large = count === 128;
    policy = {
      warningMs: large ? 0.5 : binding ? 0.05 : 0.1,
      errorMs: large ? 2 : binding ? 0.2 : 0.5,
      rationale:
        '一次Core Path完整编译或明确阶段，不含Source resolve、fixture、prepared构造、调用方有效性比较/跨次资源恢复及renderer。真实目标解析器每次新建并计时，单次绑定缓存不跨样本；BoundaryStore背景与paint资源暖态。规划假设100条16步骤普通路径编译分配10/50ms；16目标绑定分配0.05/0.2ms。8/128叶图元Definition分别按普通/复杂路径，复杂叶图元分配0.5/2ms。1024步骤、过点或目标属于少见大规模负载，仅参考，不承诺批量实时更新；其完整编译、prepared更新及独立阶段仍保留对比。scale表示步骤、smooth过点或自定义叶图元，装饰为1/16个且箭头恒双端；缺少业务遥测，不代表业务硬上限或整帧保证，不按本次测量放宽',
    };
  } else if (layer === 'compile' && family === 'scope') {
    const count = Number(scale);
    const complete = /^complete-(rectangle|circle)-(none|envelope|preparation|placement|layout|all)$/.test(variant);
    const clipped = /^clipped-(none|clip|layout\+clip|all)$/.test(variant);
    const envelope = /^envelope-(rectangle|circle)$/.test(variant);
    const placement = variant === 'prepare' || variant === 'placement';
    const publish = /^publish-(anonymous|named)$/.test(variant);
    const bounds = /^bounds-(layout|decoration)$/.test(variant);
    const update = /^update-(move|children|animation)-(none|partial)$/.test(variant);
    const empty = variant === 'empty' && count === 0;
    const valid = complete
      ? variant.includes('circle')
        ? count === 128
        : [32, 1024].includes(count)
      : clipped || update
        ? count === 32
        : envelope
          ? variant.endsWith('circle')
            ? [16, 128].includes(count)
            : [32, 1024].includes(count)
          : placement
            ? [3, 24].includes(count)
            : publish
              ? variant.endsWith('named') && !variant.endsWith('anonymous')
                ? count === 1
                : [32, 1024].includes(count)
              : bounds
                ? variant.endsWith('decoration')
                  ? [8, 128].includes(count)
                  : [32, 1024].includes(count)
                : empty;
    if (!valid) throw new Error(`Missing Core scope operation budget: ${identity}`);
    const named = variant === 'publish-named';
    const large = complete ? count > 32 : (envelope || publish || bounds) && (count === 1024 || count === 128);
    policy = {
      warningMs: placement ? 0.02 : named ? 0.01 : large ? 0.5 : envelope || publish || bounds ? 0.05 : 0.1,
      errorMs: placement ? 0.1 : named ? 0.05 : large ? 2 : envelope || publish || bounds ? 0.2 : 0.5,
      rationale:
        'Core一次Scope自身编译或完整阶段，不含子树递归、resolve、fixture和调用方失效/资源恢复。规划假设100个普通Scope完整编译10/50ms，20个复杂Scope10/40ms；100次小包络、匿名发布或输出投影5/20ms，单个复杂聚合0.5/2ms；100次前置/最终放置2/10ms，100次命名单包络发布1/5ms。32子布局更新按普通Scope，16/128圆包络和1024矩形子布局是固定代表分布，同输入prepared各档预算相同。资源暖态但登记仍计时，命名规模为实际投影数1；缺少业务遥测，不表示业务硬上限或整帧保证，不按测量值放宽',
    };
  } else if (layer === 'compile' && family === 'node') {
    const count = Number(scale);
    const complete =
      /^complete-(empty|plain|mixed|labels|fixed)-(none|content|body|labels-half|labels-all|layout|drawing|all)$/.test(
        variant,
      );
    const body = /^body-(exact|range|intrinsic)-(none|shape)$/.test(variant);
    const emit = /^emit-(plain|mixed|labels|gradient)$/.test(variant);
    const update = /^update-(move|color|label)-(none|partial)$/.test(variant);
    const anchor = variant === 'layout-anchor';
    if (!(complete || body || emit || update || anchor) || ![0, 1, 3, 8, 16, 24, 32, 64, 1024].includes(count)) {
      throw new Error(`Missing Core node operation budget: ${identity}`);
    }
    const small = (complete && [0, 1, 8, 32].includes(count)) || variant.startsWith('update-color-');
    policy = {
      warningMs: anchor ? 0.02 : emit || small ? 0.1 : 0.5,
      errorMs: anchor ? 0.1 : emit || small ? 0.5 : 2,
      rationale:
        '一次Core节点完整编译或明确阶段，不含resolve、fixture、调用方有效性判断与缓存恢复。假设100个普通节点完整编译分配10/50ms，20个复杂节点或1024字符宽度求解分配10/40ms；100个已测量节点定位2/10ms，100次独立绘制10/50ms。同最终输入各prepared档预算相同，移动/改单标签按16标签复杂节点，32字符换色按普通节点。规模、频率和阶段时间均为规划假设，缺少业务遥测，不代表整帧保证；不传prepared只表示不复用阶段产物',
    };
  } else if (layer === 'compile' && family === 'boundary') {
    const count = Number(scale);
    const rationale =
      'Core节点/作用域布局与路径目标逐次消费一次边界操作；假设1000次查询或100次布局准备，为后续路径几何和renderer保留时间。缓存属于BoundaryStore自身契约：first含store创建和首次完整求值，hit在计时外预置。规模和频率是规划假设，不表示已验证业务上限';
    if (variant === 'clip-polyline') {
      if (![16, 1024].includes(count)) throw new Error(`Missing Core boundary clipping budget: ${identity}`);
      policy = {
        warningMs: count === 16 ? 0.05 : 0.5,
        errorMs: count === 16 ? 0.2 : 2,
        rationale:
          'PathTargetView对完整折线移除节点连接面内前缀；假设100条16顶点普通曲线各分配0.05/0.2ms（5/20ms阶段），单条1024顶点复杂折线分配0.5/2ms。固定一半内部顶点及一条非中心出界线段，包含扫描、provider求交和二分，不含调用方采样或坐标批量投影',
      };
    } else if (variant === 'project-published') {
      if (![3, 24].includes(count)) throw new Error(`Missing Core published layout budget: ${identity}`);
      policy = {
        warningMs: 0.01,
        errorMs: 0.05,
        rationale: `${rationale}；一次已发布布局经过父链逆变换、本层3项和父链正变换，含内容中心；假设100个布局各10/50μs，阶段约1/5ms，不按父链长放宽`,
      };
    } else if (variant === 'project-prepared') {
      if (count !== 24) throw new Error(`Missing Core prepared layout budget: ${identity}`);
      policy = {
        warningMs: 0.005,
        errorMs: 0.02,
        rationale: `${rationale}；矩阵已预置，单布局投影5/20μs，100个布局约0.5/2ms；包括输出分配、contentCenter及margin投影`,
      };
    } else {
      if (
        count !== 1 ||
        ![
          'expand-zero',
          'expand-rotated',
          'point-shape',
          'point-circle',
          'point-ellipse',
          'anchor-named',
          'anchor-angle',
          'anchor-fraction',
          'store-first',
          'store-hit',
        ].includes(variant)
      )
        throw new Error(`Missing Core boundary operation budget: ${identity}`);
      const simple = variant.startsWith('expand-') || variant === 'store-hit';
      policy = {
        warningMs: simple ? 0.002 : 0.005,
        errorMs: simple ? 0.01 : 0.02,
        rationale: `${rationale}；简单矩形外扩或缓存查询按每次2/10μs，完整附着点/锚点/首次缓存求值按5/20μs；1000次分别对应2/10ms与5/20ms`,
      };
    }
  } else if (layer === 'compile' && family === 'reference') {
    const count = Number(scale);
    const rationale =
      'Core坐标、节点放置和路径目标消费一次完整引用/位置操作，引用Map与几何、作用域矩阵在计时外准备；不含Reconciler命名空间、依赖追踪或跨次缓存。假设1000次简单查询或100次复杂表达式求值，预算为规划分配，不表示已验证业务上限';
    if (
      variant === 'context-compose' ||
      variant === 'project-published' ||
      variant === 'position-polar' ||
      variant === 'target-between'
    ) {
      const valid =
        variant === 'context-compose'
          ? count === 24
          : variant === 'target-between'
            ? [1, 4].includes(count)
            : [3, 24].includes(count);
      if (!valid) throw new Error(`Missing Core recursive reference budget: ${identity}`);
      policy = {
        warningMs: 0.01,
        errorMs: 0.05,
        rationale: `${rationale}；完整准备或递归表达式每次10/50μs，100次约1/5ms。polar为3/24层合法嵌套原点，between为1/4层二叉树（2/16叶）；再投影含3/24项父链与非交换本层3项，不以复杂度放宽同类预算`,
      };
    } else {
      const simple = [
        'context-empty',
        'context-prepared',
        'position-tuple',
        'position-reference',
        'target-center',
        'project-coordinate',
      ].includes(variant);
      const valid =
        variant === 'context-empty'
          ? count === 0
          : ['context-prepared', 'project-coordinate'].includes(variant)
            ? count === 24
            : count === 1;
      if (
        !valid ||
        ![
          'context-empty',
          'context-prepared',
          'position-tuple',
          'position-reference',
          'position-at',
          'position-offset',
          'position-between',
          'target-center',
          'target-anchor-cached',
          'target-fraction-cached',
          'target-explicit-boundary',
          'target-world',
          'project-coordinate',
        ].includes(variant)
      )
        throw new Error(`Missing Core reference operation budget: ${identity}`);
      policy = {
        warningMs: simple ? 0.002 : 0.005,
        errorMs: simple ? 0.01 : 0.02,
        rationale: `${rationale}；简单上下文创建/坐标或中心查询/已准备矩阵投影每次2/10μs，完整相对位置与锚点目标每次5/20μs。显式边界包含真实resolver的查表与参数解析；锚点缓存预置但每次引用查询和坐标转换仍计时`,
      };
    }
  } else if (layer === 'compile' && family === 'shared-transform') {
    const count = Number(scale);
    if (variant === 'chain-forward' || variant === 'chain-inverse') {
      if (![3, 24].includes(count)) throw new Error(`Missing Core transform chain budget: ${identity}`);
      policy = {
        warningMs: 0.005,
        errorMs: 0.02,
        rationale:
          'Core边界、Scene四角及定位投影逐点消费一条变换链；假设1000点更新，每点5/20μs，对应5/20ms阶段分配。3/24项是普通/深层混合链的规划输入，不含点集调度或renderer，不按链长放宽预算',
      };
    } else if (variant === 'compose-full' || variant === 'compose-append') {
      if (!(variant === 'compose-full' ? [3, 24].includes(count) : count === 3)) {
        throw new Error(`Missing Core transform composition budget: ${identity}`);
      }
      policy = {
        warningMs: 0.01,
        errorMs: 0.05,
        rationale:
          'Reconciler进入Scope或定位上下文准备时消费一次纯变换合成；假设100个作用域各分配10/50μs，阶段约1/5ms。完整链3/24项；追加固定21项父链结果与显式完整链均预置，只测3项本层合成，不含调用方链构造、缓存查找或跨调用复用',
      };
    } else if (variant === 'composed-forward' || variant === 'composed-inverse') {
      if (count !== 1) throw new Error(`Missing Core composed transform budget: ${identity}`);
      policy = {
        warningMs: 0.002,
        errorMs: 0.01,
        rationale:
          'Core引用、路径目标与边界消费已合成矩阵投影一个点；假设1000点各分配2/10μs，阶段约2/10ms。24项链矩阵在计时外准备，不包含合成或Reconciler缓存；短操作接近计时开销，不表示整帧保证',
      };
    } else throw new Error(`Missing Core shared transform budget: ${identity}`);
  } else if (layer === 'compile' && family === 'shared-provider') {
    const count = Number(scale);
    if (variant === 'position') {
      if (count !== 1) throw new Error(`Missing Core provider position budget: ${identity}`);
      policy = {
        warningMs: 0.002,
        errorMs: 0.01,
        rationale:
          'Boundary/Shape provider返回有限二维坐标后执行一次guard内快照；假设1000次查询各分配2/10μs，快照阶段约2/10ms。只含有限值校验与坐标脱离，不含provider几何计算',
      };
    } else {
      const isPath = variant === 'snapshot-path';
      if (
        !['snapshot-tree', 'snapshot-path', 'materialize-tree'].includes(variant) ||
        !(isPath ? [16, 1024] : [8, 128]).includes(count)
      )
        throw new Error(`Missing Core provider snapshot budget: ${identity}`);
      const large = count === (isPath ? 1024 : 128);
      policy = {
        warningMs: large ? 0.5 : 0.05,
        errorMs: large ? 2 : 0.2,
        rationale:
          'Shape/Path/Mark一次完整provider输出快照，包含iterable消费、递归复制、有限值与资源检查；snapshot另含图元领域尺寸校验。假设100个8叶图元或16命令普通输出各分配0.05/0.2ms，阶段约5/20ms；单个128叶图元或1024命令复杂输出分配0.5/2ms。混合树固定三层组，不含provider生成、标记放置、完整编译或renderer；规模为规划假设',
      };
    }
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
      case 'text-block': {
        const count = Number(identity.split('/').at(-1));
        const large = variant === 'plain' ? count > 1_024 : count > 128;
        policy = large
          ? {
              warningMs: 0.5,
              errorMs: 2,
              rationale:
                'compile/node/content/layout、node/label/layout、path/host/label 共用文本块解析；假设单个长行块编辑（16384字符或2048混排片段），给块配置、分段及字体确定化0.5/2ms，字体测量和TeX排版另计',
            }
          : {
              warningMs: 0.05,
              errorMs: 0.2,
              rationale:
                'compile 的节点正文与标签消费文本块；假设100个单行块更新，每块配置、分段与字体解析50/200μs，阶段约5/20ms。普通块最多1024字符或256片段；公式开关不放宽预算',
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
  return { kind: 'workload', metric: 'p50', blocking: false, ...policy };
};
