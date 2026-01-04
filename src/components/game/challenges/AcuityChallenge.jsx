import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../../context/GameContext';
import useStore from '../../../state/store';
import { calculateVisualAcuityFromThreshold, getVisionCategory } from '../../../utils/visualAcuityCalculations';
import { saveVisionResults } from '../../../utils/api';

/**
 * Calculate screen-adaptive sizes for visual acuity test
 * Level 7 = 20/20 vision threshold for this specific screen
 */
const calculateAdaptiveSizes = () => {
  const dpr = window.devicePixelRatio || 1;
  
  // PPI = DPR × 96 (CSS pixels are defined at 96 DPI reference)
  const ppi = dpr * 96;
  
  // ===== Calculate 20/20 vision threshold at 50cm for this screen's PPI =====
  // 20/20 vision: optotype subtends 5 arc minutes at the eye
  const VIEWING_DISTANCE_MM = 500; // 50cm in mm
  const ARC_MINUTES_20_20 = 5;     // Standard for full optotype
  
  // Convert arc minutes to radians
  const angleRadians = (ARC_MINUTES_20_20 / 60) * (Math.PI / 180);
  
  // Physical size in mm: size = 2 * distance * tan(angle/2)
  const physicalSizeMM = 2 * VIEWING_DISTANCE_MM * Math.tan(angleRadians / 2);
  
  // Convert mm to pixels using this screen's PPI
  const pixelsPerMM = ppi / 25.4;
  const calculated2020Pixels = physicalSizeMM * pixelsPerMM;
  
  // Minimum displayable/legible size
  const MIN_LEGIBLE_SIZE_PX = 10;
  
  // Use calculated threshold if >= 10px, otherwise use minimum
  const twentyTwentyPixels = Math.max(MIN_LEGIBLE_SIZE_PX, Math.round(calculated2020Pixels));
  
  // Calculate test sizes: 7 levels
  // Level 7 = twentyTwentyPixels (20/20 threshold)
  // Level 1 = 4x the threshold (or minimum 80px for visibility)
  const level7Size = twentyTwentyPixels;
  const level1Size = Math.max(80, twentyTwentyPixels * 4);
  
  const sizes = [];
  for (let i = 0; i < 7; i++) {
    sizes.push(Math.round(level1Size - (level1Size - level7Size) * (i / 6)));
  }
  
  return { 
    sizes, 
    twentyTwentyPixels, 
    ppi,
    dpr,
    calculated2020Pixels: Math.round(calculated2020Pixels * 10) / 10,
    physicalSizeMM: Math.round(physicalSizeMM * 1000) / 1000,
  };
};

// Distance in cm to screen (arm's length = 50cm)
const REQUIRED_DISTANCE_CM = 50;

// Standard credit card size in mm (ISO/IEC 7810 ID-1)
const CREDIT_CARD_WIDTH_MM = 85.6;
const CREDIT_CARD_HEIGHT_MM = 53.98;

const AcuityChallenge = () => {
  const { completeChallenge, recordCorrectAnswer, recordIncorrectAnswer, state, updateChallengeProgress } = useGame();
  const sessionId = useStore((state) => state.sessionId);
  const { recordVisualAcuityAttempt, setVisualAcuitySize, completeVisualAcuityTest } = useStore();
  
  // Screen calibration
  const screenCalibration = useMemo(() => calculateAdaptiveSizes(), []);
  const { sizes: levelSizes, twentyTwentyPixels } = screenCalibration;
  
  // Get saved progress from session
  const savedProgress = state.challengeProgress?.visualAcuity || {};
  
  // Distance calibration state
  const [showDistanceSetup, setShowDistanceSetup] = useState(!savedProgress.distanceConfirmed);
  const [distanceConfirmed, setDistanceConfirmed] = useState(savedProgress.distanceConfirmed || false);
  const [showAdvancedCalibration, setShowAdvancedCalibration] = useState(false);
  const [cardWidthPx, setCardWidthPx] = useState(320); // Default card width in pixels
  
  // Game state - restore from session if available
  const [currentLevel, setCurrentLevel] = useState(savedProgress.currentLevel || 1);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [attemptStartTime, setAttemptStartTime] = useState(Date.now());
  const [lastCorrectLevel, setLastCorrectLevel] = useState(savedProgress.lastCorrectLevel || 1);
  const [attempts, setAttempts] = useState(savedProgress.attempts || []);
  
  const currentSize = levelSizes[currentLevel - 1];
  
  const generateNumber = () => Math.floor(Math.random() * 90) + 10;
  
  // Save progress whenever level changes
  useEffect(() => {
    if (distanceConfirmed && currentLevel > 1) {
      updateChallengeProgress('visualAcuity', {
        currentLevel,
        lastCorrectLevel,
        distanceConfirmed: true,
        attempts,
      });
    }
  }, [currentLevel, lastCorrectLevel, distanceConfirmed, attempts, updateChallengeProgress]);
  
  // Generate new number when level changes
  useEffect(() => {
    if (distanceConfirmed) {
      const number = generateNumber();
      setCurrentNumber(number);
      setAttemptStartTime(Date.now());
    }
  }, [currentLevel, attemptNumber, currentSize, distanceConfirmed]);
  
  const handleDistanceConfirm = () => {
    setDistanceConfirmed(true);
    setShowDistanceSetup(false);
    updateChallengeProgress('visualAcuity', { distanceConfirmed: true });
  };
  
  const handleSubmit = async () => {
    if (!userAnswer.trim()) return;
    
    const responseTime = Date.now() - attemptStartTime;
    const isCorrect = parseInt(userAnswer) === currentNumber;
    
    const attemptData = {
      level: currentLevel,
      size: currentSize,
      number: currentNumber,
      userAnswer: parseInt(userAnswer),
      isCorrect,
      responseTime,
      attemptNumber,
      twentyTwentyThreshold: twentyTwentyPixels,
    };
    
    recordVisualAcuityAttempt(attemptData);
    
    const newAttempts = [...attempts, attemptData];
    setAttempts(newAttempts);
    
    if (isCorrect) {
      recordCorrectAnswer(responseTime);
      setLastCorrectLevel(currentLevel);
      
      if (currentLevel >= 7) {
        await completeTest(newAttempts, currentLevel);
      } else {
        setCurrentLevel(currentLevel + 1);
        setVisualAcuitySize(levelSizes[currentLevel]);
        setUserAnswer('');
        setAttemptNumber(1);
      }
    } else {
      recordIncorrectAnswer(responseTime);
      if (attemptNumber === 1) {
        setUserAnswer('');
        setAttemptNumber(2);
      } else {
        await completeTest(newAttempts, lastCorrectLevel);
      }
    }
  };
  
  const completeTest = async (allAttempts, finalLevel) => {
    completeVisualAcuityTest();
    
    const finalSize = levelSizes[finalLevel - 1];
    
    // Use threshold-based calculation for accurate vision assessment
    // This compares resolved size against the 20/20 threshold for THIS screen
    const metrics = calculateVisualAcuityFromThreshold(finalSize, twentyTwentyPixels);
    const visionCategory = getVisionCategory(metrics.visualAcuityDecimal);
    
    const visionRating = metrics.visualAcuityDecimal >= 1.0 ? '20/20 (Perfect)' 
      : metrics.visualAcuityDecimal >= 0.8 ? '20/25 (Near Perfect)'
      : metrics.visualAcuityDecimal >= 0.5 ? '20/40 (Normal)'
      : '20/60+ (Below Average)';
    
    const resultsData = {
      attempts: allAttempts,
      finalLevel,
      finalResolvedSize: finalSize,
      twentyTwentyThreshold: twentyTwentyPixels,
      screenCalibration,
      visionRating,
      isPerfectVision: metrics.visualAcuityDecimal >= 1.0,
      viewingDistanceCM: REQUIRED_DISTANCE_CM,
      // Threshold-based metrics (accurate)
      visualAcuityDecimal: metrics.visualAcuityDecimal,
      visionLoss: metrics.visionLoss,
      snellenDenominator: metrics.snellenDenominator,
      snellenEstimate: metrics.snellenEstimate,
      visionCategory: visionCategory.category,
      visionCategoryName: visionCategory.name,
    };
    
    try {
      await saveVisionResults({ sessionId, userId: state.userId, visualAcuity: resultsData });
    } catch (error) {
      console.error('Failed to save results:', error);
    }
    
    // Clear progress since test is complete
    updateChallengeProgress('visualAcuity', { 
      currentLevel: 1, 
      lastCorrectLevel: 1, 
      distanceConfirmed: false,
      attempts: [] 
    });
    
    await completeChallenge('visual-acuity', resultsData);
  };
  
  const progressPercent = Math.round(((currentLevel - 1) / 6) * 100);
  
  // Distance setup screen
  if (showDistanceSetup) {
    // Advanced credit card calibration screen
    if (showAdvancedCalibration) {
      // Calculate actual PPI from card calibration
      const calibratedPPI = cardWidthPx / (CREDIT_CARD_WIDTH_MM / 25.4);
      
      return (
        <div className="text-center">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ 
              backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
              border: '1px solid rgba(var(--primary-color-rgb), 0.2)'
            }}
          >
            <span className="text-xl">💳</span>
            <span className="text-sm font-medium" style={{ color: 'var(--primary-color)' }}>
              Screen Calibration
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Credit Card Calibration</h3>
          <p className="text-gray-400 mb-6 text-sm">
            Hold a credit/debit card to your screen and resize the rectangle to match it exactly.
          </p>
          
          {/* Card calibration UI */}
          <div className="bg-gray-950 rounded-2xl p-6 mb-6 border border-gray-800 flex flex-col items-center">
            <div 
              className="border-2 border-dashed rounded-lg flex items-center justify-center mb-4 transition-all duration-150"
              style={{ 
                width: `${cardWidthPx}px`, 
                height: `${cardWidthPx * (CREDIT_CARD_HEIGHT_MM / CREDIT_CARD_WIDTH_MM)}px`,
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)'
              }}
            >
              <span className="text-gray-500 text-sm">Match your card here</span>
            </div>
            
            {/* Size slider */}
            <div className="w-full max-w-xs">
              <input
                type="range"
                min="200"
                max="500"
                value={cardWidthPx}
                onChange={(e) => setCardWidthPx(parseInt(e.target.value))}
                className="w-full accent-[var(--primary-color)]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Smaller</span>
                <span className="font-mono" style={{ color: 'var(--primary-color)' }}>
                  {Math.round(calibratedPPI)} PPI
                </span>
                <span>Larger</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedCalibration(false)}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-300 bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleDistanceConfirm}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-black transition-all"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
              }}
            >
              Calibrated - Start Test
            </button>
          </div>
          
          <p className="text-xs text-gray-600 mt-4">
            Standard credit card: 85.6mm × 54mm (ISO 7810 ID-1)
          </p>
        </div>
      );
    }
    
    // Standard arm's length setup
    return (
      <div className="text-center">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{ 
            backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
            border: '1px solid rgba(var(--primary-color-rgb), 0.2)'
          }}
        >
          <span className="text-xl">📏</span>
          <span className="text-sm font-medium" style={{ color: 'var(--primary-color)' }}>
            Distance Setup
          </span>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">Position Yourself</h3>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          For accurate results, maintain the correct viewing distance throughout the test.
        </p>
        
        {/* Visual distance guide */}
        <div className="bg-gray-950 rounded-2xl p-8 mb-6 border border-gray-800">
          <div className="flex flex-col items-center gap-6">
            {/* Distance visualization */}
            <div className="relative">
              <div className="text-6xl mb-2">👤</div>
              <div className="flex items-center gap-2">
                <div className="h-1 bg-gradient-to-r from-gray-600 to-[var(--primary-color)] rounded" style={{ width: '150px' }}></div>
                <div className="text-4xl">🖥️</div>
              </div>
              <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>
                {REQUIRED_DISTANCE_CM} cm
              </div>
              <div className="text-sm text-gray-500">≈ arm's length</div>
            </div>
            
            {/* Instructions */}
            <div className="space-y-3 text-left max-w-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50">
                <span className="text-xl">💪</span>
                <div>
                  <div className="font-medium text-white">Arm's Length</div>
                  <div className="text-sm text-gray-400">Stretch your arm - your fingertips should almost touch the screen</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50">
                <span className="text-xl">🪑</span>
                <div>
                  <div className="font-medium text-white">Stay Seated</div>
                  <div className="text-sm text-gray-400">Don't lean forward during the test - maintain your position</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50">
                <span className="text-xl">👓</span>
                <div>
                  <div className="font-medium text-white">Wear Glasses?</div>
                  <div className="text-sm text-gray-400">Keep them on if you normally use them for screens</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Confirm button */}
        <button
          onClick={handleDistanceConfirm}
          className="w-full py-4 px-6 rounded-xl font-semibold text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
            boxShadow: '0 4px 20px var(--primary-color-glow)'
          }}
        >
          I'm at {REQUIRED_DISTANCE_CM}cm - Start Test
        </button>
        
        {/* Advanced calibration option */}
        <button
          onClick={() => setShowAdvancedCalibration(true)}
          className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2 w-full"
        >
          <span>💳</span>
          <span>Have a credit card? Calibrate screen precisely →</span>
        </button>
      </div>
    );
  }
  
  // Main test UI
  return (
    <div>
      {/* Distance reminder banner */}
      <div className="mb-4 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center gap-2 text-sm">
        <span>📏</span>
        <span className="text-gray-400">
          Remember: Stay <span className="text-white font-medium">{REQUIRED_DISTANCE_CM}cm</span> from screen (arm's length)
        </span>
      </div>
      
      {/* Challenge header */}
      <div className="text-center mb-6">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{ 
            backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
            border: '1px solid rgba(var(--primary-color-rgb), 0.2)'
          }}
        >
          <span className="text-xl">🦅</span>
          <span className="text-sm font-medium" style={{ color: 'var(--primary-color)' }}>
            Level {currentLevel} of 7
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Eagle Eye Challenge</h3>
        <p className={`${attemptNumber === 2 ? 'text-amber-400' : 'text-gray-400'}`}>
          {attemptNumber === 1 
            ? currentLevel === 7 
              ? '🎯 Final level - 20/20 vision test!'
              : 'How small can you go? Spot the shrinking number!' 
            : '⚠️ One more try!'}
        </p>
      </div>
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Focus Level</span>
          <span style={{ color: 'var(--primary-color)' }}>
            {currentLevel}/7 {currentLevel === 7 && '(20/20)'}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, var(--primary-color-dark) 0%, var(--primary-color) 100%)'
            }}
          />
        </div>
        {/* Level indicators */}
        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((level) => (
            <div 
              key={level}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentLevel >= level ? 'scale-100' : 'scale-75 opacity-30'
              }`}
              style={{ 
                backgroundColor: currentLevel >= level ? 'var(--primary-color)' : '#374151'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Number Display */}
      <div className="bg-gray-950 rounded-2xl p-6 mb-6 flex justify-center items-center min-h-[280px] border border-gray-800">
        <div
          className="rounded-full bg-white flex items-center justify-center font-bold text-gray-900 shadow-2xl transition-all duration-500"
          style={{
            width: `${currentSize}px`,
            height: `${currentSize}px`,
            fontSize: `${currentSize * 0.5}px`,
          }}
        >
          {currentNumber}
        </div>
      </div>
      
      {/* Input */}
      <div className="space-y-4">
        <input
          type="number"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-4 rounded-xl bg-gray-800/50 text-white text-center text-2xl placeholder-gray-500 transition-all duration-300 focus:outline-none"
          style={{ border: `2px solid ${attemptNumber === 2 ? 'rgba(251, 191, 36, 0.5)' : 'rgba(55, 65, 81, 0.5)'}` }}
          placeholder="Enter number"
          autoFocus
        />
        
        <button
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
            boxShadow: '0 4px 20px var(--primary-color-glow)'
          }}
        >
          Submit Answer
        </button>
      </div>
      
      {/* Second attempt warning */}
      {attemptNumber === 2 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-900/20 border border-amber-500/30 text-center">
          <span className="text-amber-400 text-sm font-medium">🎯 Focus - this is your last attempt at Level {currentLevel}!</span>
        </div>
      )}
    </div>
  );
};

export default AcuityChallenge;
