"use client";

import { useEffect, useState } from "react";

/**
 * 调试版动态背景组件
 * 使用更明显的颜色和效果，便于确认组件是否正常渲染
 */
export function AnimatedBackgroundDebug() {
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    rendered: false,
    timestamp: '',
  });

  useEffect(() => {
    setMounted(true);
    setDebugInfo({
      rendered: true,
      timestamp: new Date().toISOString(),
    });
    
    console.log('🎨 AnimatedBackground 组件已挂载');
    console.log('时间:', new Date().toLocaleString());
  }, []);

  if (!mounted) {
    console.log('⏳ AnimatedBackground 等待挂载...');
    return null;
  }

  return (
    <>
      {/* 调试信息 - 可以在开发时显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed top-20 right-4 bg-black/80 text-white text-xs p-2 rounded z-50 font-mono"
          style={{ pointerEvents: 'none' }}
        >
          <div>✓ AnimatedBackground 已渲染</div>
          <div>时间: {debugInfo.timestamp.split('T')[1]?.slice(0, 8)}</div>
        </div>
      )}
      
      {/* 主渐变层 - 调试版（更明显的颜色） */}
      <div 
        className="fixed inset-0 overflow-hidden pointer-events-none" 
        style={{ 
          zIndex: -1,
          border: process.env.NODE_ENV === 'development' ? '2px solid red' : 'none',
        }}
      >
        {/* 左上角大光斑 - 调试版（更明显） */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full animate-float-slow"
          style={{
            background: 'radial-gradient(circle, rgba(120, 113, 108, 0.6) 0%, rgba(120, 113, 108, 0.3) 40%, transparent 70%)',
            filter: 'blur(100px)',
            willChange: 'transform',
          }}
          data-blob="1"
        />
        
        {/* 右下角大光斑 - 调试版（更明显） */}
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full animate-float-slower"
          style={{
            background: 'radial-gradient(circle, rgba(168, 162, 158, 0.5) 0%, rgba(168, 162, 158, 0.25) 40%, transparent 70%)',
            filter: 'blur(100px)',
            willChange: 'transform',
          }}
          data-blob="2"
        />
        
        {/* 中心光斑 - 调试版（更明显） */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full animate-float-slowest"
          style={{
            background: 'radial-gradient(circle, rgba(214, 211, 209, 0.5) 0%, rgba(214, 211, 209, 0.25) 40%, transparent 70%)',
            filter: 'blur(80px)',
            willChange: 'transform',
          }}
          data-blob="3"
        />
        
        {/* 额外的测试光斑 - 快速移动，便于观察 */}
        {process.env.NODE_ENV === 'development' && (
          <div 
            className="absolute top-1/4 right-1/4 w-48 h-48 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'float-slow 5s ease-in-out infinite',
              willChange: 'transform',
            }}
            data-blob="debug"
          />
        )}
      </div>

      {/* 细微的噪点纹理层 */}
      <div 
        className="fixed inset-0 opacity-[0.08] dark:opacity-[0.1] pointer-events-none"
        style={{
          zIndex: -1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}
