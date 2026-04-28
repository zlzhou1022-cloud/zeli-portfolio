"use client";

import { useEffect, useState } from "react";

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 检测暗黑模式
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    // 监听主题变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* 主渐变层 - 日间模式更明显 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* 左上角大光斑 */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full animate-float-slow"
          style={{
            background: isDark 
              ? 'radial-gradient(circle, rgba(120, 113, 108, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(120, 113, 108, 0.15) 0%, rgba(120, 113, 108, 0.08) 40%, transparent 70%)',
            filter: isDark ? 'blur(150px)' : 'blur(100px)',
          }}
        />
        
        {/* 右下角大光斑 */}
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full animate-float-slower"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(168, 162, 158, 0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(168, 162, 158, 0.12) 0%, rgba(168, 162, 158, 0.06) 40%, transparent 70%)',
            filter: isDark ? 'blur(150px)' : 'blur(100px)',
          }}
        />
        
        {/* 中心光斑 */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full animate-float-slowest"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(214, 211, 209, 0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(214, 211, 209, 0.1) 0%, rgba(214, 211, 209, 0.05) 40%, transparent 70%)',
            filter: isDark ? 'blur(120px)' : 'blur(80px)',
          }}
        />
      </div>

      {/* 细微的噪点纹理层 */}
      <div 
        className="fixed inset-0 opacity-[0.05] dark:opacity-[0.06] pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}
