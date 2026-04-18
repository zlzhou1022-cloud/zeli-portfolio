"use client";

export function DeleteButton() {
  return (
    <button 
      type="submit" 
      onClick={(e) => {
        // 如果用户点击了“取消”，则阻止表单提交
        if (!confirm('确定要彻底删除吗？此操作不可逆！')) {
          e.preventDefault();
        }
      }}
      className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
    >
      删除
    </button>
  );
}