import { AudioWaveform, Check, Download, Loader2, Music, Sparkles, Sliders } from 'lucide-react';
import type {
  AudioMasterConfig,
  AudioMasteringPreset,
  RenderRecord,
  SoundtrackSuggestion,
  StudioAssetItem,
} from '../types/studio';
import { AUDIO_PRESET_LABELS } from '../utils/directorPrompt';

interface AudioStudioProps {
  assets: StudioAssetItem[];
  renders: RenderRecord[];
  audioConfig: AudioMasterConfig;
  onChangeAudioConfig: (next: AudioMasterConfig) => void;
  onRunMastering: () => Promise<void>;
  isMastering: boolean;
  latestMasterRender: RenderRecord | null;
  suggestions: SoundtrackSuggestion[];
  onSuggestSoundtracks: () => Promise<void>;
  isSuggesting: boolean;
  onGenerateSoundtrack: (suggestion: SoundtrackSuggestion) => Promise<void>;
  generatingSoundtrackId: string | null;
}

export function AudioStudio({
  assets,
  renders,
  audioConfig,
  onChangeAudioConfig,
  onRunMastering,
  isMastering,
  latestMasterRender,
  suggestions,
  onSuggestSoundtracks,
  isSuggesting,
  onGenerateSoundtrack,
  generatingSoundtrackId,
}: AudioStudioProps) {
  const videoTargets = [
    ...assets
      .filter((a) => a.role !== 'audio-beat')
      .map((a) => ({ id: a.id, labelAr: a.labelAr })),
    ...renders
      .filter((r) => r.kind === 'ai-video' || r.kind === 'audio-master')
      .map((r) => ({ id: r.id, labelAr: r.titleAr })),
  ];

  const availableSoundtracks: Array<{ url: string; labelAr: string }> = [
    { url: '/assets/studio/ko_beat.mp3', labelAr: 'الإيقاع الأصلي المستخرج من فيديو KO' },
    ...renders
      .filter((r) => r.kind === 'soundtrack')
      .map((r) => ({ url: r.url, labelAr: r.titleAr })),
    ...assets
      .filter((a) => a.role === 'audio-beat' && a.id !== 'ko_beat')
      .map((a) => ({ url: a.url, labelAr: a.labelAr })),
  ];

  const presetEntries = Object.entries(AUDIO_PRESET_LABELS) as Array<
    [AudioMasteringPreset, (typeof AUDIO_PRESET_LABELS)[AudioMasteringPreset]]
  >;

  return (
    <section id="audio-studio" className="border-b border-white/10 py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#F4F4F5]">
          03. تحسين جودة الصوت والموسيقى التصويرية
        </h2>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          إزالة الضوضاء الخلفية عبر المرشحات الطيفية، موازنة مستويات الصوت إلى معيار البث (-14 LUFS)، واقتراح وتوليد موسيقى تصويرية مناسبة.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* FFmpeg Audio Restoration & Mastering */}
        <div className="flex flex-col justify-between gap-6 rounded-xl border border-white/10 bg-[#111216] p-6 lg:col-span-7">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-5 w-5 text-[#D4AF37]" />
              <h3 className="text-lg font-bold text-[#F4F4F5]">تنقية وضبط مستويات الصوت</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="master-target-video"
                  className="mb-1.5 block text-xs font-semibold text-[#A1A1AA]"
                >
                  الفيديو المستهدف للمعالجة
                </label>
                <select
                  id="master-target-video"
                  value={audioConfig.targetVideoId}
                  onChange={(e) =>
                    onChangeAudioConfig({ ...audioConfig, targetVideoId: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#18191F] px-3 py-2.5 text-sm text-[#F4F4F5] focus:border-[#D4AF37] focus:outline-none"
                >
                  {videoTargets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.labelAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="master-soundtrack-select"
                  className="mb-1.5 block text-xs font-semibold text-[#A1A1AA]"
                >
                  الموسيقى التصويرية المدمجة
                </label>
                <select
                  id="master-soundtrack-select"
                  value={audioConfig.soundtrackUrl ?? ''}
                  onChange={(e) =>
                    onChangeAudioConfig({
                      ...audioConfig,
                      soundtrackUrl: e.target.value ? e.target.value : null,
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#18191F] px-3 py-2.5 text-sm text-[#F4F4F5] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="">بدون موسيقى إضافية (تنقية الصوت الأصلي فقط)</option>
                  {availableSoundtracks.map((s) => (
                    <option key={s.url} value={s.url}>
                      {s.labelAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-[#A1A1AA]">ملف المعالجة الصوتية</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {presetEntries.map(([key, meta]) => {
                  const active = audioConfig.preset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChangeAudioConfig({ ...audioConfig, preset: key })}
                      className={`flex flex-col items-start rounded-lg border p-3 text-right transition-colors ${
                        active
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#F4F4F5]'
                          : 'border-white/10 bg-[#18191F] text-[#A1A1AA] hover:border-white/25'
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

            <div className="grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label htmlFor="noise-slider" className="font-semibold text-[#A1A1AA]">
                    شدة إزالة الضوضاء (Noise Floor)
                  </label>
                  <span dir="ltr" className="font-mono-tabular font-semibold text-[#F4F4F5]">
                    -{audioConfig.noiseReductionDb} dB
                  </span>
                </div>
                <input
                  id="noise-slider"
                  type="range"
                  min={10}
                  max={40}
                  step={1}
                  value={audioConfig.noiseReductionDb}
                  onChange={(e) =>
                    onChangeAudioConfig({
                      ...audioConfig,
                      noiseReductionDb: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label htmlFor="lufs-slider" className="font-semibold text-[#A1A1AA]">
                    مستوى الصوت المستهدف (Loudness)
                  </label>
                  <span dir="ltr" className="font-mono-tabular font-semibold text-[#F4F4F5]">
                    {audioConfig.targetLufs} LUFS
                  </span>
                </div>
                <input
                  id="lufs-slider"
                  type="range"
                  min={-18}
                  max={-10}
                  step={1}
                  value={audioConfig.targetLufs}
                  onChange={(e) =>
                    onChangeAudioConfig({
                      ...audioConfig,
                      targetLufs: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label htmlFor="orig-mix-slider" className="font-semibold text-[#A1A1AA]">
                    مستوى الصوت الأصلي بعد التنقية
                  </label>
                  <span dir="ltr" className="font-mono-tabular font-semibold text-[#F4F4F5]">
                    {audioConfig.originalAudioMix}%
                  </span>
                </div>
                <input
                  id="orig-mix-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={audioConfig.originalAudioMix}
                  onChange={(e) =>
                    onChangeAudioConfig({
                      ...audioConfig,
                      originalAudioMix: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label htmlFor="bgm-mix-slider" className="font-semibold text-[#A1A1AA]">
                    مستوى الموسيقى التصويرية
                  </label>
                  <span dir="ltr" className="font-mono-tabular font-semibold text-[#F4F4F5]">
                    {audioConfig.soundtrackMix}%
                  </span>
                </div>
                <input
                  id="bgm-mix-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={audioConfig.soundtrackMix}
                  onChange={(e) =>
                    onChangeAudioConfig({
                      ...audioConfig,
                      soundtrackMix: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>
            </div>

            {latestMasterRender && (
              <div className="rounded-lg border border-white/10 bg-[#18191F] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#F4F4F5]">
                      نتيجة المعالجة الصوتية الأخيرة
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                      <span>قبل:</span>
                      <span dir="ltr" className="font-mono-tabular text-[#F4F4F5]">
                        {latestMasterRender.beforeMetrics?.meanVolumeDb ?? '--'} dB
                      </span>
                      <span aria-hidden="true">←</span>
                      <span>بعد:</span>
                      <span dir="ltr" className="font-mono-tabular font-semibold text-[#D4AF37]">
                        {latestMasterRender.afterMetrics?.meanVolumeDb ?? '--'} dB
                      </span>
                    </div>
                  </div>
                  <a
                    href={latestMasterRender.url}
                    download
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-[#111216] px-3 py-1.5 text-xs font-bold text-[#F4F4F5] hover:border-[#D4AF37]"
                  >
                    <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>تنزيل النسخة المُحسّنة</span>
                  </a>
                </div>
                <div className="mx-auto aspect-[9/16] max-h-[280px] overflow-hidden rounded-lg border border-white/10 bg-black">
                  <video
                    key={latestMasterRender.url}
                    src={latestMasterRender.url}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => void onRunMastering()}
              disabled={isMastering}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#09090B] transition-colors hover:bg-[#E5C158] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMastering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AudioWaveform className="h-4 w-4" />
              )}
              <span>{isMastering ? 'جاري تنقية وموازنة الصوت...' : 'تطبيق التنقية ودمج الموسيقى الآن'}</span>
            </button>
          </div>
        </div>

        {/* AI Soundtrack Suggestions + Lyria Generator */}
        <div className="flex flex-col justify-between gap-5 rounded-xl border border-white/10 bg-[#111216] p-6 lg:col-span-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-[#D4AF37]" />
                <h3 className="text-lg font-bold text-[#F4F4F5]">اقتراح وتوليد موسيقى تصويرية</h3>
              </div>

              <button
                type="button"
                onClick={() => void onSuggestSoundtracks()}
                disabled={isSuggesting}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-[#18191F] px-3 py-1.5 text-xs font-semibold text-[#F4F4F5] hover:border-white/30 disabled:opacity-60"
              >
                {isSuggesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                )}
                <span>اقتراحات ذكية</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {suggestions.map((item) => {
                const isGeneratingThis = generatingSoundtrackId === item.id;
                const matchingRender = renders.find(
                  (r) =>
                    r.kind === 'soundtrack' &&
                    r.promptSummary === item.lyriaPrompt.trim(),
                );
                const isSelected =
                  matchingRender && audioConfig.soundtrackUrl === matchingRender.url;

                return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-2.5 rounded-lg border border-white/10 bg-[#18191F] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#F4F4F5]">{item.titleAr}</h4>
                      <span className="font-mono-tabular shrink-0 text-xs text-[#A1A1AA]">
                        {item.bpm} BPM
                      </span>
                    </div>

                    <p className="text-xs text-[#D4AF37]">
                      {item.genreAr}
                    </p>
                    <p className="text-xs leading-relaxed text-[#A1A1AA]">{item.moodAr}</p>
                    <p className="text-xs text-[#71717A]">نصيحة المزج: {item.mixingTipAr}</p>

                    {matchingRender ? (
                      <div className="mt-1 flex flex-col gap-2 border-t border-white/10 pt-2.5">
                        <audio src={matchingRender.url} controls className="h-9 w-full" />
                        <button
                          type="button"
                          onClick={() =>
                            onChangeAudioConfig({
                              ...audioConfig,
                              soundtrackUrl: matchingRender.url,
                            })
                          }
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-[#D4AF37] text-[#09090B]'
                              : 'border border-white/15 bg-[#111216] text-[#F4F4F5] hover:border-white/30'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{isSelected ? 'معتمدة للدمج الآن' : 'اعتماد هذه الموسيقى'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2 border-t border-white/10 pt-2.5">
                        <button
                          type="button"
                          onClick={() => void onGenerateSoundtrack(item)}
                          disabled={generatingSoundtrackId !== null}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-2 text-xs font-bold text-[#F4F4F5] transition-colors hover:bg-[#D4AF37]/20 disabled:opacity-60"
                        >
                          {isGeneratingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" />
                          ) : (
                            <Music className="h-3.5 w-3.5 text-[#D4AF37]" />
                          )}
                          <span>
                            {isGeneratingThis ? 'جاري التأليف...' : 'توليد المقطع عبر Lyria'}
                          </span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#18191F] p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#F4F4F5]">الإيقاع الأصلي المستخرج (KO Beat)</span>
              <button
                type="button"
                onClick={() =>
                  onChangeAudioConfig({
                    ...audioConfig,
                    soundtrackUrl: '/assets/studio/ko_beat.mp3',
                  })
                }
                className="font-semibold text-[#D4AF37] hover:underline"
              >
                اعتماد للدمج
              </button>
            </div>
            <audio src="/assets/studio/ko_beat.mp3" controls className="h-9 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
