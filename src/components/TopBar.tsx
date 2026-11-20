interface TopBarProps {
  onStartGenerate: () => void;
  isGenerating: boolean;
}

export function TopBar({ onStartGenerate, isGenerating }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090B]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-4">
        <a
          href="#top"
          className="whitespace-nowrap shrink-0 text-xl font-extrabold tracking-tight text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        >
          كيو سينما
        </a>

        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-6 text-sm font-semibold text-[#A1A1AA] md:flex"
        >
          <a
            href="#references"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            المصدر والمرجع
          </a>
          <a
            href="#director"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            إخراج المشهد
          </a>
          <a
            href="#audio-studio"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            هندسة الصوت
          </a>
          <a
            href="#renders"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            المخرجات
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartGenerate}
            disabled={isGenerating}
            className="whitespace-nowrap shrink-0 rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-[#09090B] transition-colors duration-150 hover:bg-[#E5C158] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4F4F5]"
          >
            {isGenerating ? 'جاري الإنتاج...' : 'إنتاج الفيديو'}
          </button>
        </div>
      </div>
    </header>
  );
}
