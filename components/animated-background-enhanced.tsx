"use client";

import { useEffect, useState } from "react";

export function AnimatedBackgroundEnhanced() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* 主渐变层 - 增强版 */}
      <div 
        className="fixed inset-0 overflow-hidden pointer-events-none" 
        style={{ zIndex: -1 }} // 改为 -1 确保在最底层
      >
        {/* 左上角大光斑 - 增强对比度 */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full animate-float-slow"
          style={{
            background: 'radial-gradient(circle, rgba(120, 113, 108, 0.4) 0%, rgba(120, 113, 108, 0.2) 40%, transparent 70%)',
            filter: 'blur(120px)',
            willChange: 'transform', // 性能优化
          }}
        />
        
        {/* 右下角大光斑 - 增强对比度 */}
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full animate-float-slower"
          style={{
            background: 'radial-gradient(circle, rgba(168, 162, 158, 0.35) 0%, rgba(168, 162, 158, 0.15) 40%, transparent 70%)',
            filter: 'blur(120px)',
            willChange: 'transform',
          }}
        />
        
        {/* 中心光斑 - 增强对比度 */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full animate-float-slowest"
          style={{
            background: 'radial-gradient(circle, rgba(214, 211, 209, 0.3) 0%, rgba(214, 211, 209, 0.15) 40%, transparent 70%)',
            filter: 'blur(100px)',
            willChange: 'transform',
          }}
        />
        
        {/* 额外的小光斑增加层次感 */}
        <div 
          className="absolute top-1/4 right-1/4 w-1/3 h-1/3 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245, 245, 244, 0.2) 0%, transparent 60%)',
            filter: 'blur(80px)',
            animation: 'float-slow 20s ease-in-out infinite reverse',
            willChange: 'transform',
          }}
        />
      </div>

      {/* 细微的噪点纹理层 */}
      <div 
        className="fixed inset-0 opacity-[0.05] dark:opacity-[0.08] pointer-events-none"
        style={{
          zIndex: -1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}
