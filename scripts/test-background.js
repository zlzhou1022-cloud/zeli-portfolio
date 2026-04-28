// 在浏览器控制台运行此脚本来诊断动态背景问题

console.log('🎨 开始动态背景诊断...\n');

// 1. 检查 AnimatedBackground 组件是否渲染
const checkElements = () => {
  const floatElements = document.querySelectorAll('[class*="animate-float"]');
  console.log(`✓ 找到 ${floatElements.length} 个动画元素`);
  
  if (floatElements.length === 0) {
    console.error('❌ 未找到动画元素！AnimatedBackground 组件可能未渲染。');
    return false;
  }
  
  floatElements.forEach((el, index) => {
    console.log(`\n元素 ${index + 1}:`);
    console.log('  类名:', el.className);
    
    const computed = getComputedStyle(el);
    console.log('  animation:', computed.animation || '未设置');
    console.log('  filter:', computed.filter || '未设置');
    console.log('  background:', computed.background || '未设置');
    console.log('  z-index:', computed.zIndex);
    console.log('  opacity:', computed.opacity);
  });
  
  return true;
};

// 2. 检查 CSS 动画定义
const checkAnimations = () => {
  console.log('\n\n🎬 检查 CSS 动画定义...');
  
  const animations = ['float-slow', 'float-slower', 'float-slowest'];
  const styleSheets = Array.from(document.styleSheets);
  
  animations.forEach(animName => {
    let found = false;
    
    try {
      for (const sheet of styleSheets) {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === animName) {
            console.log(`✓ 找到动画: ${animName}`);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    } catch (e) {
      console.warn('无法访问某些样式表（可能是跨域）');
    }
    
    if (!found) {
      console.error(`❌ 未找到动画: ${animName}`);
    }
  });
};

// 3. 检查主题模式
const checkTheme = () => {
  console.log('\n\n🌓 检查主题模式...');
  const isDark = document.documentElement.classList.contains('dark');
  console.log(`当前模式: ${isDark ? '暗黑' : '浅色'}`);
  
  const bgColor = getComputedStyle(document.documentElement).backgroundColor;
  console.log(`HTML 背景色: ${bgColor}`);
  
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  console.log(`Body 背景色: ${bodyBg}`);
};

// 4. 检查 z-index 层级
const checkZIndex = () => {
  console.log('\n\n📊 检查 z-index 层级...');
  
  const elements = [
    { selector: '[class*="animate-float"]', name: '动画光斑' },
    { selector: 'header', name: '顶部导航' },
    { selector: 'main', name: '主内容区' },
  ];
  
  elements.forEach(({ selector, name }) => {
    const el = document.querySelector(selector);
    if (el) {
      const zIndex = getComputedStyle(el).zIndex;
      console.log(`${name}: z-index = ${zIndex}`);
    } else {
      console.log(`${name}: 未找到`);
    }
  });
};

// 5. 性能检查
const checkPerformance = () => {
  console.log('\n\n⚡ 性能检查...');
  
  const floatElements = document.querySelectorAll('[class*="animate-float"]');
  floatElements.forEach((el, index) => {
    const computed = getComputedStyle(el);
    const filter = computed.filter;
    const willChange = computed.willChange;
    
    console.log(`\n元素 ${index + 1}:`);
    console.log(`  filter: ${filter}`);
    console.log(`  will-change: ${willChange}`);
    
    if (filter.includes('blur')) {
      const blurMatch = filter.match(/blur\((\d+)px\)/);
      if (blurMatch) {
        const blurValue = parseInt(blurMatch[1]);
        if (blurValue > 150) {
          console.warn(`  ⚠️ 模糊度较高 (${blurValue}px)，可能影响性能`);
        }
      }
    }
  });
};

// 6. 可见性测试
const checkVisibility = () => {
  console.log('\n\n👁️ 可见性测试...');
  
  const floatElements = document.querySelectorAll('[class*="animate-float"]');
  floatElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    const computed = getComputedStyle(el);
    
    console.log(`\n元素 ${index + 1}:`);
    console.log(`  位置: (${Math.round(rect.left)}, ${Math.round(rect.top)})`);
    console.log(`  尺寸: ${Math.round(rect.width)} x ${Math.round(rect.height)}`);
    console.log(`  opacity: ${computed.opacity}`);
    console.log(`  visibility: ${computed.visibility}`);
    console.log(`  display: ${computed.display}`);
    
    if (computed.opacity === '0') {
      console.warn('  ⚠️ 元素完全透明');
    }
    if (computed.visibility === 'hidden') {
      console.warn('  ⚠️ 元素被隐藏');
    }
    if (computed.display === 'none') {
      console.warn('  ⚠️ 元素未显示');
    }
  });
};

// 7. 动画状态检查
const checkAnimationState = () => {
  console.log('\n\n🎭 动画状态检查...');
  
  const floatElements = document.querySelectorAll('[class*="animate-float"]');
  floatElements.forEach((el, index) => {
    const computed = getComputedStyle(el);
    
    console.log(`\n元素 ${index + 1}:`);
    console.log(`  animation-name: ${computed.animationName}`);
    console.log(`  animation-duration: ${computed.animationDuration}`);
    console.log(`  animation-timing-function: ${computed.animationTimingFunction}`);
    console.log(`  animation-iteration-count: ${computed.animationIterationCount}`);
    console.log(`  animation-play-state: ${computed.animationPlayState}`);
    
    if (computed.animationPlayState === 'paused') {
      console.warn('  ⚠️ 动画已暂停');
    }
    if (computed.animationName === 'none') {
      console.error('  ❌ 未应用动画');
    }
  });
};

// 执行所有检查
const runDiagnostics = () => {
  console.clear();
  console.log('═══════════════════════════════════════');
  console.log('   动态背景诊断工具 v1.0');
  console.log('═══════════════════════════════════════\n');
  
  const hasElements = checkElements();
  if (!hasElements) {
    console.log('\n\n❌ 诊断失败：未找到动画元素');
    console.log('请确认：');
    console.log('1. AnimatedBackground 组件已在 layout.tsx 中引入');
    console.log('2. 页面已完全加载');
    console.log('3. 没有 JavaScript 错误阻止组件渲染');
    return;
  }
  
  checkAnimations();
  checkTheme();
  checkZIndex();
  checkPerformance();
  checkVisibility();
  checkAnimationState();
  
  console.log('\n\n═══════════════════════════════════════');
  console.log('   诊断完成');
  console.log('═══════════════════════════════════════');
  console.log('\n💡 提示：');
  console.log('- 如果所有检查都通过但仍看不到效果，可能是颜色太淡');
  console.log('- 尝试增加透明度或减少模糊度');
  console.log('- 调整显示器亮度和对比度');
  console.log('- 在不同浏览器中测试');
};

// 运行诊断
runDiagnostics();

// 导出工具函数供手动调用
window.backgroundDiagnostics = {
  run: runDiagnostics,
  checkElements,
  checkAnimations,
  checkTheme,
  checkZIndex,
  checkPerformance,
  checkVisibility,
  checkAnimationState,
};

console.log('\n\n💡 你可以随时运行以下命令重新诊断：');
console.log('  window.backgroundDiagnostics.run()');
