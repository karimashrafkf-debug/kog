import { Film, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { StudioAssetItem } from '../types/studio';

interface ReferenceDeckProps {
  assets: StudioAssetItem[];
  onUploadFile: (file: File) => Promise<void>;
  isUploading: boolean;
}

export function ReferenceDeck({ assets, onUploadFile, isUploading }: ReferenceDeckProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const koSource = assets.find((a) => a.id === 'ko_source');
  const guardsRef = assets.find((a) => a.id === 'guards_ref');
  const customUploads = assets.filter((a) => a.role === 'custom-upload');

  const markImageFailed = (src: string) => {
    setFailedImages((prev) => ({ ...prev, [src]: true }));
  };

  const renderAssetCard = (asset: StudioAssetItem | undefined, roleTitle: string, subtitle: string) => {
    if (!asset) {
      return (
        <div className="flex min-h-[360px] flex-col justify-center rounded-xl border border-white/10 bg-[#111216] p-6 text-center text-sm text-[#A1A1AA]">
          جاري تحميل {roleTitle}...
        </div>
      );
    }

    return (
      <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#111216] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#D4AF37]">{roleTitle}</p>
            <h3 className="mt-1 truncate text-lg font-bold text-[#F4F4F5]">{asset.labelAr}</h3>
            <p className="mt-0.5 text-sm text-[#A1A1AA]">{subtitle}</p>
          </div>
          <div
            dir="ltr"
            className="font-mono-tabular shrink-0 text-left text-xs text-[#A1A1AA]"
          >
            <span>{asset.width && asset.height ? `${asset.width}×${asset.height}` : '9:16'}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{asset.durationSec.toFixed(1)}s</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-stretch">
          <div className="sm:col-span-6">
            <div className="relative aspect-[9/16] max-h-[360px] w-full overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                src={asset.url}
                controls
                playsInline
                preload="metadata"
                aria-label={asset.labelAr}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 sm:col-span-6">
            <div>
              <p className="mb-2 text-xs font-semibold text-[#A1A1AA]">
                الإطارات المرجعية المستخرجة
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {asset.frames.slice(0, 4).map((frameUrl, idx) => (
                  <div
                    key={frameUrl}
                    className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-[#18191F]"
                  >
                    {failedImages[frameUrl] ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-[#A1A1AA]">
                        <Film className="h-4 w-4 text-[#D4AF37]" />
                        <span>إطار {idx + 1}</span>
                      </div>
                    ) : (
                      <img
                        src={frameUrl}
                        alt={`${asset.labelAr} - إطار ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(frameUrl)}
                        className="h-full w-full object-cover object-top"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {asset.metrics && (
              <div className="border-t border-white/10 pt-3 text-xs text-[#A1A1AA]">
                <div className="flex items-center justify-between gap-2">
                  <span>متوسط الصوت الحالي</span>
                  <span dir="ltr" className="font-mono-tabular text-[#F4F4F5]">
                    {asset.metrics.meanVolumeDb !== null ? `${asset.metrics.meanVolumeDb} dB` : 'غير متوفر'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span>الذروة القصوى</span>
                  <span dir="ltr" className="font-mono-tabular text-[#F4F4F5]">
                    {asset.metrics.maxVolumeDb !== null ? `${asset.metrics.maxVolumeDb} dB` : 'غير متوفر'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section id="references" className="border-b border-white/10 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#F4F4F5]">01. المادة الأصلية والمرجع السينمائي</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            تم استخلاص لقطات الشخصية من فيديو KO والإيقاع الأصلي، ومطابقتها مع أسلوب التصوير والحراس في الفيديو المرجعي.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void onUploadFile(file);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/15 bg-[#18191F] px-4 py-2 text-sm font-semibold text-[#F4F4F5] transition-colors hover:border-white/30 hover:bg-[#20222A] disabled:opacity-60"
          >
            <Upload className="h-4 w-4 text-[#D4AF37]" />
            <span>{isUploading ? 'جاري الرفع...' : 'رفع ملف إضافي'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderAssetCard(
          koSource,
          'المصدر الأساسي للشخصية',
          'شخصية KO العضلية بالوشوم والتيشيرت الأبيض مع المسار الموسيقي الأصلي',
        )}
        {renderAssetCard(
          guardsRef,
          'المرجع الحركي والإخراجي',
          'دخول السيارة الفاخرة · حارسان ببدلات سوداء · مظلة وحقائب · عدسة 85mm',
        )}
      </div>

      {customUploads.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-sm font-semibold text-[#F4F4F5]">الملفات المرفوعة الإضافية</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {customUploads.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111216] px-4 py-3 text-sm"
              >
                <span className="truncate font-semibold text-[#F4F4F5]">{item.labelAr}</span>
                <span className="font-mono-tabular shrink-0 text-xs text-[#A1A1AA]">
                  {item.durationSec.toFixed(1)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
