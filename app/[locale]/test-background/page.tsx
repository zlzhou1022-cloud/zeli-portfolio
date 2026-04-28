export default function TestBackgroundPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">动态背景测试页面</h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">检查清单：</h2>
          
          <div className="bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm p-6 rounded-lg space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-medium">1. 动态背景组件状态</h3>
              <p className="text-stone-600 dark:text-stone-400">
                打开浏览器开发者工具（F12），在 Elements 面板中搜索 "animate-float"，
                应该能看到三个带有动画类的 div 元素。
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium">2. 预期效果</h3>
              <ul className="list-disc list-inside text-stone-600 dark:text-stone-400 space-y-1">
                <li>左上角：灰褐色光斑（rgba(120, 113, 108, 0.3)）</li>
                <li>右下角：浅灰色光斑（rgba(168, 162, 158, 0.25)）</li>
                <li>中心：更浅的灰色光斑（rgba(214, 211, 209, 0.2)）</li>
                <li>所有光斑应该缓慢移动（25-35秒一个循环）</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium">3. CSS 动画检查</h3>
              <p className="text-stone-600 dark:text-stone-400">
                在开发者工具的 Computed 面板中，选中一个光斑元素，
                查看 animation 属性是否正确应用。
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-medium">4. z-index 层级</h3>
              <p className="text-stone-600 dark:text-stone-400">
                动态背景的 z-index 为 0，应该在所有内容的后面。
                如果看不到效果，可能是被其他元素遮挡。
              </p>
            </div>
          </div>
          
          <div className="bg-stone-100 dark:bg-stone-800 p-6 rounded-lg">
            <h3 className="text-xl font-medium mb-4">测试区域</h3>
            <p className="text-stone-600 dark:text-stone-400 mb-4">
              这个区域有半透明背景，应该能透过它看到后面的动态光斑效果。
            </p>
            <div className="h-64 bg-white/30 dark:bg-stone-900/30 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <p className="text-2xl font-medium">透明测试区域</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
