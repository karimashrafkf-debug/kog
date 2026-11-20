import { AlertCircle, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AudioStudio } from './components/AudioStudio';
import { DirectorWorkspace } from './components/DirectorWorkspace';
import { ReferenceDeck } from './components/ReferenceDeck';
import { RendersGallery } from './components/RendersGallery';
import { TopBar } from './components/TopBar';
import type {
  AudioMasterConfig,
  DirectorConfig,
  RenderRecord,
  SoundtrackSuggestion,
  StudioAssetItem,
  VideoJobStatus,
} from './types/studio';

export default function App() {
  const [assets, setAssets] = useState<StudioAssetItem[]>([]);
  const [renders, setRenders] = useState<RenderRecord[]>([]);
  const [suggestions, setSuggestions] = useState<SoundtrackSuggestion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [directorConfig, setDirectorConfig] = useState<DirectorConfig>({
    scenePreset: 'full-vip-entry',
    outfitStyle: 'hybrid-vip',
    duration: '15s',
    resolution: '1080p',
    includeBystanders: true,
    includeUmbrellaAndBags: true,
    syncOriginalBeat: true,
    customNotes: '',
  });

  const [audioConfig, setAudioConfig] = useState<AudioMasterConfig>({
    targetVideoId: 'ko_source',
    preset: 'vip-bass-punch',
    noiseReductionDb: 25,
    targetLufs: -14,
    originalAudioMix: 65,
    soundtrackMix: 80,
    soundtrackUrl: '/assets/studio/ko_beat.mp3',
  });

  const [activeJob, setActiveJob] = useState<VideoJobStatus | null>(null);
  const [isGeneratingKeyframe, setIsGeneratingKeyframe] = useState(false);
  const [isMastering, setIsMastering] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [generatingSoundtrackId, setGeneratingSoundtrackId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadStudioState = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/assets');
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'تعذر تحميل بيانات الاستوديو');
      }
      const data = (await res.json()) as {
        assets: StudioAssetItem[];
        renders: RenderRecord[];
        suggestions: SoundtrackSuggestion[];
      };
      setAssets(data.assets);
      setRenders(data.renders);
      setSuggestions(data.suggestions);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void loadStudioState();
  }, [loadStudioState]);

  // Poll active video generation job
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === 'completed' || activeJob.status === 'failed') return;

    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJob.id}`);
        if (!res.ok) return;
        const nextJob = (await res.json()) as VideoJobStatus;
        setActiveJob(nextJob);

        if (nextJob.status === 'completed' && nextJob.render) {
          setRenders((prev) => [nextJob.render!, ...prev.filter((r) => r.id !== nextJob.render!.id)]);
          setAudioConfig((prev) => ({ ...prev, targetVideoId: nextJob.render!.id }));
        } else if (nextJob.status === 'failed' && nextJob.error) {
          setErrorMsg(nextJob.error);
        }
      } catch {
        // Retry on next interval
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [activeJob]);

  const handleGenerateVideo = async () => {
    setErrorMsg(null);
    document.getElementById('director')?.scrollIntoView({ behavior: 'smooth' });
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...directorConfig,
          soundtrackUrl: directorConfig.syncOriginalBeat ? audioConfig.soundtrackUrl : null,
          audioPreset: audioConfig.preset,
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error || 'تعذر بدء إنتاج الفيديو');
      }
      setActiveJob({
        id: data.jobId,
        status: 'uploading_references',
        stageLabelAr: 'جاري تجهيز ورفع لقطات شخصية KO ومرجع الحراس...',
        progressPct: 10,
        elapsedSec: 0,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerateKeyframe = async () => {
    setErrorMsg(null);
    setIsGeneratingKeyframe(true);
    try {
      const res = await fetch('/api/video/generate-keyframes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directorConfig),
      });
      const data = (await res.json()) as { render?: RenderRecord; error?: string };
      if (!res.ok || !data.render) {
        throw new Error(data.error || 'تعذر توليد لقطة المعاينة');
      }
      setRenders((prev) => [data.render!, ...prev]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingKeyframe(false);
    }
  };

  const handleRunMastering = async () => {
    setErrorMsg(null);
    setIsMastering(true);
    try {
      const res = await fetch('/api/audio/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audioConfig),
      });
      const data = (await res.json()) as { render?: RenderRecord; error?: string };
      if (!res.ok || !data.render) {
        throw new Error(data.error || 'فشلت معالجة الصوت');
      }
      setRenders((prev) => [data.render!, ...prev]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMastering(false);
    }
  };

  const handleSuggestSoundtracks = async () => {
    setErrorMsg(null);
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/audio/suggest-soundtracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directorConfig),
      });
      const data = (await res.json()) as {
        suggestions?: SoundtrackSuggestion[];
        error?: string;
      };
      if (!res.ok || !data.suggestions) {
        throw new Error(data.error || 'تعذر اقتراح الموسيقى');
      }
      setSuggestions(data.suggestions);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerateSoundtrack = async (suggestion: SoundtrackSuggestion) => {
    setErrorMsg(null);
    setGeneratingSoundtrackId(suggestion.id);
    try {
      const res = await fetch('/api/audio/generate-soundtrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleAr: suggestion.titleAr,
          lyriaPrompt: suggestion.lyriaPrompt,
        }),
      });
      const data = (await res.json()) as { render?: RenderRecord; error?: string };
      if (!res.ok || !data.render) {
        throw new Error(data.error || 'تعذر توليد الموسيقى التصويرية');
      }
      setRenders((prev) => [data.render!, ...prev]);
      setAudioConfig((prev) => ({ ...prev, soundtrackUrl: data.render!.url }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingSoundtrackId(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    setErrorMsg(null);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = (await res.json()) as { asset?: StudioAssetItem; error?: string };
      if (!res.ok || !data.asset) {
        throw new Error(data.error || 'فشل رفع الملف');
      }
      setAssets((prev) => [...prev, data.asset!]);
      if (data.asset.role === 'audio-beat') {
        setAudioConfig((prev) => ({ ...prev, soundtrackUrl: data.asset!.url }));
      } else {
        setAudioConfig((prev) => ({ ...prev, targetVideoId: data.asset!.id }));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRender = async (id: string) => {
    try {
      const res = await fetch(`/api/renders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRenders((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // Ignore transient delete error
    }
  };

  const latestVisualRender =
    renders.find((r) => r.kind === 'ai-video' || r.kind === 'keyframe') ?? null;
  const latestMasterRender =
    renders.find((r) => r.kind === 'audio-master') ?? null;

  const isVideoBusy =
    activeJob !== null &&
    activeJob.status !== 'completed' &&
    activeJob.status !== 'failed';

  const selectedSoundtrackTitle =
    renders.find((r) => r.url === audioConfig.soundtrackUrl)?.titleAr ??
    (audioConfig.soundtrackUrl ? 'إيقاع KO' : null);

  return (
    <div id="top" className="min-h-screen bg-[#09090B] text-[#F4F4F5]">
      <TopBar onStartGenerate={() => void handleGenerateVideo()} isGenerating={isVideoBusy} />

      <main className="mx-auto max-w-[1360px] px-6 pb-20 pt-8">
        {/* Hero Header */}
        <section className="border-b border-white/10 pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-[#D4AF37]">
              استوديو الإنتاج السينمائي والماستر الصوتي
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#F4F4F5] sm:text-4xl [text-wrap:balance]">
              تحويل فيديو KO إلى مشهد دخول VIP مع الحراس الشخصيين وصوت سينمائي نقي
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#A1A1AA]">
              يجمع هذا الاستوديو بين إخراج الفيديو بالذكاء الاصطناعي للحفاظ على ملامح ووشوم شخصية KO ضمن موكب الحراس الشخصيين، وبين معالجة الصوت لإزالة الضوضاء وضبط التوازن ودمج موسيقى تصويرية احترافية.
            </p>
          </div>
        </section>

        {errorMsg && (
          <div
            role="alert"
            className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="إغلاق التنبيه"
              className="shrink-0 rounded p-1 text-red-300 hover:bg-red-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <ReferenceDeck
          assets={assets}
          onUploadFile={handleUploadFile}
          isUploading={isUploading}
        />

        <DirectorWorkspace
          config={directorConfig}
          onChange={setDirectorConfig}
          onGenerateVideo={handleGenerateVideo}
          onGenerateKeyframe={handleGenerateKeyframe}
          activeJob={activeJob}
          latestVisualRender={latestVisualRender}
          isGeneratingKeyframe={isGeneratingKeyframe}
          selectedSoundtrackTitle={selectedSoundtrackTitle}
        />

        <AudioStudio
          assets={assets}
          renders={renders}
          audioConfig={audioConfig}
          onChangeAudioConfig={setAudioConfig}
          onRunMastering={handleRunMastering}
          isMastering={isMastering}
          latestMasterRender={latestMasterRender}
          suggestions={suggestions}
          onSuggestSoundtracks={handleSuggestSoundtracks}
          isSuggesting={isSuggesting}
          onGenerateSoundtrack={handleGenerateSoundtrack}
          generatingSoundtrackId={generatingSoundtrackId}
        />

        <RendersGallery
          renders={renders}
          onUseAsSoundtrack={(url) => {
            setAudioConfig((prev) => ({ ...prev, soundtrackUrl: url }));
            document.getElementById('audio-studio')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onSelectForMastering={(id) => {
            setAudioConfig((prev) => ({ ...prev, targetVideoId: id }));
            document.getElementById('audio-studio')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onDeleteRender={handleDeleteRender}
        />
      </main>
    </div>
  );
}
