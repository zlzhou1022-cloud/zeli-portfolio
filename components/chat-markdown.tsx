"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

// 小灵回复的 Markdown 渲染器（PR-C 引入 react-markdown）。
// - 站内链接（/ 开头）：同标签页跳转，路径自带 locale 前缀，原样使用。
// - 外部链接：新标签页 + rel=noopener noreferrer。
// - 不启用 remark-gfm：只支持粗体/斜体/列表/链接/行内代码等基础语法，
//   与提示词的输出约定（Markdown 站内链接）对齐。
const components: Components = {
  a: ({ href, children }) => {
    const url = href ?? "";
    const isInternal = url.startsWith("/") && !url.startsWith("//");
    if (isInternal) {
      return (
        <a href={url} className="underline underline-offset-2 decoration-stone-400 hover:decoration-stone-700 dark:hover:decoration-stone-200 font-normal">
          {children}
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-stone-400 hover:decoration-stone-700 dark:hover:decoration-stone-200 font-normal">
        {children}
      </a>
    );
  },
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => (
    <code className="bg-stone-200/70 dark:bg-stone-800 px-1 py-0.5 text-[0.85em] font-mono">{children}</code>
  ),
};

export default function ChatMarkdown({ content }: { content: string }) {
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
