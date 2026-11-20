import type {
  AudioMasterConfig,
  AudioMasteringPreset,
  DirectorConfig,
  OutfitStyle,
  ScenePreset,
} from '../types/studio';

export const SCENE_PRESET_LABELS: Record<
  ScenePreset,
  { titleAr: string; subtitleAr: string; cameraNote: string }
> = {
  'full-vip-entry': {
    titleAr: 'الدخول المتكامل (3 مشاهد)',
    subtitleAr: 'خروج من السيارة البيضاء + مسير الحراس في الشارع + لقطة مقربة',
    cameraNote: '85mm telephoto tracking shot with smooth slow-motion cuts',
  },
  'car-arrival': {
    titleAr: 'لحظة الوصول والسيارة',
    subtitleAr: 'الحارس يفتح باب السيارة الفاخرة وخروج البطل تحت المظلة السوداء',
    cameraNote: 'Crisp medium-wide arrival shot from curb angle',
  },
  'street-walk-guards': {
    titleAr: 'المسير المهيب مع الحراس',
    subtitleAr: 'مشي متناغم في الشارع محاطاً بحارسين ببدلات سوداء وحقائب فاخرة',
    cameraNote: '85mm telephoto shallow depth-of-field front tracking shot',
  },
  'closeup-crosswalk': {
    titleAr: 'لقطة مقربة وعبور الشارع',
    subtitleAr: 'زاوية منخفضة سينمائية أثناء العبور مع نظرة حادة وكاريزما عالية',
    cameraNote: 'Low-angle hero close-up transitioning to crosswalk stride',
  },
};

export const OUTFIT_LABELS: Record<
  OutfitStyle,
  { titleAr: string; descriptionAr: string; promptFragment: string }
> = {
  'hybrid-vip': {
    titleAr: 'هجين VIP (معطف مفتوح + وشوم KO)',
    descriptionAr: 'معطف أسود فاخر مفتوح فوق تيشيرت أبيض يُظهر الوشوم والساعة والنظارة',
    promptFragment:
      'wearing a tailored open black luxury wool overcoat layered over his crisp white fitted tank top so his intricate arm and chest tattoos remain visible, dark designer sunglasses, luxury wristwatch, and crisp white pleated tailored trousers with black dress shoes',
  },
  'original-ko': {
    titleAr: 'إطلالة KO الأصلية',
    descriptionAr: 'نفس التيشيرت الأبيض والبنطال الأسود والوشوم والساعة مع نظارة شمسية',
    promptFragment:
      'wearing his exact signature fitted white ribbed tank top showing his full arm and hand tattoos, black trousers with silver chain and luxury wristwatch, plus sleek dark designer sunglasses',
  },
  'tailored-coat': {
    titleAr: 'إطلالة الحراس المرجعية الكاملة',
    descriptionAr: 'معطف أسود طويل، قميص داكن، بنطال أبيض وحزام فاخر مع نظارة شمسية',
    promptFragment:
      'wearing a long tailored black overcoat over an unbuttoned dark shirt and white undershirt, luxury monogram belt, crisp white wide-leg tailored trousers, black leather dress shoes, and bold dark sunglasses while keeping his exact facial features, dark tousled hair, mustache and goatee',
  },
};

export const AUDIO_PRESET_LABELS: Record<
  AudioMasteringPreset,
  { titleAr: string; descriptionAr: string }
> = {
  'cinema-clean': {
    titleAr: 'تنقية سينمائية متوازنة',
    descriptionAr: 'إزالة الضوضاء الخلفية مع توازن ديناميكي ووضوح احترافي (-14 LUFS)',
  },
  'voice-clarity': {
    titleAr: 'تركيز وضوح الصوت',
    descriptionAr: 'عزل الترددات المنخفضة المزعجة وتعزيز ترددات الحضور (3kHz)',
  },
  'vip-bass-punch': {
    titleAr: 'قوة إيقاع VIP عميقة',
    descriptionAr: 'تنظيف الضوضاء مع إبراز الباص والإيقاع السينمائي المهيمن',
  },
};

export function buildVeoPrompt(config: DirectorConfig): string {
  const outfit = OUTFIT_LABELS[config.outfitStyle];
  const scene = SCENE_PRESET_LABELS[config.scenePreset];

  const characterIdentity =
    'Using the exact muscular male character shown in the first two character reference images and first reference clip (athletic muscular build, handsome sculpted face, dark tousled medium-length hair, neat dark mustache and goatee, defined eyebrows, intricate tattoos across arms and hands) as the VIP protagonist,';

  const bodyguardTeam = config.includeUmbrellaAndBags
    ? 'flanked closely on both left and right sides by two tall, broad-shouldered bodyguards in sharp all-black tailored suits, black dress shirts, dark sunglasses, and discreet security earpieces; one bodyguard holds a sleek black umbrella shielding him and carries luxury designer shopping bags, while the other scans the street protectively'
    : 'flanked closely on both sides by two tall, imposing bodyguards in tailored all-black suits, black shirts, dark sunglasses, and discreet security earpieces walking in synchronized formation';

  const crowd = config.includeBystanders
    ? 'In the softly blurred background along a high-end luxury city boutique avenue, stylish pedestrians and bystanders turn their heads in awe and raise smartphones to film the VIP entourage.'
    : 'Set on a clean, upscale metropolitan luxury shopping avenue with marble facades, glass storefronts, and natural daylight reflections.';

  let actionSequence = '';
  switch (config.scenePreset) {
    case 'full-vip-entry':
      actionSequence =
        'Sequence: Start with a bodyguard opening the rear door of a glossy white luxury sedan as the protagonist steps out effortlessly in smooth slow-motion; cut smoothly to a front-tracking 85mm telephoto shot of him striding powerfully down the city sidewalk between his two bodyguards; finish with a dramatic low-angle close-up as he crosses the street crosswalk with commanding charisma.';
      break;
    case 'car-arrival':
      actionSequence =
        'Action: A sharp black-suited bodyguard holds open the door of a white luxury sedan and raises a black umbrella as the protagonist steps out onto the pavement in smooth slow-motion, adjusts his coat, and begins walking forward with quiet authority.';
      break;
    case 'street-walk-guards':
      actionSequence =
        'Action: Continuous slow-motion front-tracking shot down a luxury boutique sidewalk as the protagonist walks directly toward the telephoto camera with effortless confidence, flanked in tight symmetrical formation by his two black-suited bodyguards.';
      break;
    case 'closeup-crosswalk':
      actionSequence =
        'Action: Dramatic low-angle slow-motion tracking shot pushing in toward the protagonist as he strides across a city crosswalk, coat billowing slightly in the breeze, flanked by his bodyguards in shallow background focus.';
      break;
  }

  const extra = config.customNotes.trim()
    ? ` Additional direction: ${config.customNotes.trim()}.`
    : '';

  return [
    characterIdentity,
    outfit.promptFragment + ',',
    bodyguardTeam + '.',
    actionSequence,
    crowd,
    `Cinematography: ${scene.cameraNote}, vertical 9:16 cinema framing, natural crisp outdoor daylight, realistic fabric physics, high-end editorial color grading, photorealistic live-action film texture, smooth 30fps slow-motion cadence.`,
  ].join(' ') + extra;
}

export function buildKeyframePrompt(config: DirectorConfig): string {
  const outfit = OUTFIT_LABELS[config.outfitStyle];
  const props = config.includeUmbrellaAndBags
    ? 'holding a sleek black umbrella overhead and carrying luxury black shopping bags'
    : 'scanning the avenue alertly';

  return `Photorealistic vertical 9:16 editorial street photograph matching the exact face, dark tousled hair, mustache, goatee, muscular build, and arm tattoos of the man in the first reference image, ${outfit.promptFragment}. He is walking confidently down an upscale city luxury boutique street flanked symmetrically by two tall bodyguards in all-black tailored suits, dark sunglasses, and security earpieces ${props}. Shot on an 85mm f/1.8 telephoto lens with creamy background bokeh, natural afternoon street lighting, crisp skin and fabric detail, high-fashion paparazzi candid aesthetic.${
    config.customNotes.trim() ? ` Note: ${config.customNotes.trim()}` : ''
  }`;
}

export function buildFfmpegAudioFilter(config: AudioMasterConfig): {
  filterChain: string;
  noiseFloorDb: number;
  targetLufs: number;
} {
  const clampedNoise = Math.min(40, Math.max(10, Math.round(config.noiseReductionDb)));
  const clampedLufs = Math.min(-10, Math.max(-18, Math.round(config.targetLufs)));
  const noiseFloorDb = -Math.abs(clampedNoise);

  const filters: string[] = [
    'highpass=f=85',
    `afftdn=nf=${noiseFloorDb}:nt=w:om=o`,
    'lowpass=f=16500',
  ];

  if (config.preset === 'voice-clarity') {
    filters.push('equalizer=f=220:t=q:w=1.2:g=-2.0');
    filters.push('equalizer=f=3100:t=q:w=1.4:g=3.5');
    filters.push('acompressor=threshold=-20dB:ratio=3.2:attack=10:release=140:makeup=2');
  } else if (config.preset === 'vip-bass-punch') {
    filters.push('equalizer=f=75:t=q:w=1.1:g=3.5');
    filters.push('equalizer=f=4500:t=q:w=1.5:g=2.0');
    filters.push('acompressor=threshold=-16dB:ratio=4.0:attack=6:release=110:makeup=3');
  } else {
    filters.push('equalizer=f=90:t=q:w=1.2:g=1.8');
    filters.push('equalizer=f=3200:t=q:w=1.5:g=2.2');
    filters.push('acompressor=threshold=-18dB:ratio=3.0:attack=8:release=120:makeup=2');
  }

  filters.push(`loudnorm=I=${clampedLufs}:TP=-1.5:LRA=11`);

  return {
    filterChain: filters.join(','),
    noiseFloorDb,
    targetLufs: clampedLufs,
  };
}

export function validateDirectorConfig(config: Partial<DirectorConfig>): {
  ok: boolean;
  error?: string;
} {
  if (!config.scenePreset || !(config.scenePreset in SCENE_PRESET_LABELS)) {
    return { ok: false, error: 'يرجى اختيار نمط مشهد صالح.' };
  }
  if (!config.outfitStyle || !(config.outfitStyle in OUTFIT_LABELS)) {
    return { ok: false, error: 'يرجى اختيار نمط إطلالة صالح.' };
  }
  if (config.duration !== '10s' && config.duration !== '15s') {
    return { ok: false, error: 'المدة المدعومة هي 10 أو 15 ثانية.' };
  }
  if (config.resolution !== '720p' && config.resolution !== '1080p') {
    return { ok: false, error: 'الدقة المدعومة هي 720p أو 1080p.' };
  }
  return { ok: true };
}

export function validateAudioMasterConfig(config: Partial<AudioMasterConfig>): {
  ok: boolean;
  error?: string;
} {
  if (!config.targetVideoId || typeof config.targetVideoId !== 'string') {
    return { ok: false, error: 'يرجى تحديد الفيديو المطلوب معالجة صوته.' };
  }
  if (!config.preset || !(config.preset in AUDIO_PRESET_LABELS)) {
    return { ok: false, error: 'يرجى اختيار إعداد هندسة صوت صالح.' };
  }
  if (
    typeof config.originalAudioMix !== 'number' ||
    config.originalAudioMix < 0 ||
    config.originalAudioMix > 100
  ) {
    return { ok: false, error: 'نسبة الصوت الأصلي يجب أن تكون بين 0 و 100.' };
  }
  if (
    typeof config.soundtrackMix !== 'number' ||
    config.soundtrackMix < 0 ||
    config.soundtrackMix > 100
  ) {
    return { ok: false, error: 'نسبة الموسيقى التصويرية يجب أن تكون بين 0 و 100.' };
  }
  return { ok: true };
}
