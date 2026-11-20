export type ScenePreset =
  | 'full-vip-entry'
  | 'car-arrival'
  | 'street-walk-guards'
  | 'closeup-crosswalk';

export type OutfitStyle = 'hybrid-vip' | 'original-ko' | 'tailored-coat';

export type VideoDuration = '10s' | '15s';

export type VideoResolution = '720p' | '1080p';

export type AudioMasteringPreset = 'cinema-clean' | 'voice-clarity' | 'vip-bass-punch';

export interface DirectorConfig {
  scenePreset: ScenePreset;
  outfitStyle: OutfitStyle;
  duration: VideoDuration;
  resolution: VideoResolution;
  includeBystanders: boolean;
  includeUmbrellaAndBags: boolean;
  syncOriginalBeat: boolean;
  customNotes: string;
}

export interface AudioMasterConfig {
  targetVideoId: string;
  preset: AudioMasteringPreset;
  noiseReductionDb: number; // 10 to 40
  targetLufs: number; // -18 to -10
  originalAudioMix: number; // 0 to 100
  soundtrackMix: number; // 0 to 100
  soundtrackUrl: string | null;
}

export interface AudioMetrics {
  durationSec: number;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  sampleRate: number | null;
  channels: number | null;
  codec: string | null;
}

export interface SoundtrackSuggestion {
  id: string;
  titleAr: string;
  genreAr: string;
  bpm: number;
  moodAr: string;
  mixingTipAr: string;
  lyriaPrompt: string;
}

export interface StudioAssetItem {
  id: string;
  labelAr: string;
  role: 'character-source' | 'style-reference' | 'audio-beat' | 'custom-upload';
  url: string;
  durationSec: number;
  width?: number;
  height?: number;
  frames: string[];
  metrics?: AudioMetrics;
}

export interface RenderRecord {
  id: string;
  kind: 'ai-video' | 'keyframe' | 'audio-master' | 'soundtrack';
  titleAr: string;
  createdAt: string;
  url: string;
  previewImageUrl?: string;
  durationSec?: number;
  resolution?: string;
  promptSummary?: string;
  beforeMetrics?: AudioMetrics;
  afterMetrics?: AudioMetrics;
}

export interface VideoJobStatus {
  id: string;
  status: 'queued' | 'uploading_references' | 'generating_video' | 'mastering_audio' | 'completed' | 'failed';
  stageLabelAr: string;
  progressPct: number;
  elapsedSec: number;
  error?: string;
  render?: RenderRecord;
}
