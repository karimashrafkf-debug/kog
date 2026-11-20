import { Download, Music, Trash2, Volume2 } from 'lucide-react';
import type { RenderRecord } from '../types/studio';

interface RendersGalleryProps {
  renders: RenderRecord[];
  onUseAsSoundtrack: (url: string) => void;
  onSelectForMastering: (id: string) => void;
  onDeleteRender: (id: string) => Promise<void>;
}

const KIND_LABELS: Record<RenderRecord['kind'], string> = {
  'ai-video': 'فيديو AI منتَج',
  keyframe: 'لقطة معاينة',
  'audio-master': 'ماستر صوتي مُحسّن',
  soundtrack: 'موسيقى تصويرية',
};

export function RendersGallery({
  renders,
  onUseAsSoundtrack,
  onSelectForMastering,
  onDeleteRender,
}: RendersGalleryProps) {
  return (
    <section id="renders" className="py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#F4F4F5]">04. مكتبة المخرجات النهائية</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            جميع الفيديوهات المنتجة، لقطات المعاينة، النسخ الصوتية المُحسّنة، والموسيقى التصويرية الجاهزة للتنزيل.
          </p>
        </div>
        <span className="font-mono-tabular text-sm text-[#A1A1AA]">
          {renders.length} عنصر محفوظ
        </span>
      </div>

      {renders.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111216] px-6 py-12 text-center">
          <p className="text-base font-semibold text-[#F4F4F5]">لا توجد مخرجات محفوظة بعد</p>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            ابدأ بتوليد لقطة معاينة أو إنتاج الفيديو الاحترافي أو تحسين جودة الصوت في الأقسام أعلاه.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {renders.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#111216] p-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#D4AF37]">
                      {KIND_LABELS[item.kind]}
                    </p>
                    <h3 className="mt-0.5 truncate text-base font-bold text-[#F4F4F5]">
                      {item.titleAr}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteRender(item.id)}
                    aria-label={`حذف ${item.titleAr}`}
                    className="shrink-0 rounded-lg p-2 text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {item.kind === 'keyframe' ? (
                  <div className="aspect-[9/16] max-h-[320px] w-full overflow-hidden rounded-lg border border-white/10 bg-black">
                    <img
                      src={item.url}
                      alt={item.titleAr}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : item.kind === 'soundtrack' ? (
                  <div className="rounded-lg border border-white/10 bg-[#18191F] p-4">
                    <audio src={item.url} controls className="w-full" />
                  </div>
                ) : (
                  <div className="aspect-[9/16] max-h-[320px] w-full overflow-hidden rounded-lg border border-white/10 bg-black">
                    <video
                      src={item.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <div
                  dir="ltr"
                  className="font-mono-tabular flex flex-wrap items-center justify-end gap-2 text-xs text-[#A1A1AA]"
                >
                  {item.durationSec ? <span>{item.durationSec.toFixed(1)}s</span> : null}
                  {item.resolution ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.resolution}</span>
                    </>
                  ) : null}
                  {item.afterMetrics?.meanVolumeDb !== null &&
                  item.afterMetrics?.meanVolumeDb !== undefined ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.afterMetrics.meanVolumeDb} dB</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <a
                  href={item.url}
                  download
                  className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-bold text-[#09090B] transition-colors hover:bg-[#E5C158]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تنزيل</span>
                </a>

                {item.kind === 'soundtrack' && (
                  <button
                    type="button"
                    onClick={() => onUseAsSoundtrack(item.url)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-[#18191F] px-3 py-2 text-xs font-semibold text-[#F4F4F5] hover:border-white/30"
                  >
                    <Music className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>اعتماد للدمج</span>
                  </button>
                )}

                {(item.kind === 'ai-video' || item.kind === 'audio-master') && (
                  <button
                    type="button"
                    onClick={() => onSelectForMastering(item.id)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-[#18191F] px-3 py-2 text-xs font-semibold text-[#F4F4F5] hover:border-white/30"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>تحسين الصوت</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
