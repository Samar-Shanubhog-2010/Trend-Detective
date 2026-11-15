import type {
  DetectiveCase,
  DifficultyFilter,
  DifficultyLevel,
} from './cases';
import { MORE_QUIZ_PROMPTS } from './moreCases';
import { shuffleOptions } from './statistics';

export type QuizVisualKind = 'chart' | 'map' | 'variable';

export interface QuizChoice {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  caseId: string;
  caseNumber: string;
  difficulty: DifficultyLevel;
  categoryLabel: string;
  prompt: string;
  helperText: string;
  visualKind: QuizVisualKind;
  showSeasonalHelper?: boolean;
  showExtendedHelper?: boolean;
  showPValueBadge?: boolean;
  choices: QuizChoice[];
  explanation: string;
}

export const DIFFICULTY_RULES: Record<
  DifficultyFilter,
  {
    label: string;
    shortLabel: string;
    description: string;
    fiftyFiftyCount: number;
    speedWindowSec: number;
    scoreMultiplier: number;
  }
> = {
  easy: {
    label: 'Easy',
    shortLabel: 'Easy',
    description: '20 clear trend questions · 5× 50/50 hints · 16s speed bonus',
    fiftyFiftyCount: 5,
    speedWindowSec: 16,
    scoreMultiplier: 1,
  },
  medium: {
    label: 'Medium',
    shortLabel: 'Medium',
    description: '20 mixed clues & flat baselines · 4× 50/50 · 1.25× pts',
    fiftyFiftyCount: 4,
    speedWindowSec: 12,
    scoreMultiplier: 1.25,
  },
  hard: {
    label: 'Hard',
    shortLabel: 'Hard',
    description: '20 seasonal waves & short records · 3× 50/50 · 1.5× pts',
    fiftyFiftyCount: 3,
    speedWindowSec: 10,
    scoreMultiplier: 1.5,
  },
  all: {
    label: 'Mix',
    shortLabel: 'Mix',
    description: '30 balanced questions (10 Easy, 10 Medium, 10 Hard) · 4× 50/50',
    fiftyFiftyCount: 4,
    speedWindowSec: 12,
    scoreMultiplier: 1,
  },
};

export const QUESTIONS_PER_TIER = 20;
export const MIX_CASES_PER_TIER = 10;
export const SEEN_QUIZ_STORAGE_KEY = 'voltz7-seen-quiz-ids';

function getDefaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  return null;
}

export function readSeenQuizCaseIds(
  storage: Pick<Storage, 'getItem'> | null = getDefaultStorage(),
): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(SEEN_QUIZ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((v): v is string => typeof v === 'string'));
    }
  } catch {
    // Ignore malformed JSON
  }
  return new Set();
}

export function recordSeenQuizCaseIds(
  dealtCaseIds: readonly string[],
  allCases: readonly DetectiveCase[],
  difficulty: DifficultyFilter,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = getDefaultStorage(),
): Set<string> {
  const existing = readSeenQuizCaseIds(storage);
  const dealtSet = new Set(dealtCaseIds);
  const merged = new Set([...existing, ...dealtSet]);

  const tiers: readonly DifficultyLevel[] =
    difficulty === 'all' ? ['easy', 'medium', 'hard'] : [difficulty];
  const neededPerTier =
    difficulty === 'all' ? MIX_CASES_PER_TIER : QUESTIONS_PER_TIER;

  for (const tier of tiers) {
    const tierCases = allCases.filter((c) => c.difficulty === tier);
    const unseenRemaining = tierCases.filter((c) => !merged.has(c.id)).length;
    if (unseenRemaining < neededPerTier) {
      // Reset older seen IDs for this tier while keeping just-dealt IDs so the next session never repeats this batch
      for (const c of tierCases) {
        if (!dealtSet.has(c.id)) {
          merged.delete(c.id);
        }
      }
    }
  }

  if (storage) {
    try {
      storage.setItem(SEEN_QUIZ_STORAGE_KEY, JSON.stringify([...merged]));
    } catch {
      // Ignore quota / privacy mode errors
    }
  }

  return merged;
}

function samplePoolUnseenFirst(
  pool: readonly DetectiveCase[],
  limit: number,
  rng?: () => number,
  seenIds?: ReadonlySet<string>,
): DetectiveCase[] {
  if (!rng) {
    return pool.slice(0, limit);
  }
  if (!seenIds || seenIds.size === 0) {
    return shuffleOptions(pool, rng).slice(0, limit);
  }
  const unseen = shuffleOptions(
    pool.filter((c) => !seenIds.has(c.id)),
    rng,
  );
  const seen = shuffleOptions(
    pool.filter((c) => seenIds.has(c.id)),
    rng,
  );
  return [...unseen, ...seen].slice(0, limit);
}

export function filterCasesByDifficulty(
  cases: readonly DetectiveCase[],
  difficulty: DifficultyFilter = 'all',
  rng?: () => number,
  seenIds?: ReadonlySet<string>,
): DetectiveCase[] {
  if (difficulty !== 'all') {
    const pool = cases.filter((c) => c.difficulty === difficulty);
    return samplePoolUnseenFirst(pool, QUESTIONS_PER_TIER, rng, seenIds);
  }
  const easyPool = cases.filter((c) => c.difficulty === 'easy');
  const mediumPool = cases.filter((c) => c.difficulty === 'medium');
  const hardPool = cases.filter((c) => c.difficulty === 'hard');

  const easy = samplePoolUnseenFirst(easyPool, MIX_CASES_PER_TIER, rng, seenIds);
  const medium = samplePoolUnseenFirst(
    mediumPool,
    MIX_CASES_PER_TIER,
    rng,
    seenIds,
  );
  const hard = samplePoolUnseenFirst(hardPool, MIX_CASES_PER_TIER, rng, seenIds);

  const mixed: DetectiveCase[] = [];
  const maxLen = Math.max(easy.length, medium.length, hard.length);
  for (let i = 0; i < maxLen; i++) {
    if (easy[i]) mixed.push(easy[i]);
    if (medium[i]) mixed.push(medium[i]);
    if (hard[i]) mixed.push(hard[i]);
  }
  return mixed;
}

function makeChoices(
  correctLabel: string,
  distractors: [string, string, string],
  rng: () => number,
): QuizChoice[] {
  const raw: QuizChoice[] = [
    { id: 'c-correct', label: correctLabel, isCorrect: true },
    { id: 'c-d1', label: distractors[0], isCorrect: false },
    { id: 'c-d2', label: distractors[1], isCorrect: false },
    { id: 'c-d3', label: distractors[2], isCorrect: false },
  ];
  return shuffleOptions(raw, rng);
}

function cleanMeasurementLabel(name: string): string {
  return name.replace(/\s*\(AOD\)/gi, '').trim();
}

function buildPrimaryQuestionForCase(
  c: DetectiveCase,
  rng: () => number,
): QuizQuestion {
  const difficulty = c.difficulty;
  switch (c.id) {
    case 'sahara-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the Sahara Desert temperature chart. What is happening?',
        helperText: 'Compare the left side (2006) to the right side (2023).',
        visualKind: 'chart',
        choices: makeChoices(
          'Temperatures are going up',
          [
            'Temperatures are going down',
            'Temperatures stay completely flat',
            'Temperatures drop below freezing every year',
          ],
          rng,
        ),
        explanation:
          'Sahara temperatures climb steadily from 2006 to 2023.',
      };

    case 'antarctic-ozone':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Pick the Tool',
        prompt:
          'Which measurement checks if Earth’s protective ozone layer over Antarctica is healing?',
        helperText: 'Match the question to one of the 4 satellite tools on the left.',
        visualKind: 'variable',
        choices: shuffleOptions(
          c.variableOptions.slice(0, 4).map((v) => ({
            id: v.id,
            label: `${v.name} (${v.source})`,
            isCorrect: v.quality !== 'distractor',
          })),
          rng,
        ),
        explanation:
          'Ozone Layer (OMI) measures how thick the sky’s protective UV shield is.',
      };

    case 'atlantic-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt:
          'Look at the Tropical Atlantic Ocean temperature chart. Is it getting warmer or cooler?',
        helperText: 'Follow the line across the 20-year chart.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting warmer (line goes up)',
          [
            'Getting cooler (line goes down)',
            'Staying flat (no change)',
            'Bouncing wildly with no direction',
          ],
          rng,
        ),
        explanation:
          'The Tropical Atlantic warms smoothly year after year because ocean water holds heat steadily.',
      };

    case 'la-air-clarity':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt:
          'Look at the air pollution chart for Los Angeles. Is the air getting cleaner or dirtier?',
        helperText: 'A lower line means cleaner air with less smog.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting cleaner (pollution goes down)',
          [
            'Getting dirtier (pollution goes up)',
            'Staying completely flat',
            'Spiking higher every single year',
          ],
          rng,
        ),
        explanation:
          'Cleaner car rules helped air pollution in Los Angeles drop steadily from 2006 to 2023.',
      };

    case 'equatorial-ozone':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Spot a Flat Line',
        prompt:
          'Look at the ozone chart for the Equator. Is it going up, going down, or staying flat?',
        helperText: 'Check whether the line tilts up, tilts down, or stays level.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'Staying steady (flat line — no real change)',
          [
            'Climbing steeply upward',
            'Dropping steadily downward',
            'Falling to zero over 18 years',
          ],
          rng,
        ),
        explanation:
          'Over the Equator, the ozone layer stays flat and steady. Not every chart goes up or down!',
      };

    case 'london-clean-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'What does the chart show about air pollution in London?',
        helperText: 'Remember: lower numbers mean cleaner air.',
        visualKind: 'chart',
        choices: makeChoices(
          'Air pollution is dropping (air is getting cleaner)',
          [
            'Air pollution is rising (air is getting dirtier)',
            'Air pollution stays completely flat',
            'Air pollution doubles every five years',
          ],
          rng,
        ),
        explanation:
          'Clean-air rules led to a clear downward drop in air pollution over London.',
      };

    case 'mediterranean-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Find on the Map',
        prompt:
          'Find the Mediterranean Sea on the map (the warm sea between Europe and Africa).',
        helperText: 'Click the right dot on the map, or choose from A–D.',
        visualKind: 'map',
        choices: shuffleOptions(
          c.regionOptions.map((r) => ({
            id: r.id,
            label: `${r.name} (${r.coordinatesLabel})`,
            isCorrect: r.isTarget,
          })),
          rng,
        ),
        explanation:
          'The Mediterranean Sea sits right between southern Europe and North Africa.',
      };

    case 'greenland-ice-loss':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt:
          'Look at Greenland’s ice height chart. Is the ice getting thicker or thinner?',
        helperText: 'Check whether ice height goes up or down from 2008 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting thinner (ice height goes down)',
          [
            'Getting thicker (ice height goes up)',
            'Staying completely flat',
            'Growing 5 meters taller',
          ],
          rng,
        ),
        explanation:
          'Greenland’s coastal ice dropped by roughly 5 meters over 16 years — a clear thinning trend.',
      };

    case 'pacific-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt:
          'Look at the Central Pacific Ocean temperature chart. Is the water getting warmer or cooler?',
        helperText: 'Follow the overall direction from 2005 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting warmer (line goes up)',
          [
            'Getting cooler (line goes down)',
            'Staying flat (no change)',
            'Freezing into ice every winter',
          ],
          rng,
        ),
        explanation:
          'Near the Equator, seasonal swings are small, making the warming climb easy to see.',
      };

    case 'tokyo-clean-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt:
          'Look at the air pollution chart for Tokyo. Did the air get cleaner or dirtier?',
        helperText: 'A lower line means cleaner air and less smog.',
        visualKind: 'chart',
        choices: makeChoices(
          'Cleaner (air pollution went down)',
          [
            'Dirtier (air pollution went up)',
            'No change (line stayed flat)',
            'Pollution tripled over 18 years',
          ],
          rng,
        ),
        explanation:
          'Cleaner truck and factory standards produced a steady drop in Tokyo’s air pollution.',
      };

    case 'sw-australia-drying':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Pick the Tool',
        prompt:
          'Farmers want to know if soil in Southwest Australia is drying out. Which measurement should you pick?',
        helperText: 'Choose the tool on the left that measures water in the ground.',
        visualKind: 'variable',
        choices: shuffleOptions(
          c.variableOptions.slice(0, 4).map((v) => ({
            id: v.id,
            label: `${v.name} (${v.source})`,
            isCorrect: v.quality !== 'distractor',
          })),
          rng,
        ),
        explanation:
          'Soil Water (GLDAS) directly measures how much water is stored in the ground.',
      };

    case 'northern-europe-rain':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt:
          'Look at the rain chart for Northern Europe. Is it raining more or less over time?',
        helperText: 'Check the overall direction from 2004 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Raining more (line goes up)',
          [
            'Raining less (line goes down)',
            'Staying flat (no change)',
            'Dry desert with zero rain',
          ],
          rng,
        ),
        explanation:
          'Northern Europe shows a clear upward trend in monthly rainfall over 20 years.',
      };

    case 'persian-gulf-evap':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt:
          'Look at how fast water evaporates from the Persian Gulf. Is evaporation going up or down?',
        helperText: 'Focus on the overall direction across the 18 years.',
        visualKind: 'chart',
        choices: makeChoices(
          'Going up (more water evaporating)',
          [
            'Going down (less water evaporating)',
            'Staying flat (no change)',
            'Dropping to zero every summer',
          ],
          rng,
        ),
        explanation:
          'Warmer water and hot air caused evaporation over the Persian Gulf to climb steadily.',
      };

    case 'atacama-flat-rain':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Spot a Flat Line',
        prompt:
          'Look at rainfall in the Atacama Desert. Is it changing or staying the same?',
        helperText: 'Notice how level the line stays near 3 mm/mo.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'Staying the same (flat line — no real change)',
          [
            'Going up fast (much wetter every year)',
            'Going down fast (crashing downward)',
            'Flooding heavily every month',
          ],
          rng,
        ),
        explanation:
          'The Atacama stays flat and very dry (~3 mm/mo) with no real change over 18 years.',
      };

    case 'siberia-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt:
          'Look at the temperature chart for Siberia. Is it getting warmer or cooler?',
        helperText: 'Compare the start (2006) to the end (2023).',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting warmer (line goes up)',
          [
            'Getting cooler (line goes down)',
            'Staying completely flat',
            'Dropping every single winter to the same point',
          ],
          rng,
        ),
        explanation:
          'Siberia shows a clear upward climb in air temperature from 2006 to 2023.',
      };

    case 'california-drought-soil':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Pick the Tool',
        prompt:
          'Farmers want to check if California soil is drying out. Which tool should you pick?',
        helperText: 'Choose the tool on the left that measures water in the ground.',
        visualKind: 'variable',
        choices: shuffleOptions(
          c.variableOptions.slice(0, 4).map((v) => ({
            id: v.id,
            label: `${v.name} (${v.source})`,
            isCorrect: v.quality !== 'distractor',
          })),
          rng,
        ),
        explanation:
          'Soil Water (GLDAS) directly measures how much moisture is stored in farm soil.',
      };

    case 'coral-sea-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Find on the Map',
        prompt:
          'Find the Great Barrier Reef on the map (off the northeast coast of Australia).',
        helperText: 'Click the matching dot on the map, or choose from A–D.',
        visualKind: 'map',
        choices: shuffleOptions(
          c.regionOptions.map((r) => ({
            id: r.id,
            label: `${r.name} (${r.coordinatesLabel})`,
            isCorrect: r.isTarget,
          })),
          rng,
        ),
        explanation:
          'The Great Barrier Reef sits in warm coral waters off northeastern Australia.',
      };

    case 'mumbai-rain-flat':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Spot a Flat Line',
        prompt:
          'Look at the 18-year rain chart for Mumbai. Is rainfall going up, going down, or staying flat?',
        helperText: 'Check whether the overall line tilts up, tilts down, or stays level.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'Staying flat (no real change)',
          [
            'Going up sharply every year',
            'Dropping down to zero rain',
            'Doubling every five years',
          ],
          rng,
        ),
        explanation:
          'Over 18 years, Mumbai’s average rainfall stays steady with no clear upward or downward drift.',
      };

    case 'paris-clean-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt:
          'Look at the air pollution chart for Paris. Did the air get cleaner or dirtier?',
        helperText: 'A lower line means cleaner air with less smog.',
        visualKind: 'chart',
        choices: makeChoices(
          'Cleaner (air pollution went down)',
          [
            'Dirtier (air pollution went up)',
            'No change (line stayed flat)',
            'Pollution tripled over 19 years',
          ],
          rng,
        ),
        explanation:
          'Cleaner city rules led to a steady downward drop in air pollution over Paris.',
      };

    case 'andes-glacier-ice':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Pick the Tool',
        prompt:
          'Scientists want to see if mountain ice in the Andes is shrinking. Which measurement checks ice height?',
        helperText: 'Match the question to the ice-measuring tool on the left.',
        visualKind: 'variable',
        choices: shuffleOptions(
          c.variableOptions.slice(0, 4).map((v) => ({
            id: v.id,
            label: `${v.name} (${v.source})`,
            isCorrect: v.quality !== 'distractor',
          })),
          rng,
        ),
        explanation:
          'Ice Height / Thickness (ICESat-2 / CryoSat) uses space lasers and radar to measure glacier height.',
      };

    case 'red-sea-evap':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt:
          'Big summer-winter swings bounce Red Sea evaporation up and down. Click "Remove Seasons" — what is happening long-term?',
        helperText: 'Click "Remove Seasons" above the chart to uncover the slower change.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'More water evaporating (line goes up)',
          [
            'Less water evaporating (line goes down)',
            'Staying completely flat (no change)',
            'Dropping to zero every winter',
          ],
          rng,
        ),
        explanation:
          'Huge summer-to-winter swings hid the climb — removing seasons reveals a clear upward trend in Red Sea evaporation.',
      };

    case 'canada-boreal-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt:
          'Freezing winters and warm summers swing Northern Canada temperatures wildly. Click "Remove Seasons" — is it warming or cooling?',
        helperText: 'Click "Remove Seasons" above the chart to see past the winter-summer wave.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Warming up (line goes up)',
          [
            'Cooling down (line goes down)',
            'Staying completely flat',
            'Dropping colder every summer',
          ],
          rng,
        ),
        explanation:
          'Removing the 30 °C winter-summer wave exposes a clear long-term warming climb in Northern Canada.',
      };

    case 'seoul-clean-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Spot Weather Noise',
        prompt:
          'The 10-year air chart for Seoul jumps around a lot. Can we be sure pollution changed over those 10 years?',
        helperText: 'Look at the yellow "Not Sure Yet" badge below the chart.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'No — 10 years is too noisy to be sure yet',
          [
            'Yes — pollution definitely fell every year',
            'Yes — pollution doubled over 10 years',
            'Yes — it dropped straight to zero',
          ],
          rng,
        ),
        explanation:
          'On a short 10-year record with noisy ups and downs, good scientists wait for more years of data before claiming a real trend.',
      };

    case 'indian-ocean-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · More Data Check',
        prompt:
          'With only 10 years of ocean data, the Indian Ocean chart looks uncertain. Click "Try 22 yr" — what happens?',
        helperText: 'Click "Try 22 yr" above the chart and watch the Trend Check badge below.',
        visualKind: 'chart',
        showExtendedHelper: true,
        showPValueBadge: true,
        choices: makeChoices(
          'With 22 years, steady warming becomes clear and proven',
          [
            'With 22 years, the ocean turns downward and cools',
            'Even 22 years shows zero temperature change',
            'Adding more years erases the chart completely',
          ],
          rng,
        ),
        explanation:
          'A gentle warming trend can look uncertain on a short 10-year record — adding 22 years of data proves it clearly!',
      };

    case 'amazon-drying':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt:
          'Big wet-and-dry seasons make the Amazon chart zigzag. Click "Remove Seasons" — what is happening long-term?',
        helperText:
          'Click "Remove Seasons" above the chart to uncover the hidden line.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'The ground is drying out (line goes down)',
          [
            'The ground is getting wetter (line goes up)',
            'Nothing changes (completely flat)',
            'Soil water drops to zero every year',
          ],
          rng,
        ),
        explanation:
          'Big wet/dry season swings hid the slower drop — removing seasons reveals a real drying trend.',
      };

    case 'beijing-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Check the Data',
        prompt:
          'Look at air pollution in Beijing from 2008 to 2023. Did Beijing’s air get cleaner or dirtier?',
        helperText: 'Don’t guess — look at whether the chart goes up or down!',
        visualKind: 'chart',
        choices: makeChoices(
          'Cleaner — air pollution went down',
          [
            'Dirtier — air pollution went up',
            'No change — pollution stayed flat',
            'Air pollution vanished to zero in 2009',
          ],
          rng,
        ),
        explanation:
          'After strict clean-air rules, Beijing’s air pollution dropped steadily over 16 years.',
      };

    case 'arctic-sea-ice':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt:
          'Arctic sea ice freezes and melts every year. Click "Remove Seasons" — is the ice getting thicker or thinner?',
        helperText:
          'Click "Remove Seasons" above the chart to see past the yearly freeze-melt wave.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Getting thinner (line goes down)',
          [
            'Getting thicker (line goes up)',
            'Staying the same thickness (flat)',
            'Melting completely every ten years',
          ],
          rng,
        ),
        explanation:
          'Removing the yearly freeze-melt wave exposes a clear thinning trend in Arctic sea ice.',
      };

    case 'sahel-rainfall':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · More Data Check',
        prompt:
          'With only 12 years of rain data, the Sahel chart jumps around too much to be sure. Click "Try 24 yr" — what happens?',
        helperText:
          'Click "Try 24 yr" above the chart and watch the Trend Check badge below.',
        visualKind: 'chart',
        showExtendedHelper: true,
        showPValueBadge: true,
        choices: makeChoices(
          'With 24 years, the upward rain trend becomes clear and proven',
          [
            'With 24 years, the rain switches to a downward trend',
            'Even 24 years is still not enough to tell',
            'More years of data always make charts harder to read',
          ],
          rng,
        ),
        explanation:
          'A real trend can look unclear on a short 12-year record — adding more years (24 yr) proves the upward trend!',
      };

    case 'delhi-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Opposite Cities',
        prompt:
          'Air pollution dropped in Beijing. Look at the chart for Delhi, India — what happened there?',
        helperText: 'Check whether Delhi’s line goes up or down from 2006 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Air pollution went up (air got dirtier)',
          [
            'Air pollution dropped just like Beijing',
            'Air pollution stayed completely flat',
            'Satellites cannot measure air in India',
          ],
          rng,
        ),
        explanation:
          'The same measurement can move in opposite directions in different cities: air got cleaner in Beijing while getting dirtier in Delhi.',
      };

    case 'new-york-clean-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the air pollution chart for New York City. Is the air getting cleaner or dirtier?',
        helperText: 'A lower line means cleaner air with less smog.',
        visualKind: 'chart',
        choices: makeChoices(
          'Cleaner (air pollution goes down)',
          [
            'Dirtier (air pollution goes up)',
            'Staying completely flat',
            'Pollution doubles every five years',
          ],
          rng,
        ),
        explanation:
          'Cleaner vehicles and power plants helped air pollution over New York drop steadily from 2005 to 2023.',
      };

    case 'alps-glacier-ice':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the Swiss Alps glacier height chart. Are the glaciers getting thicker or thinner?',
        helperText: 'Compare the left side (2007) to the right side (2023).',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting thinner (glacier height goes down)',
          [
            'Getting thicker (glacier height goes up)',
            'Staying completely flat',
            'Growing 6 meters taller every year',
          ],
          rng,
        ),
        explanation:
          'Glaciers in the Swiss Alps lost nearly 6 meters of height from 2007 to 2023 — a clear thinning trend.',
      };

    case 'gulf-of-mexico-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the temperature chart for the Gulf of Mexico. Is the water getting warmer or cooler?',
        helperText: 'Follow the overall direction from 2005 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting warmer (line goes up)',
          [
            'Getting cooler (line goes down)',
            'Staying flat (no change)',
            'Freezing into ice every winter',
          ],
          rng,
        ),
        explanation:
          'Sea temperatures in the Gulf of Mexico rose steadily by nearly 1 °C over 19 years.',
      };

    case 'spain-soil-drying':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the soil water chart for central Spain. Is the ground getting wetter or drier?',
        helperText: 'Lower soil water means drier ground.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting drier (soil water goes down)',
          [
            'Getting wetter (soil water goes up)',
            'Staying completely flat',
            'Flooding every single month',
          ],
          rng,
        ),
        explanation:
          'Hotter summers caused soil moisture across central Spain to drop steadily over 18 years.',
      };

    case 'seattle-clean-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Find on the Map',
        prompt: 'Find Seattle on the map (on the northwestern coast of the United States).',
        helperText: 'Click the matching dot on the map, or choose from A–D.',
        visualKind: 'map',
        choices: shuffleOptions(
          c.regionOptions.map((r) => ({
            id: r.id,
            label: `${r.name} (${r.coordinatesLabel})`,
            isCorrect: r.isTarget,
          })),
          rng,
        ),
        explanation:
          'Seattle sits on the Pacific Northwest coast of the United States near 47.6° N.',
      };

    case 'northern-norway-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the temperature chart for Northern Norway. Is it getting warmer or cooler?',
        helperText: 'Compare 2006 on the left with 2023 on the right.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting warmer (line goes up)',
          [
            'Getting cooler (line goes down)',
            'Staying completely flat',
            'Dropping colder every summer',
          ],
          rng,
        ),
        explanation:
          'High-latitude regions like Northern Norway warmed steadily across the 18-year record.',
      };

    case 'southern-chile-rain':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Pick the Tool',
        prompt: 'Scientists want to know if monthly rainfall in Southern Chile is falling. Which tool measures rain?',
        helperText: 'Match the question to one of the 4 satellite tools on the left.',
        visualKind: 'variable',
        choices: shuffleOptions(
          c.variableOptions.slice(0, 4).map((v) => ({
            id: v.id,
            label: `${v.name} (${v.source})`,
            isCorrect: v.quality !== 'distractor',
          })),
          rng,
        ),
        explanation:
          'Rain & Snow (GPM) directly measures how much rain and snow falls each month.',
      };

    case 'east-china-sea-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at the East China Sea temperature chart. What is happening from 2006 to 2023?',
        helperText: 'Follow the overall tilt of the blue line.',
        visualKind: 'chart',
        choices: makeChoices(
          'Water is warming up (line goes up)',
          [
            'Water is cooling down (line goes down)',
            'Water temperature stays completely flat',
            'Sea freezes over every winter',
          ],
          rng,
        ),
        explanation:
          'The East China Sea warmed by roughly 1 °C over 18 years with a clear upward trend.',
      };

    case 'caribbean-sea-evap':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at how fast water evaporates from the Caribbean Sea. Is evaporation going up or down?',
        helperText: 'Compare the start (2005) to the end (2023).',
        visualKind: 'chart',
        choices: makeChoices(
          'Going up (more water evaporating)',
          [
            'Going down (less water evaporating)',
            'Staying completely flat',
            'Dropping to zero every summer',
          ],
          rng,
        ),
        explanation:
          'Warmer tropical water and trade winds caused Caribbean Sea evaporation to climb steadily.',
      };

    case 'patagonia-ice-loss':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Easy · Read the Chart',
        prompt: 'Look at Patagonia’s ice height chart. Are the ice fields growing or shrinking?',
        helperText: 'Lower height means thinner ice.',
        visualKind: 'chart',
        choices: makeChoices(
          'Shrinking (ice height goes down)',
          [
            'Growing thicker (ice height goes up)',
            'Staying completely flat',
            'Doubling in thickness every year',
          ],
          rng,
        ),
        explanation:
          'Patagonia ice fields dropped nearly 6 meters in height over 16 years.',
      };

    case 'hawaii-temp-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt: 'Look at ocean temperatures around Hawaii. Is the water warming, cooling, or staying flat?',
        helperText: 'Check the overall direction from 2005 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Warming up (steady upward trend)',
          [
            'Cooling down (steady downward trend)',
            'Staying completely flat',
            'Dropping below freezing every winter',
          ],
          rng,
        ),
        explanation:
          'Ocean waters around Hawaii show a smooth, steady upward warming climb over 19 years.',
      };

    case 'central-sahara-rain-flat':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Spot a Flat Line',
        prompt: 'Look at rainfall in the Central Sahara Desert. Is it changing or staying steady?',
        helperText: 'Notice how level the line stays near 4 mm/mo.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'Staying steady (flat line — no real change)',
          [
            'Climbing steeply into heavy rain',
            'Dropping quickly every year',
            'Flooding every summer',
          ],
          rng,
        ),
        explanation:
          'Central Sahara rainfall stays flat near ~4 mm/mo for 18 years with no upward or downward trend.',
      };

    case 'mexico-city-air':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt: 'Look at the air pollution chart for Mexico City. Did the air get cleaner or dirtier?',
        helperText: 'Lower values mean cleaner skies with less haze.',
        visualKind: 'chart',
        choices: makeChoices(
          'Cleaner (air pollution went down)',
          [
            'Dirtier (air pollution went up)',
            'No change (line stayed flat)',
            'Pollution tripled over 18 years',
          ],
          rng,
        ),
        explanation:
          'Clean-fuel and vehicle rules brought a steady downward drop in air pollution over Mexico City.',
      };

    case 'lake-victoria-evap':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Find on the Map',
        prompt: 'Find Lake Victoria on the map (East Africa’s giant lake right on the Equator).',
        helperText: 'Click the matching dot on the map, or choose from A–D.',
        visualKind: 'map',
        choices: shuffleOptions(
          c.regionOptions.map((r) => ({
            id: r.id,
            label: `${r.name} (${r.coordinatesLabel})`,
            isCorrect: r.isTarget,
          })),
          rng,
        ),
        explanation:
          'Lake Victoria sits in East Africa right along the 0° Equator line.',
      };

    case 'iberian-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt: 'Look at the temperature chart for the Iberian Peninsula. Is it getting warmer or cooler?',
        helperText: 'Compare 2005 on the left to 2023 on the right.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting warmer (line goes up)',
          [
            'Getting cooler (line goes down)',
            'Staying completely flat',
            'Cooling every summer',
          ],
          rng,
        ),
        explanation:
          'Temperatures across Spain and Portugal climbed steadily by over 1.2 °C across 19 years.',
      };

    case 'tasman-sea-ozone-flat':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Spot a Flat Line',
        prompt: 'Look at the ozone chart over the Tasman Sea. Is ozone rising, falling, or staying steady?',
        helperText: 'Look at the yellow "Not Sure Yet" baseline badge below the chart.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'Staying steady (flat baseline — no real change)',
          [
            'Climbing steeply every year',
            'Falling sharply toward zero',
            'Vanishing completely in winter',
          ],
          rng,
        ),
        explanation:
          'Over the Tasman Sea, ozone stays flat around ~304 DU with no long-term upward or downward drift.',
      };

    case 'east-africa-soil':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Pick the Tool',
        prompt: 'Farmers want to check if ground in East Africa is drying out. Which tool measures water in soil?',
        helperText: 'Pick the sensor on the left that measures moisture in the ground.',
        visualKind: 'variable',
        choices: shuffleOptions(
          c.variableOptions.slice(0, 4).map((v) => ({
            id: v.id,
            label: `${v.name} (${v.source})`,
            isCorrect: v.quality !== 'distractor',
          })),
          rng,
        ),
        explanation:
          'Soil Water (GLDAS) directly measures how much moisture is stored in the top meter of soil.',
      };

    case 'alaska-glacier-loss':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt: 'Look at Southern Alaska’s glacier height chart. What is happening to the glaciers?',
        helperText: 'Check whether glacier height climbs or drops from 2008 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Getting thinner (glacier height goes down)',
          [
            'Getting thicker (glacier height goes up)',
            'Staying completely flat',
            'Growing 6 meters taller',
          ],
          rng,
        ),
        explanation:
          'Coastal glaciers in Southern Alaska dropped by over 6 meters in height across 16 years.',
      };

    case 'bay-of-bengal-rain':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Read the Chart',
        prompt: 'Look at rainfall over the Bay of Bengal. Is monthly rain increasing or decreasing?',
        helperText: 'Follow the overall direction from 2005 to 2023.',
        visualKind: 'chart',
        choices: makeChoices(
          'Increasing (more rain over time)',
          [
            'Decreasing (less rain over time)',
            'Staying flat (no change)',
            'Drying to zero every summer',
          ],
          rng,
        ),
        explanation:
          'Warmer tropical waters fed a clear upward climb in Bay of Bengal rainfall over 19 years.',
      };

    case 'north-pacific-ozone-flat':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Medium · Spot a Flat Line',
        prompt: 'Look at the ozone chart over the North Pacific Ocean. Is it changing or staying flat?',
        helperText: 'Check whether the 18-year line tilts up, tilts down, or stays level.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'Staying flat (no real change)',
          [
            'Rising rapidly every year',
            'Dropping sharply to zero',
            'Swinging down by half every winter',
          ],
          rng,
        ),
        explanation:
          'North Pacific ozone holds steady near ~296 DU with no upward or downward trend.',
      };

    case 'midwest-soil-drying':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt: 'Spring-to-autumn swings make US Midwest soil bounce wildly. Click "Remove Seasons" — what is happening?',
        helperText: 'Click "Remove Seasons" above the chart to uncover the slower change.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Soil is drying out (line goes down)',
          [
            'Soil is getting wetter (line goes up)',
            'Soil water stays completely flat',
            'Soil freezes completely every summer',
          ],
          rng,
        ),
        explanation:
          'Removing the big ±64 mm seasonal swing exposes a steady multi-year drying trend in Midwest soil.',
      };

    case 'hudson-bay-ice':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt: 'Hudson Bay freezes and melts every year. Click "Remove Seasons" — is the ice getting thicker or thinner?',
        helperText: 'Click "Remove Seasons" above the chart to look past the yearly freeze-melt cycle.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Getting thinner (line goes down)',
          [
            'Getting thicker (line goes up)',
            'Staying completely flat',
            'Staying frozen solid all summer',
          ],
          rng,
        ),
        explanation:
          'Once you subtract the yearly freeze-melt cycle, Hudson Bay sea ice shows a clear thinning trend.',
      };

    case 'cairo-haze-noise':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Spot Weather Noise',
        prompt: 'The 10-year air dust chart for Cairo bounces up and down a lot. Can we be sure dust changed?',
        helperText: 'Look at the yellow "Not Sure Yet" badge below the chart.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'No — 10 years is too noisy to be sure yet',
          [
            'Yes — dust definitely climbed every year',
            'Yes — dust dropped straight to zero',
            'Yes — it is 100% proven without doubt',
          ],
          rng,
        ),
        explanation:
          'When a short 10-year record has big random ups and downs, good scientists wait for more years before claiming a trend.',
      };

    case 'barents-sea-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · More Data Check',
        prompt: 'With only 10 years of data, the Barents Sea chart looks uncertain. Click "Try 22 yr" — what happens?',
        helperText: 'Click "Try 22 yr" above the chart and watch the Trend Check badge below.',
        visualKind: 'chart',
        showExtendedHelper: true,
        showPValueBadge: true,
        choices: makeChoices(
          'With 22 years, steady ocean warming becomes clear and proven',
          [
            'With 22 years, the sea turns downward and cools',
            'Even 22 years shows zero change',
            'More data makes the trend disappear completely',
          ],
          rng,
        ),
        explanation:
          'Gentle warming in noisy polar seas looks uncertain over 10 years, but extending to 22 years proves it clearly!',
      };

    case 'congo-basin-evap':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt: 'Rainy seasons bounce Congo Basin evaporation up and down. Click "Remove Seasons" — what is happening?',
        helperText: 'Click "Remove Seasons" above the chart to reveal the hidden trend.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Evaporation is rising (line goes up)',
          [
            'Evaporation is falling (line goes down)',
            'Evaporation stays completely flat',
            'Evaporation drops to zero every month',
          ],
          rng,
        ),
        explanation:
          'Removing the double-peaked wet-dry season cycle uncovers a steady rise in Congo Basin evaporation.',
      };

    case 'jakarta-air-haze':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Check the Data',
        prompt: 'Air pollution fell in London and New York. Look at Jakarta’s chart from 2006 to 2023 — what happened there?',
        helperText: 'Check the actual tilt of Jakarta’s chart instead of guessing!',
        visualKind: 'chart',
        choices: makeChoices(
          'Air pollution went up (air got dirtier)',
          [
            'Air pollution dropped just like London',
            'Air pollution stayed completely flat',
            'Air pollution vanished to zero in 2010',
          ],
          rng,
        ),
        explanation:
          'Checking the data shows Jakarta’s air haze climbed over 18 years — opposite to cities with strict clean-air drops.',
      };

    case 'tibetan-plateau-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt: 'Winter-summer swings bounce Tibetan Plateau temperatures by over 20 °C. Click "Remove Seasons" — what is happening?',
        helperText: 'Click "Remove Seasons" above the chart to uncover the long-term line.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Warming up (line goes up)',
          [
            'Cooling down (line goes down)',
            'Staying completely flat',
            'Freezing colder every summer',
          ],
          rng,
        ),
        explanation:
          'Subtracting the huge seasonal swing exposes a strong upward warming trend across the Tibetan Plateau.',
      };

    case 'north-sea-evap-noise':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Spot Weather Noise',
        prompt: 'The 10-year North Sea evaporation chart jumps around with stormy weather. Can we be sure it changed?',
        helperText: 'Check the yellow "Not Sure Yet" badge below the chart.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'No — 10 stormy years are too noisy to prove a trend',
          [
            'Yes — evaporation definitely rose every year',
            'Yes — evaporation dropped to zero',
            'Yes — wind noise proves warming automatically',
          ],
          rng,
        ),
        explanation:
          'When storm noise scatters a short 10-year record, scientists wait for more years of data before claiming a trend.',
      };

    case 'murray-darling-rain':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        difficulty,
        caseNumber: c.caseNumber,
        categoryLabel: 'Hard · More Data Check',
        prompt: 'On 11 years of rain data, the Murray-Darling Basin looks uncertain. Click "Try 24 yr" — what happens?',
        helperText: 'Click "Try 24 yr" above the chart and check the Trend Check badge below.',
        visualKind: 'chart',
        showExtendedHelper: true,
        showPValueBadge: true,
        choices: makeChoices(
          'With 24 years, the downward drying trend becomes clear and proven',
          [
            'With 24 years, rainfall switches to rising steeply',
            'Even 24 years stays uncertain',
            'Adding more years removes all rain from the chart',
          ],
          rng,
        ),
        explanation:
          'Extending a noisy rainfall record from 11 to 24 years turns uncertainty into clear proof of drying.',
      };

    case 'great-lakes-warming':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Seasonal Swings',
        prompt: 'Cold winters and warm summers swing Great Lakes temperatures wildly. Click "Remove Seasons" — is it warming or cooling?',
        helperText: 'Click "Remove Seasons" above the chart to strip out the yearly temperature wave.',
        visualKind: 'chart',
        showSeasonalHelper: true,
        choices: makeChoices(
          'Warming up (line goes up)',
          [
            'Cooling down (line goes down)',
            'Staying completely flat',
            'Freezing colder every summer',
          ],
          rng,
        ),
        explanation:
          'Once the big ±12 °C seasonal wave is removed, Great Lakes temperatures show a clear upward warming trend.',
      };

    case 'estuary-evap':
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: 'Hard · Spot Weather Noise',
        prompt:
          'The 10-year Chesapeake Bay chart jumps up and down a lot. Can we be sure evaporation is rising?',
        helperText: 'Look at the yellow "Not Sure Yet" badge below the chart.',
        visualKind: 'chart',
        showPValueBadge: true,
        choices: makeChoices(
          'No — 10 years is too noisy to be sure yet',
          [
            'Yes — it is 100% proven beyond doubt',
            'Yes — evaporation dropped straight to zero',
            'Yes — every single year went up',
          ],
          rng,
        ),
        explanation:
          'When a short 10-year chart bounces around a lot, good scientists wait for more years of data before claiming a trend.',
      };

    default: {
      const moreSpec = MORE_QUIZ_PROMPTS[c.id];
      if (moreSpec) {
        const choices =
          moreSpec.visualKind === 'map'
            ? shuffleOptions(
                c.regionOptions.map((r) => ({
                  id: r.id,
                  label: `${r.name} (${r.coordinatesLabel})`,
                  isCorrect: r.isTarget,
                })),
                rng,
              )
            : moreSpec.visualKind === 'variable'
              ? shuffleOptions(
                  c.variableOptions.slice(0, 4).map((v) => ({
                    id: v.id,
                    label: `${cleanMeasurementLabel(v.name)} (${v.source})`,
                    isCorrect: v.quality !== 'distractor',
                  })),
                  rng,
                )
              : makeChoices(moreSpec.correctLabel, moreSpec.distractors, rng);
        return {
          id: `quiz-${c.id}`,
          caseId: c.id,
          caseNumber: c.caseNumber,
          difficulty,
          categoryLabel: moreSpec.categoryLabel,
          prompt: moreSpec.prompt,
          helperText: moreSpec.helperText,
          visualKind: moreSpec.visualKind,
          showSeasonalHelper: moreSpec.showSeasonalHelper,
          showExtendedHelper: moreSpec.showExtendedHelper,
          showPValueBadge: moreSpec.showPValueBadge,
          choices,
          explanation: moreSpec.explanation,
        };
      }
      return {
        id: `quiz-${c.id}`,
        caseId: c.id,
        caseNumber: c.caseNumber,
        difficulty,
        categoryLabel: `${DIFFICULTY_RULES[difficulty].label} · Read the Chart`,
        prompt: c.question,
        helperText: 'Compare the left side of the chart to the right side.',
        visualKind: 'chart',
        choices: makeChoices(
          c.expectedDirection === 'rising'
            ? 'Going up over time'
            : c.expectedDirection === 'falling'
              ? 'Going down over time'
              : 'Staying flat with no real trend',
          [
            c.expectedDirection === 'rising'
              ? 'Going down rapidly'
              : 'Going up rapidly',
            'Swinging down to zero every year',
            'Completely missing data',
          ],
          rng,
        ),
        explanation: c.debriefTakeaway,
      };
    }
  }
}

export function buildQuestionForCase(
  c: DetectiveCase,
  rng: () => number,
  allowVariants = false,
): QuizQuestion {
  const primary = buildPrimaryQuestionForCase(c, rng);
  if (!allowVariants) {
    return primary;
  }

  const tierLabel = DIFFICULTY_RULES[c.difficulty].label;
  const targetRegion = c.regionOptions.find((r) => r.isTarget);
  const targetVar = c.variableOptions.find((v) => v.id === c.targetVariableId);
  const roll = rng();

  if (
    roll >= 0.5 &&
    roll < 0.75 &&
    primary.visualKind !== 'map' &&
    targetRegion &&
    c.regionOptions.length === 4 &&
    c.regionOptions.filter((r) => r.isTarget).length === 1
  ) {
    return {
      id: `quiz-${c.id}`,
      caseId: c.id,
      caseNumber: c.caseNumber,
      difficulty: c.difficulty,
      categoryLabel: `${tierLabel} · Find on the Map`,
      prompt: `Where on the world map is ${targetRegion.name}?`,
      helperText: `Clue: ${targetRegion.characteristics}`,
      visualKind: 'map',
      choices: shuffleOptions(
        c.regionOptions.map((r) => ({
          id: r.id,
          label: r.name,
          isCorrect: r.isTarget,
        })),
        rng,
      ),
      explanation: `${targetRegion.name}: ${targetRegion.characteristics} ${c.debriefTakeaway}`,
    };
  }

  if (
    roll >= 0.75 &&
    primary.visualKind !== 'variable' &&
    targetRegion &&
    targetVar &&
    c.variableOptions.length === 4 &&
    c.variableOptions.filter((v) => v.id === c.targetVariableId).length === 1
  ) {
    const cleanTargetName = cleanMeasurementLabel(targetVar.name);
    return {
      id: `quiz-${c.id}`,
      caseId: c.id,
      caseNumber: c.caseNumber,
      difficulty: c.difficulty,
      categoryLabel: `${tierLabel} · Pick the Tool`,
      prompt: `Which satellite measurement helps check ${targetRegion.name}?`,
      helperText: 'Read the 4 sensor cards on the left and pick the right match.',
      visualKind: 'variable',
      choices: shuffleOptions(
        c.variableOptions.map((v) => ({
          id: v.id,
          label: cleanMeasurementLabel(v.name),
          isCorrect: v.id === c.targetVariableId,
        })),
        rng,
      ),
      explanation: `${cleanTargetName}: ${targetVar.definition}`,
    };
  }

  return primary;
}

export function buildQuizDeck(
  cases: readonly DetectiveCase[],
  options: {
    difficulty?: DifficultyFilter;
    shuffleQuestions?: boolean;
    varyQuestions?: boolean;
    seenCaseIds?: ReadonlySet<string>;
    rng?: () => number;
  } = {},
): QuizQuestion[] {
  const rng = options.rng ?? Math.random;
  const difficulty = options.difficulty ?? 'all';
  const shouldShuffle = options.shuffleQuestions ?? false;
  const shouldVary = options.varyQuestions ?? shouldShuffle;
  const filtered = filterCasesByDifficulty(
    cases,
    difficulty,
    shouldShuffle ? rng : undefined,
    options.seenCaseIds,
  );
  const questions = filtered.map((c) =>
    buildQuestionForCase(c, rng, shouldVary),
  );
  return shouldShuffle ? shuffleOptions(questions, rng) : questions;
}

export interface QuizAnswerScore {
  base: number;
  streakBonus: number;
  speedBonus: number;
  difficultyBonus: number;
  total: number;
}

export const QUIZ_SPEED_BONUS_WINDOW_SEC = 12;
export const MAX_QUIZ_ATTEMPTS = 2;

export function scoreQuizAnswer(params: {
  isCorrect: boolean;
  streakAfter: number;
  usedFiftyFifty: boolean;
  elapsedSec: number;
  attemptNumber?: number;
  difficulty?: DifficultyLevel;
  speedWindowSec?: number;
  scoreMultiplier?: number;
}): QuizAnswerScore {
  if (!params.isCorrect) {
    return {
      base: 0,
      streakBonus: 0,
      speedBonus: 0,
      difficultyBonus: 0,
      total: 0,
    };
  }

  const attempt = params.attemptNumber ?? 1;
  const speedWindow =
    params.speedWindowSec ??
    (params.difficulty
      ? DIFFICULTY_RULES[params.difficulty].speedWindowSec
      : QUIZ_SPEED_BONUS_WINDOW_SEC);
  const multiplier =
    params.scoreMultiplier ??
    (params.difficulty ? DIFFICULTY_RULES[params.difficulty].scoreMultiplier : 1);

  const base = attempt <= 1 ? 100 : 60;
  const streakBonus =
    attempt <= 1 && params.streakAfter >= 2
      ? Math.min(50, (params.streakAfter - 1) * 10)
      : 0;
  const speedBonus =
    attempt <= 1 && !params.usedFiftyFifty && params.elapsedSec <= speedWindow
      ? 25
      : 0;
  const subtotal = base + streakBonus + speedBonus;
  const difficultyBonus = Math.round(subtotal * (multiplier - 1));

  return {
    base,
    streakBonus,
    speedBonus,
    difficultyBonus,
    total: subtotal + difficultyBonus,
  };
}

export function pickFiftyFiftyEliminations(
  choices: readonly QuizChoice[],
  rng: () => number = Math.random,
): string[] {
  const wrongIds = choices.filter((c) => !c.isCorrect).map((c) => c.id);
  return shuffleOptions(wrongIds, rng).slice(0, 2);
}

