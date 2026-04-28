"use client";

import { useEffect, useState } from "react";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // 默认为 true，避免闪烁

  useEffect(() => {
    // 更严格的移动设备检测
    const checkMobile = () => {
      // 检测是否支持精确指针设备（鼠标）
      const hasPointer = window.matchMedia('(pointer: fine)').matches;
      // 检测是否支持悬停
      const hasHover = window.matchMedia('(hover: hover)').matches;
      // 检测触摸点
      const hasTouchPoints = navigator.maxTouchPoints > 0;
      // 检测 User Agent
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // 只有在有精确指针且支持悬停的情况下才显示自定义光标
      const isDesktop = hasPointer && hasHover && !mobileUA;
      setIsMobile(!isDesktop);
    };
    
    checkMobile();

    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        (target.closest && target.closest("a")) ||
        (target.closest && target.closest("button")) ||
        (target.classList && target.classList.contains("cursor-pointer"))
      ) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener("mousemove", updatePosition);
    document.addEventListener("mouseenter", handleMouseEnter, true);
    document.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseenter", handleMouseEnter, true);
      document.removeEventListener("mouseleave", handleMouseLeave, true);
    };
  }, [isVisible]);

  // 移动端不显示自定义光标
  if (isMobile) return null;
  if (!isVisible) return null;

  return (
    <>
      {/* 主光标点 */}
      <div
        className="fixed pointer-events-none z-[9999] mix-blend-difference"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`bg-white rounded-full transition-all duration-200 ${
            isHovering ? "w-2 h-2" : "w-1 h-1"
          }`}
        />
      </div>

      {/* 跟随圆环 */}
      <div
        className="fixed pointer-events-none z-[9998] mix-blend-difference transition-all duration-300 ease-out"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`border border-white rounded-full transition-all duration-300 ${
            isHovering ? "w-12 h-12 opacity-50" : "w-8 h-8 opacity-30"
          }`}
        />
      </div>
    </>
  );
}
