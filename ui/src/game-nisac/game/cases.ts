import type {
  SeriesConfig,
  SignificanceVerdict,
  TrendDirection,
} from './statistics';
import { EXTRA_EASY_CASES } from './easyCases';
import {
  EXPANDED_EASY_CASES,
  EXPANDED_HARD_CASES,
  EXPANDED_MEDIUM_CASES,
} from './expandedCases';
import { MORE_CASES } from './moreCases';

export interface VariableOption {
  id: string;
  name: string;
  source: string;
  unit: string;
  definition: string;
  quality: 'optimal' | 'acceptable' | 'distractor';
  feedback: string;
}

export interface RegionOption {
  id: string;
  name: string;
  biomeLabel: string;
  coordinatesLabel: string;
  mapX: number; // 0..1000 SVG coordinate
  mapY: number; // 0..500 SVG coordinate
  characteristics: string;
  hint: string;
  isTarget: boolean;
  feedback: string;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type DifficultyFilter = 'all' | DifficultyLevel;

export interface DetectiveCase {
  id: string;
  caseNumber: string;
  title: string;
  question: string;
  briefing: string;
  difficulty: DifficultyLevel;
  difficultyLabel: string;
  keyInsightTag: string;
  unit: string;
  unitPerYear: string;
  variableOptions: VariableOption[];
  targetVariableId: string;
  regionOptions: RegionOption[];
  targetRegionId: string;
  seriesConfig: SeriesConfig;
  extendedYears?: number; // For demonstrating how a longer record affects significance
  expectedDirection: TrendDirection;
  expectedVerdict: SignificanceVerdict;
  slopeSliderMin: number;
  slopeSliderMax: number;
  slopeSliderStep: number;
  slopeTolerance: number;
  seasonalMaskNote: string;
  significanceExplanation: string;
  debriefTakeaway: string;
  comparisonPairId?: string;
}

const CORE_CASES: DetectiveCase[] = [
  {
    id: 'sahara-warming',
    caseNumber: 'Case 01',
    title: 'Sahara Desert Warming',
    question: 'Is the Sahara Desert getting warmer?',
    briefing:
      'Start with an easy warm-up! Weather satellites measure air temperature over Earth’s biggest hot desert. Pick the temperature sensor, find the Sahara on the map, and see if it is warming up.',
    difficulty: 'easy',
    difficultyLabel: 'Easy · Clear Trend',
    keyInsightTag: 'Clear Upward Climb',
    unit: '°C',
    unitPerYear: '°C/yr',
    targetVariableId: 'air-temp',
    variableOptions: [
      {
        id: 'air-temp',
        name: 'Air Temperature',
        source: 'AIRS',
        unit: '°C',
        definition: 'How warm or cool the air is near the ground.',
        quality: 'optimal',
        feedback:
          'Great pick! Air Temperature directly tells us if the desert is warming up.',
      },
      {
        id: 'evaporation',
        name: 'Water Evaporation',
        source: 'MERRA-2',
        unit: 'mm/mo',
        definition: 'How fast water dries up from the surface into the air.',
        quality: 'distractor',
        feedback:
          'Not this one. A dry desert has almost no water to evaporate, and this does not measure temperature.',
      },
      {
        id: 'ice-thickness',
        name: 'Sea Ice Thickness',
        source: 'ICESat-2 / CryoSat',
        unit: 'm',
        definition: 'How thick floating polar sea ice is.',
        quality: 'distractor',
        feedback:
          'Not this one. Sea ice is only in cold polar oceans, not a hot desert.',
      },
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much dust or smoke floats in the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Dust floats over the Sahara, but this measures dust—not air warmth.',
      },
    ],
    targetRegionId: 'sahara-erg',
    regionOptions: [
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Huge sunny desert across North Africa.',
        hint: 'Look across North Africa.',
        isTarget: true,
        feedback:
          'Found it: Sahara Desert! Even before removing seasons, the upward climb is easy to see.',
      },
      {
        id: 'arctic-ocean',
        name: 'Central Arctic Ocean',
        biomeLabel: 'Polar Sea Ice',
        coordinatesLabel: '80.0° N, 155.0° W',
        mapX: 168,
        mapY: 44,
        characteristics: 'Frozen ocean near the North Pole.',
        hint: 'Polar ice is far north of the Sahara.',
        isTarget: false,
        feedback: 'Wrong spot. Pick the Sahara Desert in North Africa.',
      },
      {
        id: 'southern-amazon',
        name: 'Amazon Rainforest',
        biomeLabel: 'Rainforest',
        coordinatesLabel: '10.5° S, 61.0° W',
        mapX: 318,
        mapY: 292,
        characteristics: 'Wet tropical forest in South America.',
        hint: 'Rainforest in South America, not a desert.',
        isTarget: false,
        feedback: 'Wrong spot. The Sahara is in North Africa, not South America.',
      },
      {
        id: 'chesapeake-estuary',
        name: 'Chesapeake Bay',
        biomeLabel: 'Coastal Bay',
        coordinatesLabel: '38.3° N, 76.2° W',
        mapX: 274,
        mapY: 146,
        characteristics: 'Coastal bay in North America.',
        hint: 'US East Coast, not an African desert.',
        isTarget: false,
        feedback: 'Wrong spot. Look to North Africa for the Sahara Desert.',
      },
    ],
    seriesConfig: {
      seed: 10101,
      startYear: 2006,
      numYears: 18,
      baseline: 26.4,
      slopePerYear: 0.068,
      seasonalAmplitude: 1.5,
      seasonalPhaseMonths: 7,
      noiseStd: 0.24,
      autocorrelation: 0.15,
    },
    expectedDirection: 'rising',
    expectedVerdict: 'significant',
    slopeSliderMin: -0.2,
    slopeSliderMax: 0.2,
    slopeSliderStep: 0.005,
    slopeTolerance: 0.03,
    seasonalMaskNote:
      'You can see the temperature climbing right away on the chart, and removing seasons makes the line even clearer.',
    significanceExplanation:
      'Both tests give p < 0.0001 and the 95% range stays well above zero—clear proof of warming.',
    debriefTakeaway:
      'When a multi-year trend is strong and noise is small, it is easy to spot right away.',
  },
  {
    id: 'antarctic-ozone',
    caseNumber: 'Case 02',
    title: 'Antarctic Ozone Healing',
    question: 'Is the ozone layer over Antarctica healing?',
    briefing:
      'Years ago, countries banned chemicals that harmed Earth’s protective ozone layer. Pick the ozone sensor, find Antarctica, and see if the ozone layer is growing back.',
    difficulty: 'easy',
    difficultyLabel: 'Easy · Clear Trend',
    keyInsightTag: 'Clear Long-Term Recovery',
    unit: 'DU',
    unitPerYear: 'DU/yr',
    targetVariableId: 'ozone',
    variableOptions: [
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition:
          'Measures how thick the sky’s protective UV ozone shield is (in Dobson Units).',
        quality: 'optimal',
        feedback:
          'Great pick! Ozone Layer (DU) directly shows whether the ozone shield is growing back.',
      },
      {
        id: 'precipitation',
        name: 'Rain & Snow',
        source: 'GPM',
        unit: 'mm/mo',
        definition: 'How much rain and snow falls each month.',
        quality: 'distractor',
        feedback:
          'Not this one. Rain and snow do not measure the ozone layer high in the sky.',
      },
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition: 'Water stored in unfrozen dirt and land soil.',
        quality: 'distractor',
        feedback:
          'Not this one. Antarctica is covered in ice, and soil water does not measure ozone.',
      },
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much smoke, dust, or smog is in the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Haze measures tiny particles, while ozone is a protective gas high up.',
      },
    ],
    targetRegionId: 'antarctic-vortex',
    regionOptions: [
      {
        id: 'antarctic-vortex',
        name: 'Antarctica',
        biomeLabel: 'South Pole',
        coordinatesLabel: '75.0° S, 0.0° E',
        mapX: 500,
        mapY: 478,
        characteristics: 'Frozen continent at the South Pole.',
        hint: 'At the very bottom of the world map.',
        isTarget: true,
        feedback:
          'Found it: Antarctica! Watch the 20-year ozone climb.',
      },
      {
        id: 'beijing-metro',
        name: 'Beijing, China',
        biomeLabel: 'Large City',
        coordinatesLabel: '39.9° N, 116.4° E',
        mapX: 805,
        mapY: 142,
        characteristics: 'Big city in East Asia.',
        hint: 'That is East Asia, not the South Pole.',
        isTarget: false,
        feedback: 'Wrong spot. Look at Antarctica at the bottom of the map.',
      },
      {
        id: 'sahel-belt',
        name: 'Sahel Region, Africa',
        biomeLabel: 'Dry Grassland',
        coordinatesLabel: '14.5° N, 2.0° E',
        mapX: 500,
        mapY: 214,
        characteristics: 'Dry grassland in Africa.',
        hint: 'Africa is nowhere near the South Pole.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Antarctica at the bottom of the map.',
      },
      {
        id: 'southern-amazon',
        name: 'Amazon Rainforest',
        biomeLabel: 'Rainforest',
        coordinatesLabel: '10.5° S, 61.0° W',
        mapX: 318,
        mapY: 292,
        characteristics: 'Tropical forest in South America.',
        hint: 'Look farther south to the icy continent.',
        isTarget: false,
        feedback: 'Wrong spot. Antarctica is at the bottom of the globe.',
      },
    ],
    seriesConfig: {
      seed: 20202,
      startYear: 2004,
      numYears: 20,
      baseline: 206,
      slopePerYear: 1.85,
      seasonalAmplitude: 13.5,
      seasonalPhaseMonths: 10,
      noiseStd: 3.4,
      autocorrelation: 0.15,
    },
    expectedDirection: 'rising',
    expectedVerdict: 'significant',
    slopeSliderMin: -4.0,
    slopeSliderMax: 4.0,
    slopeSliderStep: 0.1,
    slopeTolerance: 0.7,
    seasonalMaskNote:
      'Over 20 years, ozone climbs by ~37 Dobson Units—easy to see even before removing the annual cycle.',
    significanceExplanation:
      'Both tests give p < 0.0001 and the 95% range stays well above zero.',
    debriefTakeaway:
      'Satellite tracking shows the ozone layer over Antarctica is steadily healing after harmful chemicals were banned.',
  },
  {
    id: 'atlantic-warming',
    caseNumber: 'Case 03',
    title: 'Atlantic Ocean Warming',
    question: 'Is the Tropical Atlantic Ocean warming up?',
    briefing:
      'Oceans soak up huge amounts of heat and warm up smoothly without wild day-to-day jumps. Pick the temperature sensor, find the Tropical Atlantic, and check the upward trend.',
    difficulty: 'easy',
    difficultyLabel: 'Easy · Clear Trend',
    keyInsightTag: 'Smooth Ocean Warming',
    unit: '°C',
    unitPerYear: '°C/yr',
    targetVariableId: 'air-temp',
    variableOptions: [
      {
        id: 'air-temp',
        name: 'Surface Temperature',
        source: 'AIRS',
        unit: '°C',
        definition: 'How warm or cool the air and ocean surface are.',
        quality: 'optimal',
        feedback:
          'Great pick! Surface Temperature directly tracks whether the Atlantic is warming.',
      },
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition: 'Water stored in dirt and land soil.',
        quality: 'distractor',
        feedback:
          'Not this one. Open ocean has no dirt or land soil.',
      },
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition: 'Thickness of the protective UV ozone layer.',
        quality: 'distractor',
        feedback:
          'Not this one. Ozone blocks UV rays high up—it does not measure ocean heat.',
      },
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much dust or smoke is floating in the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Desert dust sometimes blows over the ocean, but this measures dust—not warmth.',
      },
    ],
    targetRegionId: 'tropical-atlantic',
    regionOptions: [
      {
        id: 'tropical-atlantic',
        name: 'Tropical Atlantic Ocean',
        biomeLabel: 'Warm Ocean',
        coordinatesLabel: '15.0° N, 45.0° W',
        mapX: 375,
        mapY: 215,
        characteristics: 'Warm open ocean between West Africa and the Caribbean.',
        hint: 'Middle of the Atlantic Ocean between Africa and the Americas.',
        isTarget: true,
        feedback:
          'Found it: Tropical Atlantic! Notice how smooth and steady the warming line is.',
      },
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Inland desert in North Africa.',
        hint: 'That is land in Africa, not the Atlantic Ocean.',
        isTarget: false,
        feedback: 'Wrong spot. Pick the Tropical Atlantic Ocean to the west.',
      },
      {
        id: 'arctic-ocean',
        name: 'Central Arctic Ocean',
        biomeLabel: 'Polar Sea Ice',
        coordinatesLabel: '80.0° N, 155.0° W',
        mapX: 168,
        mapY: 44,
        characteristics: 'Frozen polar ocean.',
        hint: 'Look farther south into the warm Atlantic.',
        isTarget: false,
        feedback: 'Wrong spot. The Tropical Atlantic is near 15° N.',
      },
      {
        id: 'delhi-metro',
        name: 'Delhi, India',
        biomeLabel: 'Large City',
        coordinatesLabel: '28.6° N, 77.2° E',
        mapX: 696,
        mapY: 173,
        characteristics: 'Inland city in northern India.',
        hint: 'Inland city in India, not an ocean.',
        isTarget: false,
        feedback: 'Wrong spot. Pick the Tropical Atlantic Ocean.',
      },
    ],
    seriesConfig: {
      seed: 30303,
      startYear: 2004,
      numYears: 20,
      baseline: 25.1,
      slopePerYear: 0.045,
      seasonalAmplitude: 0.78,
      seasonalPhaseMonths: 9,
      noiseStd: 0.14,
      autocorrelation: 0.18,
    },
    expectedDirection: 'rising',
    expectedVerdict: 'significant',
    slopeSliderMin: -0.15,
    slopeSliderMax: 0.15,
    slopeSliderStep: 0.005,
    slopeTolerance: 0.025,
    seasonalMaskNote:
      'Tropical oceans only change by ~0.8 °C between seasons, so the upward climb is easy to see in every view.',
    significanceExplanation:
      'Both tests give p < 0.0001 and the 95% range stays well above zero.',
    debriefTakeaway:
      'Because ocean water warms steadily with very little random noise, ocean warming trends show up very clearly.',
  },
  {
    id: 'la-air-clarity',
    caseNumber: 'Case 04',
    title: 'Los Angeles Clean Air',
    question: 'Is the air in Los Angeles getting cleaner?',
    briefing:
      'Cleaner car rules helped clear smog across Southern California. Pick the air haze sensor, find Los Angeles, and check if air pollution is falling.',
    difficulty: 'easy',
    difficultyLabel: 'Easy · Clear Falling Trend',
    keyInsightTag: 'Clear Drop in City Smog',
    unit: 'AOD',
    unitPerYear: 'AOD/yr',
    targetVariableId: 'aod',
    variableOptions: [
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'Measures how much smoke, smog, and dust is floating in the air.',
        quality: 'optimal',
        feedback:
          'Great pick! Air Haze (AOD) directly tracks particle pollution over cities.',
      },
      {
        id: 'precipitation',
        name: 'Rain & Snow',
        source: 'GPM',
        unit: 'mm/mo',
        definition: 'Monthly rain totals.',
        quality: 'distractor',
        feedback:
          'Not this one. Rain totals do not measure smog or air pollution.',
      },
      {
        id: 'ice-thickness',
        name: 'Sea Ice Thickness',
        source: 'ICESat-2 / CryoSat',
        unit: 'm',
        definition: 'How thick floating polar sea ice is.',
        quality: 'distractor',
        feedback:
          'Not this one. Southern California has no polar sea ice.',
      },
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition: 'Water stored in land soil.',
        quality: 'distractor',
        feedback:
          'Not this one. Soil water measures wet ground, not air pollution.',
      },
    ],
    targetRegionId: 'los-angeles',
    regionOptions: [
      {
        id: 'los-angeles',
        name: 'Los Angeles, USA',
        biomeLabel: 'Large City',
        coordinatesLabel: '34.1° N, 118.2° W',
        mapX: 162,
        mapY: 156,
        characteristics: 'Big city on the California coast.',
        hint: 'On the west coast of North America.',
        isTarget: true,
        feedback:
          'Found it: Los Angeles! Look at the steady multi-year drop in air haze.',
      },
      {
        id: 'southern-amazon',
        name: 'Amazon Rainforest',
        biomeLabel: 'Rainforest',
        coordinatesLabel: '10.5° S, 61.0° W',
        mapX: 318,
        mapY: 292,
        characteristics: 'South American tropical forest.',
        hint: 'Look on the west coast of North America.',
        isTarget: false,
        feedback: 'Wrong spot. Los Angeles is on the US West Coast, not South America.',
      },
      {
        id: 'antarctic-vortex',
        name: 'Antarctica',
        biomeLabel: 'South Pole',
        coordinatesLabel: '75.0° S, 0.0° E',
        mapX: 500,
        mapY: 478,
        characteristics: 'Frozen South Pole continent.',
        hint: 'That is Antarctica, not a California city.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Los Angeles in western North America.',
      },
      {
        id: 'sahel-belt',
        name: 'Sahel Region, Africa',
        biomeLabel: 'Dry Grassland',
        coordinatesLabel: '14.5° N, 2.0° E',
        mapX: 500,
        mapY: 214,
        characteristics: 'Dry grassland in Africa.',
        hint: 'That is Africa, not Los Angeles.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Los Angeles on the US West Coast.',
      },
    ],
    seriesConfig: {
      seed: 40404,
      startYear: 2006,
      numYears: 18,
      baseline: 0.34,
      slopePerYear: -0.011,
      seasonalAmplitude: 0.032,
      seasonalPhaseMonths: 8,
      noiseStd: 0.016,
      autocorrelation: 0.15,
      minClamp: 0.05,
    },
    expectedDirection: 'falling',
    expectedVerdict: 'significant',
    slopeSliderMin: -0.03,
    slopeSliderMax: 0.03,
    slopeSliderStep: 0.001,
    slopeTolerance: 0.006,
    seasonalMaskNote:
      'Summer smoke causes occasional small bumps, but the overall downward drop is clear in every view.',
    significanceExplanation:
      'Both tests give p < 0.0001 and the 95% range stays well below zero.',
    debriefTakeaway:
      'Cleaner vehicle rules produce clear, measurable drops in city air haze.',
  },
  {
    id: 'amazon-drying',
    caseNumber: 'Case 25',
    title: 'Amazon Forest Drying',
    question: 'Is the Amazon rainforest getting drier?',
    briefing:
      'Wet and dry seasons make Amazon data swing wildly up and down every year. Pick the soil water data, find the Amazon, and remove the seasonal swings to spot the hidden trend.',
    difficulty: 'hard',
    difficultyLabel: 'Hard · Seasonal Swings',
    keyInsightTag: 'Seasons Can Hide a Real Trend',
    unit: 'mm',
    unitPerYear: 'mm/yr',
    targetVariableId: 'soil-moisture',
    variableOptions: [
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition:
          'How much water is stored in the top 1 meter of ground soil.',
        quality: 'optimal',
        feedback:
          'Great pick! Soil Water shows clearly whether the forest ground is drying out over time.',
      },
      {
        id: 'precipitation',
        name: 'Rain & Snow',
        source: 'GPM',
        unit: 'mm/mo',
        definition: 'Monthly rainfall measured by weather satellites.',
        quality: 'acceptable',
        feedback:
          'Good choice! Monthly rain is helpful too, though Soil Water shows long-term forest drying even more smoothly.',
      },
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much smoke, dust, or haze is in the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Smoke shows up during fires, but haze measures smoke—not water in the ground.',
      },
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition: 'Thickness of the protective UV ozone shield.',
        quality: 'distractor',
        feedback:
          'Not this one. Ozone high in the sky does not measure drought or wet soil.',
      },
      {
        id: 'evaporation',
        name: 'Water Evaporation',
        source: 'MERRA-2',
        unit: 'mm/mo',
        definition: 'How fast moisture tries to evaporate into the air.',
        quality: 'acceptable',
        feedback:
          'Helpful clue—warm air dries things faster—though Soil Water directly tracks how much water stays in the ground.',
      },
    ],
    targetRegionId: 'southern-amazon',
    regionOptions: [
      {
        id: 'southern-amazon',
        name: 'Southern Amazon Rainforest',
        biomeLabel: 'Rainforest',
        coordinatesLabel: '10.5° S, 61.0° W',
        mapX: 318,
        mapY: 292,
        characteristics:
          'Big South American forest with a very wet rainy season and a dry season.',
        hint: 'Big wet-to-dry swings each year can hide a slower multi-year trend.',
        isTarget: true,
        feedback:
          'Found it: Southern Amazon! Watch how removing the big wet/dry season reveals the hidden drop.',
      },
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Dry desert with almost no soil water all year.',
        hint: 'Already dry all year—not a rainforest.',
        isTarget: false,
        feedback:
          'Wrong spot. The Sahara is already dry desert, not the Amazon rainforest.',
      },
      {
        id: 'chesapeake-estuary',
        name: 'Chesapeake Bay',
        biomeLabel: 'Coastal Bay',
        coordinatesLabel: '38.3° N, 76.2° W',
        mapX: 274,
        mapY: 146,
        characteristics: 'Coastal bay in North America.',
        hint: 'US East Coast, not a South American rainforest.',
        isTarget: false,
        feedback:
          'Wrong spot. Chesapeake Bay is in North America, not the Amazon.',
      },
      {
        id: 'beijing-metro',
        name: 'Beijing, China',
        biomeLabel: 'Large City',
        coordinatesLabel: '39.9° N, 116.4° E',
        mapX: 805,
        mapY: 142,
        characteristics: 'Large city in East Asia.',
        hint: 'That is a city in China, not the Amazon rainforest.',
        isTarget: false,
        feedback:
          'Wrong spot. Look to South America for the Amazon rainforest.',
      },
    ],
    seriesConfig: {
      seed: 10421,
      startYear: 2010,
      numYears: 14,
      baseline: 310,
      slopePerYear: -0.78,
      seasonalAmplitude: 72,
      seasonalHarmonic2: 0.15,
      seasonalPhaseMonths: 3, // Peak in March
      noiseStd: 5.0,
      autocorrelation: 0.2,
      minClamp: 80,
    },
    expectedDirection: 'falling',
    expectedVerdict: 'significant',
    slopeSliderMin: -3.0,
    slopeSliderMax: 3.0,
    slopeSliderStep: 0.1,
    slopeTolerance: 0.6,
    seasonalMaskNote:
      'In the raw chart, giant ±72 mm wet/dry season swings hide the slower drop. Click Deseasonalized Series to strip out the seasons and see the clear downward line!',
    significanceExplanation:
      'Once seasons are removed, both tests give p < 0.001 and the 95% range stays well below zero.',
    debriefTakeaway:
      'Big seasonal swings act like loud noise: they can hide a real, steady trend until you subtract the yearly cycle.',
  },
  {
    id: 'beijing-air',
    caseNumber: 'Case 26',
    title: 'Beijing Air Quality',
    question: 'Is the air in Beijing getting cleaner or dirtier?',
    briefing:
      'Beijing used to have heavy winter smog, then passed strict clean-air laws. Pick the air haze sensor, find Beijing, and check which way the pollution actually moved.',
    difficulty: 'hard',
    difficultyLabel: 'Hard · Trend Direction Check',
    keyInsightTag: 'Same Sensor Can Go Up or Down by City',
    unit: 'AOD',
    unitPerYear: 'AOD/yr',
    targetVariableId: 'aod',
    comparisonPairId: 'delhi-air',
    variableOptions: [
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much smoke, smog, and dust is floating in the air.',
        quality: 'optimal',
        feedback:
          'Great pick! Air Haze (AOD) is the main satellite tool for tracking city smog.',
      },
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition: 'Total ozone gas column in the sky.',
        quality: 'acceptable',
        feedback:
          'Close—ozone plays a small part in smog, though Air Haze (AOD) measures fine smog particles directly.',
      },
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition: 'Water stored in land soil.',
        quality: 'distractor',
        feedback:
          'Not this one. Soil water tracks wet dirt, not air pollution over a city.',
      },
      {
        id: 'precipitation',
        name: 'Rain & Snow',
        source: 'GPM',
        unit: 'mm/mo',
        definition: 'Monthly rainfall measured from space.',
        quality: 'distractor',
        feedback:
          'Not this one. Rain can wash air briefly, but rain totals do not measure how polluted the air is.',
      },
    ],
    targetRegionId: 'beijing-metro',
    regionOptions: [
      {
        id: 'beijing-metro',
        name: 'Beijing, China',
        biomeLabel: 'Large City',
        coordinatesLabel: '39.9° N, 116.4° E',
        mapX: 805,
        mapY: 142,
        characteristics: 'Huge city in northern China with clean-air rules after 2013.',
        hint: 'Look in northeastern China near 40° N.',
        isTarget: true,
        feedback:
          'Found it: Beijing! Look closely at the chart—do not guess without checking the line!',
      },
      {
        id: 'southern-amazon',
        name: 'Amazon Rainforest',
        biomeLabel: 'Rainforest',
        coordinatesLabel: '10.5° S, 61.0° W',
        mapX: 318,
        mapY: 292,
        characteristics: 'Remote South American rainforest.',
        hint: 'That is a forest, not a big city.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Beijing in East Asia.',
      },
      {
        id: 'arctic-ocean',
        name: 'Arctic Ocean',
        biomeLabel: 'Polar Sea Ice',
        coordinatesLabel: '74.0° N, 145.0° W',
        mapX: 145,
        mapY: 56,
        characteristics: 'Frozen polar ocean.',
        hint: 'Frozen ocean, far from any big city.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Beijing in East Asia.',
      },
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Sandy desert in North Africa.',
        hint: 'Dusty desert, not a megacity.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Beijing in East Asia.',
      },
    ],
    seriesConfig: {
      seed: 20884,
      startYear: 2008,
      numYears: 16,
      baseline: 0.68,
      slopePerYear: -0.021,
      seasonalAmplitude: 0.11,
      seasonalHarmonic2: 0.1,
      seasonalPhaseMonths: 6,
      noiseStd: 0.048,
      autocorrelation: 0.22,
      minClamp: 0.12,
    },
    expectedDirection: 'falling',
    expectedVerdict: 'significant',
    slopeSliderMin: -0.06,
    slopeSliderMax: 0.06,
    slopeSliderStep: 0.002,
    slopeTolerance: 0.012,
    seasonalMaskNote:
      'Haze peaks at certain times of year, while cleaner-air rules pull the overall line clearly downward.',
    significanceExplanation:
      'Both tests give p < 0.0001 and the 95% range stays well below zero—proving Beijing’s air got cleaner.',
    debriefTakeaway:
      'Always check the real data! Beijing’s air haze dropped sharply. Compare this with Delhi in Case 49 to see the same sensor go the opposite way.',
  },
  {
    id: 'arctic-sea-ice',
    caseNumber: 'Case 27',
    title: 'Arctic Sea Ice Check',
    question: 'Is Arctic sea ice getting thinner?',
    briefing:
      'Every winter the Arctic Ocean freezes thick, and every summer it melts back. Pick the ice thickness sensor, find the Arctic, and look past the yearly freeze-melt cycle.',
    difficulty: 'hard',
    difficultyLabel: 'Hard · Seasonal Swings',
    keyInsightTag: 'Freeze-Melt Cycle Hides Thinning',
    unit: 'm',
    unitPerYear: 'm/yr',
    targetVariableId: 'ice-thickness',
    variableOptions: [
      {
        id: 'ice-thickness',
        name: 'Sea Ice Thickness',
        source: 'ICESat-2 / CryoSat',
        unit: 'm',
        definition:
          'How thick floating Arctic sea ice is, measured by space lasers and radar.',
        quality: 'optimal',
        feedback:
          'Great pick! Sea Ice Thickness directly measures whether the ice is getting thinner.',
      },
      {
        id: 'air-temp',
        name: 'Air Temperature',
        source: 'AIRS',
        unit: '°C',
        definition: 'How warm or cool the air is near the surface.',
        quality: 'acceptable',
        feedback:
          'Helpful clue since warm air melts ice—though Sea Ice Thickness measures the ice itself directly.',
      },
      {
        id: 'precipitation',
        name: 'Rain & Snow',
        source: 'GPM',
        unit: 'mm/mo',
        definition: 'Monthly rain and snow rate.',
        quality: 'distractor',
        feedback:
          'Not this one. Rain/snow totals do not measure how thick ocean ice is.',
      },
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition: 'Water stored in dirt on land.',
        quality: 'distractor',
        feedback:
          'Not this one. Floating sea ice is on the ocean, not in dirt.',
      },
    ],
    targetRegionId: 'arctic-ocean',
    regionOptions: [
      {
        id: 'arctic-ocean',
        name: 'Central Arctic Ocean',
        biomeLabel: 'Polar Sea Ice',
        coordinatesLabel: '80.0° N, 155.0° W',
        mapX: 168,
        mapY: 44,
        characteristics: 'Frozen polar ocean that freezes thick in winter and melts in summer.',
        hint: 'Look near the top of the map at 80° N.',
        isTarget: true,
        feedback:
          'Found it: Arctic Ocean! Notice how the huge winter-summer wave hides the slower thinning until you remove seasons.',
      },
      {
        id: 'sahel-belt',
        name: 'Sahel Region, Africa',
        biomeLabel: 'Dry Grassland',
        coordinatesLabel: '14.5° N, 2.0° E',
        mapX: 500,
        mapY: 214,
        characteristics: 'Warm grassland in Africa.',
        hint: 'No sea ice in Africa.',
        isTarget: false,
        feedback: 'Wrong spot. The Sahel is warm African grassland with no sea ice.',
      },
      {
        id: 'chesapeake-estuary',
        name: 'Chesapeake Bay',
        biomeLabel: 'Coastal Bay',
        coordinatesLabel: '38.3° N, 76.2° W',
        mapX: 274,
        mapY: 146,
        characteristics: 'Coastal bay in North America.',
        hint: 'Far south of the Arctic ice pack.',
        isTarget: false,
        feedback: 'Wrong spot. Pick the Central Arctic Ocean near the top of the map.',
      },
      {
        id: 'delhi-metro',
        name: 'Delhi, India',
        biomeLabel: 'Large City',
        coordinatesLabel: '28.6° N, 77.2° E',
        mapX: 696,
        mapY: 173,
        characteristics: 'Warm city in India.',
        hint: 'No sea ice in India.',
        isTarget: false,
        feedback: 'Wrong spot. Look near the North Pole.',
      },
    ],
    seriesConfig: {
      seed: 31902,
      startYear: 2010,
      numYears: 14,
      baseline: 2.35,
      slopePerYear: -0.018,
      seasonalAmplitude: 1.15,
      seasonalHarmonic2: 0.12,
      seasonalPhaseMonths: 4, // Peak thickness in April
      noiseStd: 0.07,
      autocorrelation: 0.25,
      minClamp: 0.25,
    },
    expectedDirection: 'falling',
    expectedVerdict: 'significant',
    slopeSliderMin: -0.1,
    slopeSliderMax: 0.1,
    slopeSliderStep: 0.005,
    slopeTolerance: 0.015,
    seasonalMaskNote:
      'Sea ice grows and melts by over 2 meters every year! Click Deseasonalized Series to remove that yearly wave and uncover the real thinning trend.',
    significanceExplanation:
      'After removing the freeze-melt cycle, both tests give p < 0.0001—proving the ice is thinning.',
    debriefTakeaway:
      'Even a big climate change can look hidden when the summer-to-winter cycle is 20× bigger than the change per year.',
  },
  {
    id: 'sahel-rainfall',
    caseNumber: 'Case 28',
    title: 'Sahel Rain & Record Length',
    question: 'Is the Sahel region in Africa getting more rain?',
    briefing:
      'Twelve years of rain data (2012–2023) can bounce up and down a lot. Pick the rain sensor, find the Sahel in Africa, and test whether 12 years is enough to be sure—or if 24 years makes it clear.',
    difficulty: 'hard',
    difficultyLabel: 'Hard · Short vs. Long Record',
    keyInsightTag: 'Longer Records Make Trends Clearer',
    unit: 'mm',
    unitPerYear: 'mm/yr',
    targetVariableId: 'precipitation',
    variableOptions: [
      {
        id: 'precipitation',
        name: 'Rain & Snow',
        source: 'GPM',
        unit: 'mm/mo',
        definition: 'Monthly rainfall measured by weather satellites.',
        quality: 'optimal',
        feedback:
          'Great pick! Rain & Snow directly measures whether the Sahel is getting more rain.',
      },
      {
        id: 'soil-moisture',
        name: 'Soil Water',
        source: 'GLDAS',
        unit: 'mm',
        definition: 'Water stored in the top meter of soil.',
        quality: 'acceptable',
        feedback:
          'Helpful clue since rain wets the ground, though Rain & Snow measures rainfall directly.',
      },
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition: 'Thickness of the protective UV ozone shield.',
        quality: 'distractor',
        feedback:
          'Not this one. Ozone does not measure rainfall.',
      },
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much dust or smoke is in the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Dust blows near the Sahel, but haze measures dust—not rain.',
      },
    ],
    targetRegionId: 'sahel-belt',
    regionOptions: [
      {
        id: 'sahel-belt',
        name: 'Sahel Region, Africa',
        biomeLabel: 'Dry Grassland',
        coordinatesLabel: '14.5° N, 2.0° E',
        mapX: 500,
        mapY: 214,
        characteristics: 'Dry grassland belt just south of the Sahara Desert.',
        hint: 'Just below the Sahara in West/Central Africa.',
        isTarget: true,
        feedback:
          'Found it: the Sahel! Notice how bouncy the rain numbers look over just 12 years.',
      },
      {
        id: 'arctic-ocean',
        name: 'Central Arctic Ocean',
        biomeLabel: 'Polar Sea Ice',
        coordinatesLabel: '80.0° N, 155.0° W',
        mapX: 168,
        mapY: 44,
        characteristics: 'Frozen polar ocean.',
        hint: 'That is the Arctic, not Africa.',
        isTarget: false,
        feedback: 'Wrong spot. The Sahel is in Africa just south of the Sahara.',
      },
      {
        id: 'southern-amazon',
        name: 'Amazon Rainforest',
        biomeLabel: 'Rainforest',
        coordinatesLabel: '10.5° S, 61.0° W',
        mapX: 318,
        mapY: 292,
        characteristics: 'South American rainforest.',
        hint: 'Look in Africa, not South America.',
        isTarget: false,
        feedback: 'Wrong spot. The Sahel spans Africa south of the Sahara.',
      },
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Hot desert just north of the Sahel.',
        hint: 'Almost! Look one step south where summer rains arrive.',
        isTarget: false,
        feedback:
          'Very close! The Sahara stays dry desert—pick the Sahel right below it.',
      },
    ],
    seriesConfig: {
      seed: 44019,
      startYear: 2012,
      numYears: 12,
      baseline: 52,
      slopePerYear: 1.55,
      seasonalAmplitude: 42,
      seasonalHarmonic2: 0.22,
      seasonalPhaseMonths: 8, // August monsoon peak
      noiseStd: 22,
      autocorrelation: 0.15,
      minClamp: 0,
    },
    extendedYears: 24,
    expectedDirection: 'rising',
    expectedVerdict: 'not_significant',
    slopeSliderMin: -6.0,
    slopeSliderMax: 6.0,
    slopeSliderStep: 0.2,
    slopeTolerance: 1.8,
    seasonalMaskNote:
      'Even after removing the summer rainy season, 12 years of rain still bounces up and down a lot compared to the gentle upward tilt.',
    significanceExplanation:
      'On 12 years of data, the line tilts up (+1.5 mm/yr), yet p > 0.05 and the 95% range still crosses 0—so 12 years is not enough to prove it yet! Try clicking 24 yr in the Record Length Explorer above to see how more years make it significant.',
    debriefTakeaway:
      '“Not proven yet” does NOT mean nothing is happening—it means 12 noisy years are too short to be sure. With 24 years of data, the trend becomes crystal clear!',
  },
  {
    id: 'delhi-air',
    caseNumber: 'Case 29',
    title: 'Delhi Air Quality Contrast',
    question: 'Is the air in Delhi getting dirtier?',
    briefing:
      'In Case 46, air haze in Beijing went down. Now check the exact same air haze sensor over Delhi in northern India to see if the same measurement can move in the opposite direction!',
    difficulty: 'hard',
    difficultyLabel: 'Hard · Opposite Cities',
    keyInsightTag: 'Same Sensor, Opposite Direction',
    unit: 'AOD',
    unitPerYear: 'AOD/yr',
    targetVariableId: 'aod',
    comparisonPairId: 'beijing-air',
    variableOptions: [
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much smoke, smog, and dust is floating in the air.',
        quality: 'optimal',
        feedback:
          'Great pick! Using the same Air Haze (AOD) sensor as Case 46 lets us compare Delhi and Beijing fairly.',
      },
      {
        id: 'air-temp',
        name: 'Air Temperature',
        source: 'AIRS',
        unit: '°C',
        definition: 'How warm or cool the air is.',
        quality: 'distractor',
        feedback:
          'Not this one. Air temperature measures heat, not smoke or smog particles.',
      },
      {
        id: 'evaporation',
        name: 'Water Evaporation',
        source: 'MERRA-2',
        unit: 'mm/mo',
        definition: 'How fast water dries into the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Evaporation tracks water vapor, not city smog.',
      },
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition: 'Total ozone gas column in the sky.',
        quality: 'acceptable',
        feedback:
          'Related to air chemistry, though Air Haze (AOD) directly matches our Case 26 smog check.',
      },
    ],
    targetRegionId: 'delhi-metro',
    regionOptions: [
      {
        id: 'delhi-metro',
        name: 'Delhi, India',
        biomeLabel: 'Large City',
        coordinatesLabel: '28.6° N, 77.2° E',
        mapX: 696,
        mapY: 173,
        characteristics: 'Fast-growing city in northern India near the Himalayas.',
        hint: 'Look in northern India.',
        isTarget: true,
        feedback:
          'Found it: Delhi! Compare its rising line directly with Beijing’s falling line in Case 26.',
      },
      {
        id: 'beijing-metro',
        name: 'Beijing, China',
        biomeLabel: 'Large City',
        coordinatesLabel: '39.9° N, 116.4° E',
        mapX: 805,
        mapY: 142,
        characteristics: 'City in China already checked in Case 26.',
        hint: 'We already checked Beijing—now pick Delhi in India.',
        isTarget: false,
        feedback:
          'Wrong city for this mystery! We already checked Beijing in Case 46—pick Delhi in India.',
      },
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Desert in North Africa.',
        hint: 'Look toward northern India.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Delhi in northern India.',
      },
      {
        id: 'chesapeake-estuary',
        name: 'Chesapeake Bay',
        biomeLabel: 'Coastal Bay',
        coordinatesLabel: '38.3° N, 76.2° W',
        mapX: 274,
        mapY: 146,
        characteristics: 'Coastal bay in North America.',
        hint: 'That is North America, not India.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Delhi in northern India.',
      },
    ],
    seriesConfig: {
      seed: 55103,
      startYear: 2006,
      numYears: 18,
      baseline: 0.56,
      slopePerYear: 0.015,
      seasonalAmplitude: 0.14,
      seasonalHarmonic2: 0.12,
      seasonalPhaseMonths: 11, // Nov-Dec winter smog peak
      noiseStd: 0.052,
      autocorrelation: 0.2,
      minClamp: 0.15,
    },
    expectedDirection: 'rising',
    expectedVerdict: 'significant',
    slopeSliderMin: -0.06,
    slopeSliderMax: 0.06,
    slopeSliderStep: 0.002,
    slopeTolerance: 0.012,
    seasonalMaskNote:
      'Winter smoke spikes happen every year, sitting on top of a clear multi-year climb.',
    significanceExplanation:
      'Both tests give p < 0.0001 and the 95% range stays well above zero—the exact opposite of Beijing!',
    debriefTakeaway:
      'The same Earth measurement does not move the same way everywhere: air haze fell in Beijing while rising in Delhi.',
  },
  {
    id: 'estuary-evap',
    caseNumber: 'Case 30',
    title: 'Chesapeake Bay Check',
    question: 'Is water evaporating faster from Chesapeake Bay?',
    briefing:
      'Ten years of coastal weather can jump around a lot. Pick the evaporation sensor, find Chesapeake Bay on the US East Coast, and check if a slight tilt is real or just normal weather ups and downs.',
    difficulty: 'hard',
    difficultyLabel: 'Hard · Spot Weather Noise',
    keyInsightTag: 'Don’t Be Fooled by Short-Term Noise',
    unit: 'mm/mo',
    unitPerYear: 'mm/yr',
    targetVariableId: 'evaporation',
    variableOptions: [
      {
        id: 'evaporation',
        name: 'Water Evaporation',
        source: 'MERRA-2',
        unit: 'mm/mo',
        definition: 'How fast water evaporates from the bay into the air.',
        quality: 'optimal',
        feedback:
          'Great pick! Water Evaporation directly tracks moisture leaving the bay.',
      },
      {
        id: 'air-temp',
        name: 'Air Temperature',
        source: 'AIRS',
        unit: '°C',
        definition: 'How warm or cool the air is.',
        quality: 'acceptable',
        feedback:
          'Helpful clue since warm air dries water faster, though Water Evaporation measures evaporation itself.',
      },
      {
        id: 'aod',
        name: 'Air Haze & Dust (AOD)',
        source: 'MODIS',
        unit: 'AOD',
        definition: 'How much smoke or dust is in the air.',
        quality: 'distractor',
        feedback:
          'Not this one. Haze tracks particles in the air, not water evaporation.',
      },
      {
        id: 'ozone',
        name: 'Ozone Layer',
        source: 'OMI',
        unit: 'DU',
        definition: 'Thickness of the protective UV ozone shield.',
        quality: 'distractor',
        feedback:
          'Not this one. Ozone high in the sky has nothing to do with bay evaporation.',
      },
    ],
    targetRegionId: 'chesapeake-estuary',
    regionOptions: [
      {
        id: 'chesapeake-estuary',
        name: 'Chesapeake Bay',
        biomeLabel: 'Coastal Bay',
        coordinatesLabel: '38.3° N, 76.2° W',
        mapX: 274,
        mapY: 146,
        characteristics: 'Large coastal bay on the US East Coast with warm summers and cool winters.',
        hint: 'On the eastern coast of North America near 38° N.',
        isTarget: true,
        feedback:
          'Found it: Chesapeake Bay! Check both the seasonal swing and the scattered 10-year points.',
      },
      {
        id: 'sahara-erg',
        name: 'Sahara Desert',
        biomeLabel: 'Hot Desert',
        coordinatesLabel: '23.0° N, 12.0° E',
        mapX: 528,
        mapY: 186,
        characteristics: 'Dry sand desert.',
        hint: 'No coastal bay in the middle of the Sahara.',
        isTarget: false,
        feedback: 'Wrong spot. Look on the US East Coast for Chesapeake Bay.',
      },
      {
        id: 'sahel-belt',
        name: 'Sahel Region, Africa',
        biomeLabel: 'Dry Grassland',
        coordinatesLabel: '14.5° N, 2.0° E',
        mapX: 500,
        mapY: 214,
        characteristics: 'Dry grassland in Africa.',
        hint: 'That is inland Africa, not a coastal bay.',
        isTarget: false,
        feedback: 'Wrong spot. Chesapeake Bay is on the US East Coast.',
      },
      {
        id: 'arctic-ocean',
        name: 'Central Arctic Ocean',
        biomeLabel: 'Polar Sea Ice',
        coordinatesLabel: '80.0° N, 155.0° W',
        mapX: 168,
        mapY: 44,
        characteristics: 'Frozen polar ocean.',
        hint: 'That is frozen Arctic ocean, not a coastal bay.',
        isTarget: false,
        feedback: 'Wrong spot. Pick Chesapeake Bay.',
      },
    ],
    seriesConfig: {
      seed: 66021,
      startYear: 2014,
      numYears: 10,
      baseline: 86,
      slopePerYear: 0.45,
      seasonalAmplitude: 46,
      seasonalPhaseMonths: 7, // July peak evaporation
      noiseStd: 11.5,
      autocorrelation: 0.2,
      minClamp: 15,
    },
    extendedYears: 24,
    expectedDirection: 'flat',
    expectedVerdict: 'not_significant',
    slopeSliderMin: -3.0,
    slopeSliderMax: 3.0,
    slopeSliderStep: 0.1,
    slopeTolerance: 1.0,
    seasonalMaskNote:
      'After removing summer and winter swings, the 10-year points scatter widely around a nearly flat line.',
    significanceExplanation:
      'With p > 0.25 and a 95% range that includes zero, 10 years is not enough to claim faster evaporation. Try 24 yr in the explorer above to see what a longer record shows!',
    debriefTakeaway:
      'Good detectives don’t mistake random weather ups and downs for a real trend. On a noisy 10-year record, wait for more years of data before deciding!',
  },
];

const HARD_CORE_CASES: DetectiveCase[] = [
  ...CORE_CASES.slice(4),
];

const EASY_CORE_CASES: DetectiveCase[] = CORE_CASES.slice(0, 4);

const ORDERED_CASES: DetectiveCase[] = [
  ...EASY_CORE_CASES,
  ...EXTRA_EASY_CASES.filter((c) => c.difficulty === 'easy'),
  ...EXPANDED_EASY_CASES,
  ...EXTRA_EASY_CASES.filter((c) => c.difficulty === 'medium'),
  ...EXPANDED_MEDIUM_CASES,
  ...EXTRA_EASY_CASES.filter((c) => c.difficulty === 'hard'),
  ...HARD_CORE_CASES,
  ...EXPANDED_HARD_CASES,
  ...MORE_CASES,
];

export const DETECTIVE_CASES: DetectiveCase[] = ORDERED_CASES.map((c, index) => ({
  ...c,
  caseNumber: `Case ${String(index + 1).padStart(2, '0')}`,
}));
