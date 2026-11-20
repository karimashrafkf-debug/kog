import { Clapperboard, Download, Eye, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  DirectorConfig,
  OutfitStyle,
  RenderRecord,
  ScenePreset,
  VideoJobStatus,
} from '../types/studio';
import {
  OUTFIT_LABELS,
  SCENE_PRESET_LABELS,
  buildVeoPrompt,
} from '../utils/directorPrompt';

interface DirectorWorkspaceProps {
  config: DirectorConfig;
  onChange: (next: DirectorConfig) => void;
  onGenerateVideo: () => Promise<void>;
  onGenerateKeyframe: () => Promise<void>;
  activeJob: VideoJobStatus | null;
  latestVisualRender: RenderRecord | null;
  isGeneratingKeyframe: boolean;
  selectedSoundtrackTitle: string | null;
}

export function DirectorWorkspace({
  config,
  onChange,
  onGenerateVideo,
  onGenerateKeyframe,
  activeJob,
  latestVisualRender,
  isGeneratingKeyframe,
  selectedSoundtrackTitle,
}: DirectorWorkspaceProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  const compiledPrompt = useMemo(() => buildVeoPrompt(config), [config]);

  const isVideoBusy =
    activeJob !== null &&
    activeJob.status !== 'completed' &&
    activeJob.status !== 'failed';

  const sceneEntries = Object.entries(SCENE_PRESET_LABELS) as Array<
    [ScenePreset, (typeof SCENE_PRESET_LABELS)[ScenePreset]]
  >;
  const outfitEntries = Object.entries(OUTFIT_LABELS) as Array<
    [OutfitStyle, (typeof OUTFIT_LABELS)[OutfitStyle]]
  >;

  return (
    <section id="director" className="border-b border-white/10 py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#F4F4F5]">02. إخراج مشهد الحراس لشخصية KO</h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          توجيه حركة الكاميرا والإطلالة لوضع شخصية KO وسط الحراس الشخصيين مع المزامنة التلقائية للإيقاع.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        {/* Controls Column */}
        <div className="flex flex-col justify-between gap-6 rounded-xl border border-white/10 bg-[#111216] p-6 lg:col-span-7">
          <div className="flex flex-col gap-6">
            {/* Scene Presets */}
            <div>
              <p className="mb-2.5 text-sm font-bold text-[#F4F4F5]">تكوين المشهد والحركة</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {sceneEntries.map(([key, meta]) => {
                  const active = config.scenePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChange({ ...config, scenePreset: key })}
                      className={`flex flex-col items-start rounded-lg border p-3.5 text-right transition-colors duration-150 ${
                        active
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#F4F4F5]'
                          : 'border-white/10 bg-[#18191F] text-[#A1A1AA] hover:border-white/25 hover:text-[#F4F4F5]'
                      }`}
                    >
                      <span className="text-sm font-bold text-[#F4F4F5]">{meta.titleAr}</span>
                      <span className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                        {meta.subtitleAr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outfit Style */}
            <div>
              <p className="mb-2.5 text-sm font-bold text-[#F4F4F5]">أسلوب الإطلالة وتطابق الشخصية</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {outfitEntries.map(([key, meta]) => {
                  const active = config.outfitStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChange({ ...config, outfitStyle: key })}
                      className={`flex flex-col items-start rounded-lg border p-3 text-right transition-colors duration-150 ${
                        active
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#F4F4F5]'
                          : 'border-white/10 bg-[#18191F] text-[#A1A1AA] hover:border-white/25 hover:text-[#F4F4F5]'
                      }`}
                    >
                      <span className="text-xs font-bold text-[#F4F4F5]">{meta.titleAr}</span>
                      <span className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">
                        {meta.descriptionAr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration, Resolution & Toggles */}
            <div className="grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-[#A1A1AA]">مدة المقطع</p>
                <div className="inline-flex rounded-lg border border-white/10 bg-[#18191F] p-1">
                  {(['10s', '15s'] as const).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => onChange({ ...config, duration: dur })}
                      className={`font-mono-tabular whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                        config.duration === dur
                          ? 'bg-[#D4AF37] text-[#09090B]'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-[#A1A1AA]">دقة الإخراج</p>
                <div className="inline-flex rounded-lg border border-white/10 bg-[#18191F] p-1">
                  {(['720p', '1080p'] as const).map((resOpt) => (
                    <button
                      key={resOpt}
                      type="button"
                      onClick={() => onChange({ ...config, resolution: resOpt })}
                      className={`font-mono-tabular whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                        config.resolution === resOpt
                          ? 'bg-[#D4AF37] text-[#09090B]'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {resOpt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#18191F] px-3 py-2.5 text-xs font-semibold text-[#F4F4F5]">
                <input
                  type="checkbox"
                  checked={config.includeUmbrellaAndBags}
                  onChange={(e) =>
                    onChange({ ...config, includeUmbrellaAndBags: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#D4AF37]"
                />
                <span>مظلة وحقائب فاخرة</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#18191F] px-3 py-2.5 text-xs font-semibold text-[#F4F4F5]">
                <input
                  type="checkbox"
                  checked={config.includeBystanders}
                  onChange={(e) =>
                    onChange({ ...config, includeBystanders: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#D4AF37]"
                />
                <span>المارة وتصوير الهواتف</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-[#18191F] px-3 py-2.5 text-xs font-semibold text-[#F4F4F5]">
                <input
                  type="checkbox"
                  checked={config.syncOriginalBeat}
                  onChange={(e) =>
                    onChange({ ...config, syncOriginalBeat: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#D4AF37]"
                />
                <span>
                  دمج الصوت ({selectedSoundtrackTitle ? 'المختار' : 'إيقاع KO'})
                </span>
              </label>
            </div>

            <div>
              <label
                htmlFor="director-custom-notes"
                className="mb-1.5 block text-xs font-semibold text-[#A1A1AA]"
              >
                ملاحظات إخراجية إضافية (اختياري)
              </label>
              <textarea
                id="director-custom-notes"
                rows={2}
                value={config.customNotes}
                onChange={(e) => onChange({ ...config, customNotes: e.target.value })}
                placeholder="مثال: إضاءة غروب ذهبية، تركيز على النظارة والوشوم عند النزول من السيارة..."
                className="w-full rounded-lg border border-white/10 bg-[#18191F] px-3.5 py-2.5 text-sm text-[#F4F4F5] placeholder:text-[#71717A] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowPrompt((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{showPrompt ? 'إخفاء السيناريو الإخراجي التقني' : 'عرض السيناريو الإخراجي التقني'}</span>
              </button>
              {showPrompt && (
                <p
                  dir="ltr"
                  className="mt-2 rounded-lg border border-white/10 bg-[#09090B] p-3 font-mono text-xs leading-relaxed text-[#A1A1AA]"
                >
                  {compiledPrompt}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => void onGenerateVideo()}
              disabled={isVideoBusy}
              className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#09090B] transition-colors hover:bg-[#E5C158] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVideoBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clapperboard className="h-4 w-4" />
              )}
              <span>
                {isVideoBusy ? 'جاري إنتاج الفيديو...' : 'إنتاج فيديو الحراس بالذكاء الاصطناعي'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void onGenerateKeyframe()}
              disabled={isGeneratingKeyframe || isVideoBusy}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-white/15 bg-[#18191F] px-4 py-3 text-sm font-semibold text-[#F4F4F5] transition-colors hover:border-white/30 hover:bg-[#20222A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingKeyframe ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              ) : (
                <ImageIcon className="h-4 w-4 text-[#D4AF37]" />
              )}
              <span>توليد لقطة معاينة ثابتة</span>
            </button>
          </div>
        </div>

        {/* 9:16 Cinema Preview Stage */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#111216] p-6 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[#F4F4F5]">شاشة العرض السينمائية (9:16)</h3>
            <span className="font-mono-tabular text-xs text-[#A1A1AA]">
              {config.resolution} · {config.duration}
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-[300px] flex-1 flex-col justify-center">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-white/15 bg-[#09090B]">
              {isVideoBusy && activeJob ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
                  <Loader2 className="h-9 w-9 animate-spin text-[#D4AF37]" />
                  <div>
                    <p className="text-sm font-bold text-[#F4F4F5]">{activeJob.stageLabelAr}</p>
                    <p className="font-mono-tabular mt-1 text-xs text-[#A1A1AA]">
                      {activeJob.progressPct}% · {activeJob.elapsedSec}s
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-[#D4AF37] transition-all duration-300"
                      style={{ width: `${activeJob.progressPct}%` }}
                    />
                  </div>
                </div>
              ) : latestVisualRender ? (
                latestVisualRender.kind === 'keyframe' ? (
                  <img
                    src={latestVisualRender.url}
                    alt={latestVisualRender.titleAr}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    key={latestVisualRender.url}
                    src={latestVisualRender.url}
                    controls
                    playsInline
                    className="h-full w-full object-contain bg-black"
                  />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <Film className="h-8 w-8 text-[#D4AF37]" />
                  <p className="text-sm font-bold text-[#F4F4F5]">جاهز للإخراج والإنتاج</p>
                  <p className="text-xs leading-relaxed text-[#A1A1AA]">
                    اضغط على «توليد لقطة معاينة ثابتة» لاختبار التطابق فوراً، أو «إنتاج فيديو الحراس» لإخراج الفيديو الكامل بالصوت المُحسّن.
                  </p>
                </div>
              )}
            </div>
          </div>

          {latestVisualRender && !isVideoBusy && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#F4F4F5]">
                  {latestVisualRender.titleAr}
                </p>
                <p className="font-mono-tabular text-xs text-[#A1A1AA]">
                  {latestVisualRender.resolution || '9:16'}
                  {latestVisualRender.durationSec ? ` · ${latestVisualRender.durationSec.toFixed(1)}s` : ''}
                </p>
              </div>
              <a
                href={latestVisualRender.url}
                download
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#D4AF37] px-3.5 py-2 text-xs font-bold text-[#09090B] hover:bg-[#E5C158]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تنزيل</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
