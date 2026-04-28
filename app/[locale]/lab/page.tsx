import Link from "next/link";
import { getAllProjects } from "@/lib/lab-data";
import { useTranslations } from "next-intl";

export default function LabPage() {
  const projects = getAllProjects();
  
  // 引入两个不同的翻译命名空间
  const t = useTranslations("LabPage");
  const tProjects = useTranslations("Projects");

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-1000 mt-8 mb-32">
      
      {/* 顶部标题区域 */}
      <header className="border-b border-stone-200 dark:border-stone-800 pb-12">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group mb-8">
            <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t("backHome")}
          </Link>
          <h1 className="text-5xl md:text-6xl font-serif text-stone-900 dark:text-stone-100 transition-colors mb-4 leading-[1.1]">{t("title")}</h1>
        </div>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light max-w-2xl">
          {t("description")}
        </p>
      </header>

      {/* 项目列表 */}
      <div className="space-y-1">
        {projects.map((project, index) => (
          <a 
            key={project.id}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block border-b border-stone-200 dark:border-stone-800 py-8 hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-all px-6 -mx-6"
          >
            <div className="flex items-start justify-between gap-8 mb-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 font-medium">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
                    {tProjects(`${project.id}.title`)}
                  </h2>
                </div>
                <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed font-light ml-12">
                  {tProjects(`${project.id}.description`)}
                </p>
              </div>
              
              {/* 外链图标 */}
              <svg className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap gap-2 ml-12">
              {project.tags.map(tag => (
                <span 
                  key={tag} 
                  className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-medium text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>

      {/* 底部返回按钮 */}
      <div className="pt-16 mt-16 border-t border-stone-200 dark:border-stone-800 flex justify-start">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group">
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

    </div>
  );
}