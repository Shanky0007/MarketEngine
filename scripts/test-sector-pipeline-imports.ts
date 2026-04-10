import { runSectorPipeline, closeSectorPipeline } from '../ingestion/src/sectorPipeline.js';
import { aggregateSectorSignals } from '../ingestion/src/sectorAggregator.js';
import { computeAllSectors } from '../synthesis/src/sectorScoring/scoringEngine.js';
import { detectAnomalies } from '../synthesis/src/sectorScoring/anomalyDetector.js';
import { synthesiseAlerts } from '../synthesis/src/sectorScoring/alertSynthesiser.js';

console.log('runSectorPipeline:', typeof runSectorPipeline, runSectorPipeline ? '✓' : '✗');
console.log('closeSectorPipeline:', typeof closeSectorPipeline, closeSectorPipeline ? '✓' : '✗');
console.log('aggregateSectorSignals:', typeof aggregateSectorSignals, aggregateSectorSignals ? '✓' : '✗');
console.log('computeAllSectors:', typeof computeAllSectors, computeAllSectors ? '✓' : '✗');
console.log('detectAnomalies:', typeof detectAnomalies, detectAnomalies ? '✓' : '✗');
console.log('synthesiseAlerts:', typeof synthesiseAlerts, synthesiseAlerts ? '✓' : '✗');
