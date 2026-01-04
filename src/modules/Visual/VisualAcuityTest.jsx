import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import useStore from '../../state/store';
import { calculateVisualAcuityMetrics } from '../../utils/visualAcuityCalculations';
import { saveVisionResults } from '../../utils/api';

/**
 * Calculate screen-adaptive sizes for visual acuity test
 * Level 7 = 20/20 vision threshold for this specific screen
 */
const calculateAdaptiveSizes = () => {
  const dpr = window.devicePixelRatio || 1;
  const screenWidth = window.screen.width * dpr;
  const screenHeight = window.screen.height * dpr;
  
  // Estimate screen diagonal based on resolution
  const totalPixels = screenWidth * screenHeight;
  let estimatedDiagonal;
  
  if (totalPixels > 8000000) estimatedDiagonal = 27;      // 4K+
  else if (totalPixels > 3500000) estimatedDiagonal = 25; // 1440p
  else if (totalPixels > 2000000) estimatedDiagonal = 24; // 1080p
  else estimatedDiagonal = 15;                             // Mobile/small
  
  // Calculate PPI
  const diagonalPixels = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  const ppi = diagonalPixels / estimatedDiagonal;
  
  // 20/20 vision: 5 arc minutes at 57cm = ~0.83mm
  const viewingDistanceMM = 570;
  const arcMinutes = 5;
  const angleRadians = (arcMinutes / 60) * (Math.PI / 180);
  const physicalSizeMM = 2 * viewingDistanceMM * Math.tan(angleRadians / 2);
  const twentyTwentyPixels = Math.round(physicalSizeMM * (ppi / 25.4));
  
  // 7 levels: Level 1 = 4x threshold, Level 7 = threshold
  const level1Size = Math.max(80, twentyTwentyPixels * 4);
  const level7Size = Math.max(10, twentyTwentyPixels);
  
  const sizes = [];
  for (let i = 0; i < 7; i++) {
    sizes.push(Math.round(level1Size - (level1Size - level7Size) * (i / 6)));
  }
  
  return { sizes, twentyTwentyPixels, ppi: Math.round(ppi) };
};

const VisualAcuityTest = () => {
  const navigate = useNavigate();
  const sessionId = useStore((state) => state.sessionId);
  const {
    recordVisualAcuityAttempt,
    setVisualAcuitySize,
    completeVisualAcuityTest,
    completeModule,
  } = useStore();

  // Calculate adaptive sizes
  const screenCalibration = useMemo(() => calculateAdaptiveSizes(), []);
  const { sizes: levelSizes, twentyTwentyPixels } = screenCalibration;

  // Load initial state from sessionStorage for persistence
  const getInitialLevel = () => {
    const saved = sessionStorage.getItem('sensecheck_visualacuity_level');
    return saved ? parseInt(saved, 10) : 1;
  };

  const getInitialComplete = () => {
    return sessionStorage.getItem('sensecheck_visualacuity_complete') === 'true';
  };

  const getSavedResults = () => {
    const saved = sessionStorage.getItem('sensecheck_visualacuity_results');
    return saved ? JSON.parse(saved) : null;
  };

  const [currentLevel, setCurrentLevel] = useState(getInitialLevel);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [attemptStartTime, setAttemptStartTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(getInitialComplete);
  const [finalResults, setFinalResults] = useState(getSavedResults);
  const [lastCorrectLevel, setLastCorrectLevel] = useState(getInitialLevel);
  
  // Get current size based on level
  const currentSize = levelSizes[currentLevel - 1];

  // Check if test was already completed in store
  const storeCompleted = useStore((state) => state.visualAcuityResults.completed);
  useEffect(() => {
    if (storeCompleted && !isComplete) {
      setIsComplete(true);
    }
  }, [storeCompleted, isComplete]);

  const generateNumber = () => {
    return Math.floor(Math.random() * 90) + 10;
  };

  useEffect(() => {
    if (!isComplete) {
      const number = generateNumber();
      setCurrentNumber(number);
      setAttemptStartTime(Date.now());
    }
  }, [currentLevel, attemptNumber, isComplete, currentSize]);

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

    if (isCorrect) {
      setLastCorrectLevel(currentLevel);
      
      if (currentLevel >= 7) {
        // Reached 20/20 level!
        await completeTest(currentLevel);
      } else {
        const nextLevel = currentLevel + 1;
        setCurrentLevel(nextLevel);
        setVisualAcuitySize(levelSizes[nextLevel - 1]);
        sessionStorage.setItem('sensecheck_visualacuity_level', nextLevel.toString());
        setUserAnswer('');
        setAttemptNumber(1);
      }
    } else {
      if (attemptNumber === 1) {
        setUserAnswer('');
        setAttemptNumber(2);
      } else {
        await completeTest(lastCorrectLevel);
      }
    }
  };

  const completeTest = async (finalLevel) => {
    completeVisualAcuityTest();
    
    const allAttempts = useStore.getState().visualAcuityResults.attempts;
    const finalSize = levelSizes[finalLevel - 1];
    const metrics = calculateVisualAcuityMetrics(finalSize);
    
    // Calculate vision rating
    const visionRating = finalLevel >= 7 ? '20/20 (Perfect)' 
      : finalLevel >= 5 ? '20/25 (Near Perfect)'
      : finalLevel >= 3 ? '20/40 (Normal)'
      : '20/60+ (Below Average)';
    
    const resultsData = {
      attempts: allAttempts,
      finalLevel,
      finalResolvedSize: finalSize,
      twentyTwentyThreshold: twentyTwentyPixels,
      screenCalibration,
      visionRating,
      isPerfectVision: finalLevel >= 7,
      ...metrics,
    };

    setFinalResults(resultsData);

    try {
      await saveVisionResults({
        sessionId,
        visualAcuity: resultsData,
      });
      
      await completeModule('perception');
    } catch (error) {
      console.error('Failed to save results:', error);
    }

    sessionStorage.setItem('sensecheck_visualacuity_complete', 'true');
    sessionStorage.setItem('sensecheck_visualacuity_results', JSON.stringify(resultsData));
    sessionStorage.removeItem('sensecheck_visualacuity_level');

    setIsComplete(true);
  };

  const handleContinue = () => {
    navigate('/');
  };

  // Calculate progress
  const progressPercent = Math.round(((currentLevel - 1) / 6) * 100);

  if (isComplete && finalResults) {
    return (
      <Layout title="Eagle Eye Complete" subtitle="Nice Focus! 🦅">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl bg-gray-900/70 backdrop-blur-xl border border-gray-800 p-8 shadow-xl text-center relative overflow-hidden">
            {/* Success glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.1) 0%, transparent 50%)' }} />
            
            {/* Checkmark */}
            <div className="relative mb-6">
              <div 
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%)',
                  boxShadow: '0 10px 40px var(--primary-color-glow)'
                }}
              >
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h3 className="relative text-2xl font-bold mb-6 text-white">Eagle Eye Complete! 🦅</h3>

            <button
              onClick={handleContinue}
              className="relative w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
                boxShadow: '0 4px 20px var(--primary-color-glow)'
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Eagle Eye Challenge" subtitle="How Small Can You Go?">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Focus Level</span>
            <span className="font-medium" style={{ color: 'var(--primary-color)' }}>
              Level {currentLevel}/7 {currentLevel === 7 && '(20/20)'}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--primary-color-dark) 0%, var(--primary-color) 50%, var(--primary-color-light) 100%)'
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

        <div className="rounded-2xl bg-gray-900/70 backdrop-blur-xl border border-gray-800 p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className={`text-lg font-semibold ${attemptNumber === 2 ? 'text-amber-400' : 'text-gray-300'}`}>
              {attemptNumber === 1 
                ? currentLevel === 7 
                  ? '🎯 Final level - 20/20 vision test!'
                  : 'Spot the shrinking number!' 
                : '⚠️ Oops! One more try!'}
            </h3>
          </div>

          {/* Number Display */}
          <div className="bg-gray-950 rounded-2xl p-8 mb-6 flex justify-center items-center min-h-[400px] sm:min-h-[450px] border border-gray-800">
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

          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label htmlFor="number-input" className="block text-sm font-medium text-gray-300 mb-2">
                What number is it?
              </label>
              <input
                id="number-input"
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(var(--primary-color-rgb), 0.5)';
                  e.target.style.boxShadow = '0 0 15px rgba(var(--primary-color-rgb), 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
                  e.target.style.boxShadow = 'none';
                }}
                className="w-full px-4 py-4 rounded-xl bg-gray-800/50 text-white text-center text-2xl placeholder-gray-500 transition-all duration-300 focus:outline-none"
                style={{ border: '2px solid rgba(55, 65, 81, 0.5)' }}
                placeholder="Enter number"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
                boxShadow: '0 4px 20px var(--primary-color-glow)'
              }}
            >
              Submit Answer
            </button>
          </div>

          {/* Second Attempt Warning */}
          {attemptNumber === 2 && (
            <div className="mt-4 p-4 rounded-xl bg-amber-900/20 border border-amber-500/30">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">Second Attempt - Answer carefully</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-2xl bg-gray-900/50 border border-gray-800 p-5">
          <div className="flex items-start gap-3">
            <div 
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
                border: '1px solid rgba(var(--primary-color-rgb), 0.2)'
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--primary-color)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Instructions</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Keep a one meter distance from the screen</li>
                <li>• Identify the number displayed in the white circle</li>
                <li>• The number will get smaller with each correct answer</li>
                <li>• You get two attempts if you answer incorrectly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VisualAcuityTest;
