import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFfmpegAudioFilter,
  buildKeyframePrompt,
  buildVeoPrompt,
  validateAudioMasterConfig,
  validateDirectorConfig,
} from './directorPrompt';
import type { AudioMasterConfig, DirectorConfig } from '../types/studio';

const baseDirector: DirectorConfig = {
  scenePreset: 'full-vip-entry',
  outfitStyle: 'hybrid-vip',
  duration: '15s',
  resolution: '1080p',
  includeBystanders: true,
  includeUmbrellaAndBags: true,
  syncOriginalBeat: true,
  customNotes: '',
};

test('buildVeoPrompt includes character consistency, bodyguards, umbrella/bags, and 9:16 framing', () => {
  const prompt = buildVeoPrompt(baseDirector);
  assert.match(prompt, /exact muscular male character/i);
  assert.match(prompt, /white luxury sedan/i);
  assert.match(prompt, /bodyguards/i);
  assert.match(prompt, /black umbrella/i);
  assert.match(prompt, /vertical 9:16/i);
});

test('buildVeoPrompt respects outfitStyle original-ko and omits bystanders when disabled', () => {
  const prompt = buildVeoPrompt({
    ...baseDirector,
    outfitStyle: 'original-ko',
    includeBystanders: false,
    includeUmbrellaAndBags: false,
    customNotes: 'Golden hour shadows',
  });
  assert.match(prompt, /white ribbed tank top/i);
  assert.doesNotMatch(prompt, /smartphones to film/i);
  assert.doesNotMatch(prompt, /black umbrella/i);
  assert.match(prompt, /Golden hour shadows/);
});

test('buildKeyframePrompt constructs 9:16 telephoto street portrait prompt', () => {
  const prompt = buildKeyframePrompt(baseDirector);
  assert.match(prompt, /9:16 editorial street photograph/i);
  assert.match(prompt, /85mm f\/1\.8/i);
});

test('buildFfmpegAudioFilter clamps values and builds preset-specific DSP chain', () => {
  const audioCfg: AudioMasterConfig = {
    targetVideoId: 'ko_source',
    preset: 'vip-bass-punch',
    noiseReductionDb: 99,
    targetLufs: -5,
    originalAudioMix: 80,
    soundtrackMix: 65,
    soundtrackUrl: null,
  };
  const result = buildFfmpegAudioFilter(audioCfg);
  assert.equal(result.noiseFloorDb, -40);
  assert.equal(result.targetLufs, -10);
  assert.match(result.filterChain, /highpass=f=85/);
  assert.match(result.filterChain, /afftdn=nf=-40/);
  assert.match(result.filterChain, /equalizer=f=75/);
  assert.match(result.filterChain, /loudnorm=I=-10/);
});

test('validateDirectorConfig and validateAudioMasterConfig reject invalid inputs', () => {
  assert.equal(validateDirectorConfig(baseDirector).ok, true);
  assert.equal(
    validateDirectorConfig({ ...baseDirector, duration: '30s' as never }).ok,
    false,
  );
  assert.equal(
    validateAudioMasterConfig({
      targetVideoId: 'ko_source',
      preset: 'cinema-clean',
      originalAudioMix: 100,
      soundtrackMix: 50,
      noiseReductionDb: 25,
      targetLufs: -14,
      soundtrackUrl: null,
    }).ok,
    true,
  );
  assert.equal(
    validateAudioMasterConfig({
      targetVideoId: '',
      preset: 'cinema-clean',
      originalAudioMix: 120,
      soundtrackMix: 50,
    }).ok,
    false,
  );
});
