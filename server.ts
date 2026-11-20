import { GoogleGenAI, Type } from '@google/genai';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import type {
  AudioMasterConfig,
  AudioMetrics,
  DirectorConfig,
  RenderRecord,
  SoundtrackSuggestion,
  StudioAssetItem,
  VideoJobStatus,
} from './src/types/studio.ts';
import {
  buildFfmpegAudioFilter,
  buildKeyframePrompt,
  buildVeoPrompt,
  validateAudioMasterConfig,
  validateDirectorConfig,
} from './src/utils/directorPrompt.ts';

dotenv.config();

const execFileAsync = promisify(execFile);

const PORT = 3000;
const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const STUDIO_ASSETS_DIR = path.join(PUBLIC_DIR, 'assets', 'studio');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'assets', 'uploads');
const RENDERS_DIR = path.join(PUBLIC_DIR, 'renders');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'studio-history.json');

for (const dir of [UPLOADS_DIR, RENDERS_DIR, DATA_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

interface StudioHistoryStore {
  renders: RenderRecord[];
  uploads: StudioAssetItem[];
  suggestions: SoundtrackSuggestion[];
}

const DEFAULT_SUGGESTIONS: SoundtrackSuggestion[] = [
  {
    id: 'vip-trap-cinema',
    titleAr: 'فخامة VIP — باص عميق وإيقاع بطيء',
    genreAr: 'Luxury Trap / Cinema Phonk',
    bpm: 94,
    moodAr: 'هيبة، ثقة مطلقة، وتناغم مثالي مع المشي البطيء والحراس الشخصيين',
    mixingTipAr: 'اخفض الصوت الأصلي إلى 25% وارفع الموسيقى إلى 85% مع تنقية -14 LUFS',
    lyriaPrompt:
      'Ultra-luxury dark cinematic trap beat at 94 BPM, deep sub-bass 808s, crisp minimalist hi-hats, moody dark brass stabs, high-fashion runway VIP swagger atmosphere, clean studio master.',
  },
  {
    id: 'dark-orchestral-walk',
    titleAr: 'موكب القوة — أوركسترا داكنة وحديثة',
    genreAr: 'Modern Dark Orchestral',
    bpm: 88,
    moodAr: 'دراما سينمائية فاخرة مع أوتار عميقة وإيقاع مهيب لحظة الخروج من السيارة',
    mixingTipAr: 'حافظ على الصوت الأصلي عند 40% لإبراز خطوات المشي وأبواب السيارة',
    lyriaPrompt:
      'Sleek modern dark orchestral cinema score at 88 BPM, low cello ostinato, warm analog synth bass, subtle heavy percussion hits, prestigious billionaire arrival mood, polished studio mix.',
  },
  {
    id: 'night-runway-house',
    titleAr: 'إيقاع الشارع الفاخر — ديب هاوس أنيق',
    genreAr: 'Editorial Deep House',
    bpm: 118,
    moodAr: 'أجواء عروض الأزياء والماركات العالمية مع إيقاع سلس ونظيف',
    mixingTipAr: 'استخدم إعداد تنقية سينمائية متوازنة لمزج صوت الشارع بنعومة',
    lyriaPrompt:
      'Sophisticated upscale fashion runway deep house track at 118 BPM, warm analog bassline, crisp atmospheric plucks, clean minimal groove, luxury boutique street walk vibe.',
  },
];

function readHistory(): StudioHistoryStore {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StudioHistoryStore>;
      return {
        renders: Array.isArray(parsed.renders) ? parsed.renders : [],
        uploads: Array.isArray(parsed.uploads) ? parsed.uploads : [],
        suggestions:
          Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
            ? parsed.suggestions
            : DEFAULT_SUGGESTIONS,
      };
    }
  } catch (err) {
    console.warn('Failed to read studio history, initializing clean store:', err);
  }
  return {
    renders: [],
    uploads: [],
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

function writeHistory(store: StudioHistoryStore): void {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('مفتاح GEMINI_API_KEY غير مضبوط في البيئة. يرجى ضبطه من Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiErrorAr(err: unknown): { status: number; message: string } {
  const rawMsg = err instanceof Error ? err.message : String(err);
  const lower = rawMsg.toLowerCase();

  if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('api key')) {
    return {
      status: 403,
      message:
        'فشل التحقق من مفتاح API أو الصلاحيات. تأكد من اختيار مفتاح Gemini API صالح ومفعل للفوترة من Settings > Secrets.',
    };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'تم تجاوز حد الاستخدام (Quota) أو أن النموذج يتطلب مفتاحاً مدفوعاً. يرجى اختيار مفتاح مرتبط بحساب فوترة في Settings > Secrets.',
    };
  }
  if (lower.includes('404') || lower.includes('not_found')) {
    return {
      status: 404,
      message: `النموذج أو المورد المطلوب غير متاح حالياً: ${rawMsg}`,
    };
  }
  return {
    status: 500,
    message: `حدث خطأ أثناء المعالجة: ${rawMsg}`,
  };
}

function resolveAssetDiskPath(urlPath: string): string | null {
  if (!urlPath || typeof urlPath !== 'string') return null;
  const normalized = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  const candidate = path.resolve(PUBLIC_DIR, normalized);
  if (!candidate.startsWith(PUBLIC_DIR)) return null;
  return fs.existsSync(candidate) ? candidate : null;
}

async function analyzeMediaAudio(filePath: string): Promise<AudioMetrics> {
  const metrics: AudioMetrics = {
    durationSec: 0,
    meanVolumeDb: null,
    maxVolumeDb: null,
    sampleRate: null,
    channels: null,
    codec: null,
  };

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-show_entries',
      'stream=codec_type,codec_name,sample_rate,channels',
      '-of',
      'json',
      filePath,
    ]);
    const info = JSON.parse(stdout) as {
      format?: { duration?: string };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        sample_rate?: string;
        channels?: number;
      }>;
    };
    metrics.durationSec = Number(Number(info.format?.duration || 0).toFixed(2));
    const audioStream = info.streams?.find((s) => s.codec_type === 'audio');
    if (audioStream) {
      metrics.codec = audioStream.codec_name ?? null;
      metrics.sampleRate = audioStream.sample_rate ? Number(audioStream.sample_rate) : null;
      metrics.channels = typeof audioStream.channels === 'number' ? audioStream.channels : null;
    }

    if (audioStream) {
      const volRes = await execFileAsync(
        'ffmpeg',
        ['-i', filePath, '-af', 'volumedetect', '-vn', '-f', 'null', '-'],
        { maxBuffer: 4 * 1024 * 1024 },
      );
      const stderr = volRes.stderr || '';
      const meanMatch = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/);
      const maxMatch = stderr.match(/max_volume:\s*([-\d.]+)\s*dB/);
      if (meanMatch) metrics.meanVolumeDb = Number(meanMatch[1]);
      if (maxMatch) metrics.maxVolumeDb = Number(maxMatch[1]);
    }
  } catch (err) {
    console.warn('Audio analysis warning for', filePath, err);
  }

  return metrics;
}

async function hasAudioStream(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=codec_type',
      '-of',
      'csv=p=0',
      filePath,
    ]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function masterVideoWithFfmpeg(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  audioConfig: AudioMasterConfig;
  soundtrackDiskPath: string | null;
}): Promise<{ beforeMetrics: AudioMetrics; afterMetrics: AudioMetrics }> {
  const { inputVideoPath, outputVideoPath, audioConfig, soundtrackDiskPath } = params;
  const beforeMetrics = await analyzeMediaAudio(inputVideoPath);
  const videoHasAudio = await hasAudioStream(inputVideoPath);
  const { filterChain } = buildFfmpegAudioFilter(audioConfig);

  const origVol = Math.max(0, Math.min(1.5, audioConfig.originalAudioMix / 100));
  const musicVol = Math.max(0, Math.min(1.5, audioConfig.soundtrackMix / 100));
  const durationSec = Math.max(1, beforeMetrics.durationSec || 10);
  const fadeStart = Math.max(0, durationSec - 1.2);

  const args: string[] = ['-y', '-i', inputVideoPath];

  if (soundtrackDiskPath && musicVol > 0) {
    args.push('-stream_loop', '-1', '-i', soundtrackDiskPath);

    if (videoHasAudio && origVol > 0) {
      const filterComplex = [
        `[0:a]${filterChain},volume=${origVol.toFixed(2)}[orig]`,
        `[1:a]atrim=0:${durationSec.toFixed(2)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeStart.toFixed(2)}:d=1.1,volume=${musicVol.toFixed(2)}[bgm]`,
        `[orig][bgm]amix=inputs=2:duration=first:dropout_transition=2,loudnorm=I=${audioConfig.targetLufs}:TP=-1.5:LRA=11[aout]`,
      ].join(';');

      args.push(
        '-filter_complex',
        filterComplex,
        '-map',
        '0:v:0',
        '-map',
        '[aout]',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        '-movflags',
        '+faststart',
        outputVideoPath,
      );
    } else {
      const filterComplex = [
        `[1:a]atrim=0:${durationSec.toFixed(2)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeStart.toFixed(2)}:d=1.1,volume=${musicVol.toFixed(2)},loudnorm=I=${audioConfig.targetLufs}:TP=-1.5:LRA=11[aout]`,
      ].join(';');

      args.push(
        '-filter_complex',
        filterComplex,
        '-map',
        '0:v:0',
        '-map',
        '[aout]',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        '-movflags',
        '+faststart',
        outputVideoPath,
      );
    }
  } else if (videoHasAudio) {
    args.push(
      '-map',
      '0:v:0',
      '-map',
      '0:a:0',
      '-c:v',
      'copy',
      '-af',
      `${filterChain},volume=${origVol.toFixed(2)}`,
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputVideoPath,
    );
  } else {
    args.push('-c:v', 'copy', '-movflags', '+faststart', outputVideoPath);
  }

  await execFileAsync('ffmpeg', args, { maxBuffer: 10 * 1024 * 1024 });
  const afterMetrics = await analyzeMediaAudio(outputVideoPath);
  return { beforeMetrics, afterMetrics };
}

function getCoreAssets(): StudioAssetItem[] {
  return [
    {
      id: 'ko_source',
      labelAr: 'فيديو كو الأصلي (KO_41970bae)',
      role: 'character-source',
      url: '/assets/studio/ko_source.mp4',
      durationSec: 28.9,
      width: 720,
      height: 1280,
      frames: [
        '/assets/studio/ko_frame_1.jpg',
        '/assets/studio/ko_frame_2.jpg',
        '/assets/studio/ko_frame_3.jpg',
      ],
    },
    {
      id: 'guards_ref',
      labelAr: 'فيديو الحراس المرجعي (VIP Walk)',
      role: 'style-reference',
      url: '/assets/aistudio/snaptik_7637476510160702727_v3_275d9a3d.mp4',
      durationSec: 45.43,
      width: 576,
      height: 1024,
      frames: [
        '/assets/studio/ref_frame_1.jpg',
        '/assets/studio/ref_frame_2.jpg',
        '/assets/studio/ref_frame_3.jpg',
        '/assets/studio/ref_frame_4.jpg',
      ],
    },
    {
      id: 'ko_beat',
      labelAr: 'المقطع الموسيقي المستخرج من KO',
      role: 'audio-beat',
      url: '/assets/studio/ko_beat.mp3',
      durationSec: 28.9,
      frames: [],
    },
  ];
}

function findVideoPathById(id: string): { path: string; labelAr: string } | null {
  const core = getCoreAssets().find((a) => a.id === id);
  if (core) {
    const p = resolveAssetDiskPath(core.url);
    if (p) return { path: p, labelAr: core.labelAr };
  }
  const history = readHistory();
  const upload = history.uploads.find((u) => u.id === id);
  if (upload) {
    const p = resolveAssetDiskPath(upload.url);
    if (p) return { path: p, labelAr: upload.labelAr };
  }
  const render = history.renders.find((r) => r.id === id);
  if (render) {
    const p = resolveAssetDiskPath(render.url);
    if (p) return { path: p, labelAr: render.titleAr };
  }
  return null;
}

const jobs = new Map<string, VideoJobStatus>();

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 80 * 1024 * 1024 },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.use('/renders', express.static(RENDERS_DIR));
  app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets')));

  app.get('/api/studio/assets', async (_req, res) => {
    try {
      const history = readHistory();
      const coreAssets = await Promise.all(
        getCoreAssets().map(async (asset) => {
          const diskPath = resolveAssetDiskPath(asset.url);
          const metrics = diskPath ? await analyzeMediaAudio(diskPath) : undefined;
          return { ...asset, metrics };
        }),
      );
      res.json({
        assets: [...coreAssets, ...history.uploads],
        renders: history.renders,
        suggestions: history.suggestions,
      });
    } catch (err) {
      const formatted = formatGeminiErrorAr(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/audio/analyze', async (req, res) => {
    try {
      const { targetVideoId } = req.body as { targetVideoId?: string };
      if (!targetVideoId) {
        return res.status(400).json({ error: 'يرجى تحديد معرف الفيديو.' });
      }
      const target = findVideoPathById(targetVideoId);
      if (!target) {
        return res.status(404).json({ error: 'لم يتم العثور على الملف المطلوب.' });
      }
      const metrics = await analyzeMediaAudio(target.path);
      res.json({ targetVideoId, labelAr: target.labelAr, metrics });
    } catch (err) {
      res.status(500).json({ error: `تعذر تحليل الصوت: ${String(err)}` });
    }
  });

  app.post('/api/audio/master', async (req, res) => {
    try {
      const config = req.body as Partial<AudioMasterConfig>;
      const validation = validateAudioMasterConfig(config);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }
      const target = findVideoPathById(config.targetVideoId!);
      if (!target) {
        return res.status(404).json({ error: 'ملف الفيديو المستهدف غير موجود.' });
      }

      const fullConfig: AudioMasterConfig = {
        targetVideoId: config.targetVideoId!,
        preset: config.preset!,
        noiseReductionDb: Number(config.noiseReductionDb ?? 25),
        targetLufs: Number(config.targetLufs ?? -14),
        originalAudioMix: Number(config.originalAudioMix ?? 70),
        soundtrackMix: Number(config.soundtrackMix ?? 75),
        soundtrackUrl: config.soundtrackUrl ?? null,
      };

      const soundtrackDiskPath = fullConfig.soundtrackUrl
        ? resolveAssetDiskPath(fullConfig.soundtrackUrl)
        : null;

      const timestamp = Date.now();
      const outFilename = `mastered_${timestamp}.mp4`;
      const outPath = path.join(RENDERS_DIR, outFilename);

      const { beforeMetrics, afterMetrics } = await masterVideoWithFfmpeg({
        inputVideoPath: target.path,
        outputVideoPath: outPath,
        audioConfig: fullConfig,
        soundtrackDiskPath,
      });

      const render: RenderRecord = {
        id: `master_${timestamp}`,
        kind: 'audio-master',
        titleAr: `صوت مُحسّن: ${target.labelAr}`,
        createdAt: new Date().toISOString(),
        url: `/renders/${outFilename}`,
        durationSec: afterMetrics.durationSec,
        promptSummary: `عزل ضوضاء -${fullConfig.noiseReductionDb}dB · توازن ${fullConfig.targetLufs} LUFS`,
        beforeMetrics,
        afterMetrics,
      };

      const history = readHistory();
      history.renders.unshift(render);
      writeHistory(history);

      res.json({ render });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `فشلت معالجة الصوت عبر FFmpeg: ${msg}` });
    }
  });

  app.post('/api/audio/suggest-soundtracks', async (req, res) => {
    try {
      const { scenePreset, outfitStyle, customNotes } = req.body as Partial<DirectorConfig>;
      const ai = getAiClient();

      const sceneDesc = scenePreset || 'full-vip-entry';
      const outfitDesc = outfitStyle || 'hybrid-vip';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `أنت مهندس صوت ومخرج موسيقي سينمائي محترف.
المستخدم يحول فيديو لشاب عضلي بملامح حادة ووشوم (فيديو KO) إلى مشهد دخول VIP فاخر مع حراس شخصيين ببدلات سوداء ومظلة وحقائب فاخرة وسط نظرات المارة وكاميرات الهواتف (نمط المشهد: ${sceneDesc}، الإطلالة: ${outfitDesc}${customNotes ? `، ملاحظات: ${customNotes}` : ''}).
اقترح 3 خيارات موسيقية تصويرية احترافية مختلفة تناسب أجواء الفيديو.
اكتب الحقول العربية بلغة احترافية موجزة، واجعل حقل lyriaPrompt وصفاً موسيقياً دقيقاً بالإنجليزية جاهزاً لنموذج توليد الموسيقى.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                titleAr: { type: Type.STRING },
                genreAr: { type: Type.STRING },
                bpm: { type: Type.INTEGER },
                moodAr: { type: Type.STRING },
                mixingTipAr: { type: Type.STRING },
                lyriaPrompt: { type: Type.STRING },
              },
              required: [
                'id',
                'titleAr',
                'genreAr',
                'bpm',
                'moodAr',
                'mixingTipAr',
                'lyriaPrompt',
              ],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim()) as SoundtrackSuggestion[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const history = readHistory();
        history.suggestions = parsed;
        writeHistory(history);
        return res.json({ suggestions: parsed });
      }
      res.json({ suggestions: DEFAULT_SUGGESTIONS });
    } catch (err) {
      const formatted = formatGeminiErrorAr(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/audio/generate-soundtrack', async (req, res) => {
    try {
      const { titleAr, lyriaPrompt } = req.body as { titleAr?: string; lyriaPrompt?: string };
      if (!lyriaPrompt || !lyriaPrompt.trim()) {
        return res.status(400).json({ error: 'يرجى توفير وصف الموسيقى التصويرية.' });
      }
      const ai = getAiClient();
      const response = await ai.models.generateContentStream({
        model: 'lyria-3-clip-preview',
        contents: lyriaPrompt.trim(),
      });

      const audioChunks: Buffer[] = [];
      let mimeType = 'audio/mpeg';

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
        }
      }

      if (audioChunks.length === 0) {
        return res.status(502).json({ error: 'لم يُرجع نموذج Lyria بيانات صوتية.' });
      }

      const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
      const timestamp = Date.now();
      const filename = `soundtrack_${timestamp}.${ext}`;
      const outPath = path.join(RENDERS_DIR, filename);
      fs.writeFileSync(outPath, Buffer.concat(audioChunks));

      const metrics = await analyzeMediaAudio(outPath);
      const render: RenderRecord = {
        id: `soundtrack_${timestamp}`,
        kind: 'soundtrack',
        titleAr: titleAr ? `موسيقى: ${titleAr}` : 'موسيقى تصويرية مولّدة بالذكاء الاصطناعي',
        createdAt: new Date().toISOString(),
        url: `/renders/${filename}`,
        durationSec: metrics.durationSec || 30,
        promptSummary: lyriaPrompt.trim(),
        afterMetrics: metrics,
      };

      const history = readHistory();
      history.renders.unshift(render);
      writeHistory(history);

      res.json({ render });
    } catch (err) {
      const formatted = formatGeminiErrorAr(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/video/generate-keyframes', async (req, res) => {
    try {
      const config = req.body as Partial<DirectorConfig>;
      const validation = validateDirectorConfig(config);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const fullConfig = config as DirectorConfig;
      const ai = getAiClient();

      const koFrame1 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ko_frame_1.jpg')).toString('base64');
      const koFrame2 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ko_frame_2.jpg')).toString('base64');
      const refFrame2 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ref_frame_2.jpg')).toString('base64');

      const prompt = buildKeyframePrompt(fullConfig);

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: koFrame1 } },
            { inlineData: { mimeType: 'image/jpeg', data: koFrame2 } },
            { inlineData: { mimeType: 'image/jpeg', data: refFrame2 } },
            { text: prompt },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '9:16',
            imageSize: '1K',
          },
        },
      });

      let imageData: string | null = null;
      let mimeType = 'image/png';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType ?? 'image/png';
          break;
        }
      }

      if (!imageData) {
        return res.status(502).json({ error: 'لم يُرجع النموذج صورة معاينة صالحة.' });
      }

      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
      const timestamp = Date.now();
      const filename = `keyframe_${timestamp}.${ext}`;
      fs.writeFileSync(path.join(RENDERS_DIR, filename), Buffer.from(imageData, 'base64'));

      const render: RenderRecord = {
        id: `keyframe_${timestamp}`,
        kind: 'keyframe',
        titleAr: 'لقطة معاينة VIP (KO مع الحراس)',
        createdAt: new Date().toISOString(),
        url: `/renders/${filename}`,
        previewImageUrl: `/renders/${filename}`,
        resolution: '9:16 1K',
        promptSummary: prompt,
      };

      const history = readHistory();
      history.renders.unshift(render);
      writeHistory(history);

      res.json({ render });
    } catch (err) {
      const formatted = formatGeminiErrorAr(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/video/generate', async (req, res) => {
    const body = req.body as Partial<DirectorConfig> & {
      soundtrackUrl?: string | null;
      audioPreset?: AudioMasterConfig['preset'];
    };

    const validation = validateDirectorConfig(body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const config: DirectorConfig = {
      scenePreset: body.scenePreset!,
      outfitStyle: body.outfitStyle!,
      duration: body.duration!,
      resolution: body.resolution!,
      includeBystanders: Boolean(body.includeBystanders ?? true),
      includeUmbrellaAndBags: Boolean(body.includeUmbrellaAndBags ?? true),
      syncOriginalBeat: Boolean(body.syncOriginalBeat ?? true),
      customNotes: String(body.customNotes ?? ''),
    };

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const startTime = Date.now();

    const updateJob = (patch: Partial<VideoJobStatus>) => {
      const current = jobs.get(jobId);
      if (!current) return;
      jobs.set(jobId, {
        ...current,
        ...patch,
        elapsedSec: Math.round((Date.now() - startTime) / 1000),
      });
    };

    jobs.set(jobId, {
      id: jobId,
      status: 'uploading_references',
      stageLabelAr: 'جاري تجهيز ورفع لقطات شخصية KO ومرجع الحراس...',
      progressPct: 12,
      elapsedSec: 0,
    });

    res.json({ jobId });

    // Background execution
    void (async () => {
      try {
        const ai = getAiClient();

        const koFrame1 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ko_frame_1.jpg')).toString('base64');
        const koFrame2 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ko_frame_2.jpg')).toString('base64');
        const refFrame1 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ref_frame_1.jpg')).toString('base64');
        const refFrame2 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ref_frame_2.jpg')).toString('base64');
        const refFrame3 = fs.readFileSync(path.join(STUDIO_ASSETS_DIR, 'ref_frame_3.jpg')).toString('base64');

        // Upload 3s reference video(s) via Files API
        const uploadedVideoUris: string[] = [];
        const koRefClipPath = path.join(STUDIO_ASSETS_DIR, 'ko_ref_3s.mp4');
        const guardsRefClipPath = path.join(STUDIO_ASSETS_DIR, 'guards_ref_3s.mp4');

        const clipsToUpload =
          config.duration === '15s' ? [koRefClipPath] : [koRefClipPath, guardsRefClipPath];

        for (const clipPath of clipsToUpload) {
          let uploaded = await ai.files.upload({
            file: clipPath,
            config: { mimeType: 'video/mp4' },
          });
          while (uploaded.state === 'PROCESSING') {
            await new Promise((resolve) => setTimeout(resolve, 4000));
            uploaded = await ai.files.get({ name: uploaded.name || '' });
          }
          if (uploaded.state === 'ACTIVE' && uploaded.uri) {
            uploadedVideoUris.push(uploaded.uri);
          }
        }

        updateJob({
          status: 'generating_video',
          stageLabelAr: 'جاري إخراج الفيديو السينمائي بالذكاء الاصطناعي (Omni Flash)...',
          progressPct: 45,
        });

        const prompt = buildVeoPrompt(config);
        const inputParts: Array<
          | { type: 'image'; mime_type: string; data: string }
          | { type: 'video'; uri: string }
          | { type: 'text'; text: string }
        > = [
          { type: 'image', mime_type: 'image/jpeg', data: koFrame1 },
          { type: 'image', mime_type: 'image/jpeg', data: koFrame2 },
          { type: 'image', mime_type: 'image/jpeg', data: refFrame1 },
          { type: 'image', mime_type: 'image/jpeg', data: refFrame2 },
          { type: 'image', mime_type: 'image/jpeg', data: refFrame3 },
        ];

        for (const uri of uploadedVideoUris) {
          inputParts.push({ type: 'video', uri });
        }

        inputParts.push({ type: 'text', text: prompt });

        const interaction = await ai.interactions.create(
          {
            model: 'gemini-omni-1.2-flash',
            input: inputParts,
            background: false,
            store: true,
            stream: false,
            response_format: {
              type: 'video',
              aspect_ratio: '9:16',
              duration: config.duration,
              resolution: config.resolution,
            },
          },
          { timeout: 300000 },
        );

        const videoPart = interaction.output_video;
        if (!videoPart || (!videoPart.data && !videoPart.uri)) {
          throw new Error('لم يُرجع نموذج الفيديو أي مقطع ناتج.');
        }

        const timestamp = Date.now();
        const rawVideoPath = path.join(RENDERS_DIR, `raw_ai_${timestamp}.mp4`);

        if (videoPart.data) {
          fs.writeFileSync(rawVideoPath, Buffer.from(videoPart.data, 'base64'));
        } else if (videoPart.uri) {
          const resp = await fetch(videoPart.uri, {
            headers: {
              'x-goog-api-key': process.env.GEMINI_API_KEY || '',
            },
          });
          if (!resp.ok) {
            throw new Error(`فشل تنزيل الفيديو الناتج: HTTP ${resp.status}`);
          }
          const arrayBuf = await resp.arrayBuffer();
          fs.writeFileSync(rawVideoPath, Buffer.from(arrayBuf));
        }

        let finalFilename = `vip_ko_${timestamp}.mp4`;
        let finalPath = path.join(RENDERS_DIR, finalFilename);
        let afterMetrics: AudioMetrics | undefined;

        if (config.syncOriginalBeat || body.soundtrackUrl) {
          updateJob({
            status: 'mastering_audio',
            stageLabelAr: 'جاري تنقية الصوت ودمج الموسيقى التصويرية الاحترافية عبر FFmpeg...',
            progressPct: 82,
          });

          const soundtrackPath =
            (body.soundtrackUrl ? resolveAssetDiskPath(body.soundtrackUrl) : null) ||
            path.join(STUDIO_ASSETS_DIR, 'ko_beat.mp3');

          const mastered = await masterVideoWithFfmpeg({
            inputVideoPath: rawVideoPath,
            outputVideoPath: finalPath,
            audioConfig: {
              targetVideoId: 'ai_raw',
              preset: body.audioPreset || 'vip-bass-punch',
              noiseReductionDb: 25,
              targetLufs: -14,
              originalAudioMix: 30,
              soundtrackMix: 90,
              soundtrackUrl: body.soundtrackUrl || '/assets/studio/ko_beat.mp3',
            },
            soundtrackDiskPath: soundtrackPath,
          });
          afterMetrics = mastered.afterMetrics;
          fs.unlinkSync(rawVideoPath);
        } else {
          fs.renameSync(rawVideoPath, finalPath);
          afterMetrics = await analyzeMediaAudio(finalPath);
        }

        const render: RenderRecord = {
          id: `vip_${timestamp}`,
          kind: 'ai-video',
          titleAr: `مشهد KO VIP مع الحراس (${config.duration})`,
          createdAt: new Date().toISOString(),
          url: `/renders/${finalFilename}`,
          durationSec: afterMetrics?.durationSec || Number(config.duration.replace('s', '')),
          resolution: `9:16 · ${config.resolution}`,
          promptSummary: prompt,
          afterMetrics,
        };

        const history = readHistory();
        history.renders.unshift(render);
        writeHistory(history);

        updateJob({
          status: 'completed',
          stageLabelAr: 'اكتمل الإنتاج والمعالجة الصوتية بنجاح.',
          progressPct: 100,
          render,
        });
      } catch (err) {
        const formatted = formatGeminiErrorAr(err);
        updateJob({
          status: 'failed',
          stageLabelAr: 'تعذر إتمام إنتاج الفيديو.',
          progressPct: 100,
          error: formatted.message,
        });
      }
    })();
  });

  app.get('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'لم يتم العثور على مهمة الإنتاج.' });
    }
    res.json(job);
  });

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم استلام أي ملف.' });
      }
      const isAudio = req.file.mimetype.startsWith('audio/');
      const url = `/assets/uploads/${req.file.filename}`;
      const metrics = await analyzeMediaAudio(req.file.path);

      let frames: string[] = [];
      if (!isAudio) {
        const thumbName = `${path.parse(req.file.filename).name}_thumb.jpg`;
        const thumbPath = path.join(UPLOADS_DIR, thumbName);
        try {
          await execFileAsync('ffmpeg', [
            '-y',
            '-ss',
            '00:00:00.5',
            '-i',
            req.file.path,
            '-frames:v',
            '1',
            '-q:v',
            '2',
            thumbPath,
          ]);
          frames = [`/assets/uploads/${thumbName}`];
        } catch {
          // Optional thumbnail
        }
      }

      const asset: StudioAssetItem = {
        id: `upload_${Date.now()}`,
        labelAr: req.file.originalname,
        role: isAudio ? 'audio-beat' : 'custom-upload',
        url,
        durationSec: metrics.durationSec || 10,
        frames,
        metrics,
      };

      const history = readHistory();
      history.uploads.unshift(asset);
      writeHistory(history);

      res.json({ asset });
    } catch (err) {
      res.status(500).json({ error: `فشل رفع الملف: ${String(err)}` });
    }
  });

  app.delete('/api/renders/:id', (req, res) => {
    const history = readHistory();
    const next = history.renders.filter((r) => r.id !== req.params.id);
    history.renders = next;
    writeHistory(history);
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.use(express.static(PUBLIC_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KO Cinema Studio running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
