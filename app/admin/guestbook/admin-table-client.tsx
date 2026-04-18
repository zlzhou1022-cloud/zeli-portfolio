"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface Post {
  id: string;
  author: string;
  title: string | null;
  content: string;
  created_at: string;
  is_visible: boolean;
  reply_to_id?: string | null;
  reply_to_author?: string | null;
  reply_to_content?: string | null;
}

interface AdminTableClientProps {
  posts: Post[];
  currentPage: number;
  totalPage: number;
  count: number | null;
  toggleVisibilityAction: (id: string, currentStatus: boolean) => Promise<void>;
  // 💡 1. 声明新接口
  updateVisibilityBulkAction: (ids: string[], is_visible: boolean) => Promise<void>;
  deleteBulkAction: (ids: string[]) => Promise<void>;
}

export function AdminTableClient({
  posts,
  currentPage,
  totalPage,
  toggleVisibilityAction,
  updateVisibilityBulkAction,
  deleteBulkAction
}: AdminTableClientProps) {
  const router = useRouter();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [jumpValue, setJumpValue] = useState("");

  const handleCheck = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSet = new Set(selectedIds);
    if (e.target.checked) {
      posts.forEach((p: Post) => newSet.add(p.id));
    } else {
      posts.forEach((p: Post) => newSet.delete(p.id));
    }
    setSelectedIds(newSet);
  };

  // 💡 2. 批量隐藏功能
  const handleBulkHide = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要隐藏选中的 ${selectedIds.size} 条留言吗？`)) {
      await updateVisibilityBulkAction(Array.from(selectedIds), false);
      setSelectedIds(new Set()); 
    }
  };

  // 💡 3. 批量恢复（公开）功能
  const handleBulkShow = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要公开选中的 ${selectedIds.size} 条留言吗？`)) {
      await updateVisibilityBulkAction(Array.from(selectedIds), true);
      setSelectedIds(new Set());
    }
  };

  // 批量删除
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要彻底删除选中的 ${selectedIds.size} 条留言吗？此操作不可逆！`)) {
      await deleteBulkAction(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleJump = () => {
    const num = parseInt(jumpValue);
    if (!isNaN(num) && num >= 1 && num <= totalPage) {
      router.push(`/admin/guestbook?p=${num}`);
      setJumpValue("");
    } else {
      alert(`请输入 1 到 ${totalPage} 之间的页数`);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const s = Math.max(1, currentPage - 2);
    const e = Math.min(totalPage, currentPage + 2);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  const isCurrentPageAllSelected = posts.length > 0 && posts.every((p: Post) => selectedIds.has(p.id));

  return (
    <div className="space-y-4 transition-colors">
      
      {/* 批量操作工具栏 */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors min-h-[64px]">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">
          已选择 <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg px-1">{selectedIds.size}</span> 项
        </div>
        
        {/* 💡 4. 在选中状态下显示完整的操作按钮组 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end animate-in fade-in zoom-in duration-200">
            <button 
              onClick={handleBulkShow}
              className="px-3 sm:px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
            >
              批量恢复
            </button>
            <button 
              onClick={handleBulkHide}
              className="px-3 sm:px-4 py-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              批量隐藏
            </button>
            <button 
              onClick={handleBulkDelete}
              className="px-3 sm:px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors shadow-sm cursor-pointer"
            >
              彻底删除
            </button>
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={isCurrentPageAllSelected}
                  onChange={handleCheckAll}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </th>
              <th className="py-4 pr-4 font-medium w-24">状态</th>
              <th className="p-4 font-medium w-48">发件人 & 时间</th>
              <th className="p-4 font-medium w-48">标题</th>
              <th className="p-4 font-medium">内容</th>
              <th className="p-4 font-medium text-right w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((post: Post) => (
              <tr key={post.id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors ${!post.is_visible ? 'opacity-50' : ''}`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(post.id)}
                    onChange={() => handleCheck(post.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </td>
                <td className="py-4 pr-4">
                  {post.is_visible ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs rounded-md font-bold">公开</span>
                  ) : (
                    <span className="px-2 py-1 bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs rounded-md font-bold">已隐藏</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{post.author}</div>
                  <div className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString('zh-CN')}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {post.title || <span className="text-slate-400 italic">无标题</span>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{post.content}</div>
                  {post.reply_to_id && <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 font-medium">↳ 回复给: {post.reply_to_author}</div>}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => toggleVisibilityAction(post.id, post.is_visible)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      {post.is_visible ? '隐藏' : '恢复'}
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('确定要彻底删除吗？此操作不可逆！')) deleteBulkAction([post.id]);
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 高级翻页组件 */}
      {totalPage > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <div className="flex items-center gap-2">
            <Link 
              href={`/admin/guestbook?p=${Math.max(1, currentPage - 1)}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 1 ? 'pointer-events-none opacity-30 text-slate-500' : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}
            >
              ← 上一页
            </Link>

            {getPageNumbers().map(num => (
              <Link
                key={num}
                href={`/admin/guestbook?p=${num}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  num === currentPage 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md scale-105' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {num}
              </Link>
            ))}

            <Link 
              href={`/admin/guestbook?p=${Math.min(totalPage, currentPage + 1)}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPage ? 'pointer-events-none opacity-30 text-slate-500' : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}
            >
              下一页 →
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={`1 ~ ${totalPage}`}
              className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-colors"
            />
            <button 
              onClick={handleJump}
              className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer"
            >
              跳转
            </button>
          </div>
        </div>
      )}
    </div>
  );
}