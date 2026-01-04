import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, PROFILE_TRAITS } from '../../context/GameContext';
import useDeviceInfo from '../../hooks/useDeviceInfo';
import { buildAndSaveImpairmentProfile } from '../../utils/impairmentProfile';
import { saveDeviceContext } from '../../utils/api';
import logo from '../../resources/logo.png';

const FinalProfile = () => {
  const navigate = useNavigate();
  const { state, elapsedTime, resetGame } = useGame();
  const deviceInfo = useDeviceInfo();
  const [showContent, setShowContent] = useState(false);
  const [celebratePhase, setCelebratePhase] = useState(0);
  const [profileSaved, setProfileSaved] = useState(false);
  const saveAttemptedRef = useRef(false);
  
  // Save impairment profile and device context when component mounts
  useEffect(() => {
    const saveData = async () => {
      // Prevent duplicate saves
      if (saveAttemptedRef.current) return;
      
      // Use userId and sessionId from game state (set during intro)
      const userId = state.userId;
      const sessionId = state.sessionId;
      
      if (!userId || !sessionId) {
        return;
      }
      
      // Wait for deviceInfo to be properly populated (not initial 'unknown' values)
      const os = deviceInfo.device?.os;
      const browser = deviceInfo.device?.browser;
      
      if (!os || os === 'unknown' || !browser || browser === 'unknown') {
        return; // Will re-run when deviceInfo updates
      }
      
      // Mark as attempted to prevent future runs
      saveAttemptedRef.current = true;
      
      try {
        await buildAndSaveImpairmentProfile({
          userId,
          sessionId,
          challengeResults: state.challengeResults,
          stats: state.stats,
          deviceInfo: {
            os: os,
            browser: browser,
            screenWidth: deviceInfo.screen?.width || window.screen.width,
            screenHeight: deviceInfo.screen?.height || window.screen.height,
            devicePixelRatio: deviceInfo.screen?.dpr || window.devicePixelRatio || 1,
          },
        });
        
        // Save device context
        await saveDeviceContext({
          user_id: userId,
          session_id: sessionId,
          captured_at: new Date().toISOString(),
          viewportWidth: deviceInfo.viewportWidth || window.innerWidth,
          viewportHeight: deviceInfo.viewportHeight || window.innerHeight,
          devicePixelRatio: deviceInfo.devicePixelRatio || window.devicePixelRatio || 1,
        });
        
        setProfileSaved(true);
      } catch (error) {
        // Profile save failed - continue silently
      }
    };
    
    saveData();
  }, [state.challengeResults, state.stats, state.userId, state.sessionId, deviceInfo]);
  
  useEffect(() => {
    setTimeout(() => setShowContent(true), 300);
    setTimeout(() => setCelebratePhase(1), 800);
    setTimeout(() => setCelebratePhase(2), 1500);
  }, []);
  
  // Format time
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate overall stats
  const { stats } = state;
  
  // Get fun title based on streak performance
  const getPlayerTitle = () => {
    if (stats.maxStreak >= 15) return { title: 'Ultimate Champion', emoji: '👑', color: '#fbbf24' };
    if (stats.maxStreak >= 10) return { title: 'Streak Legend', emoji: '🔥', color: '#f97316' };
    if (stats.maxStreak >= 7) return { title: 'Brain Master', emoji: '🧠', color: 'var(--primary-color)' };
    if (stats.maxStreak >= 5) return { title: 'Rising Star', emoji: '⭐', color: 'var(--primary-color)' };
    if (stats.maxStreak >= 3) return { title: 'Quick Learner', emoji: '🎯', color: 'var(--primary-color)' };
    return { title: 'Game Explorer', emoji: '🎮', color: 'var(--primary-color)' };
  };
  
  const playerTitle = getPlayerTitle();
  
  // Handle finish
  const handleFinish = () => {
    sessionStorage.removeItem('aura_game_state');
  };
  
  const handlePlayAgain = () => {
    resetGame();
  };
  
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden flex items-center justify-center p-4 transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {/* Celebration particles */}
      {celebratePhase >= 1 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: ['#8BC53F', '#fbbf24', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 4)],
                animation: `fall ${2 + Math.random() * 3}s linear ${Math.random() * 1}s forwards`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)' }} />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.08)', animationDelay: '1s' }} />
      </div>
      
      <div className="relative z-10 max-w-2xl w-full">
        {/* Victory Header */}
        <div className={`text-center mb-8 transition-all duration-700 ${celebratePhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="relative inline-block mb-6">
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-2xl mx-auto"
              style={{ 
                background: `linear-gradient(135deg, ${playerTitle.color} 0%, ${playerTitle.color}99 100%)`,
                boxShadow: `0 10px 40px ${playerTitle.color}40`
              }}
            >
              {playerTitle.emoji}
            </div>
            {celebratePhase >= 2 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full animate-ping" style={{ border: `2px solid ${playerTitle.color}`, opacity: 0.3, animationDuration: '2s' }} />
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-black text-white mb-2">You Did It!</h1>
          <p className="text-xl font-semibold mb-3" style={{ color: playerTitle.color }}>{playerTitle.title}</p>
          {state.userId && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 border border-gray-700">
              <span className="text-gray-400 text-sm">Player</span>
              <span className="font-mono font-bold text-white">{state.userId}</span>
            </div>
          )}
        </div>
        
        {/* Main Card */}
        <div className={`bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-6 transition-all duration-700 delay-200 ${celebratePhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-center p-5 rounded-xl bg-gray-800/50">
              <div className="text-4xl font-black text-amber-400">{stats.maxStreak}🔥</div>
              <div className="text-sm text-gray-500 mt-2">Best Streak</div>
            </div>
            <div className="text-center p-5 rounded-xl bg-gray-800/50">
              <div className="text-4xl font-black text-white font-mono">{formatTime(elapsedTime)}</div>
              <div className="text-sm text-gray-500 mt-2">Total Time</div>
            </div>
          </div>
          
          {/* Skills Unlocked */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Skills Unlocked</h3>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {Object.values(PROFILE_TRAITS).map((trait, index) => (
              <div
                key={trait.id}
                className={`flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 transition-all duration-500`}
                style={{ 
                  borderLeft: '3px solid var(--primary-color)',
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.15)' }}
                >
                  {trait.icon}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{trait.name}</div>
                  <div className="text-xs text-gray-500">{trait.description}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Fun fact based on streak */}
          <div 
            className="p-4 rounded-xl text-center mb-6"
            style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)' }}
          >
            <p className="text-sm" style={{ color: 'var(--primary-color)' }}>
              {stats.maxStreak >= 10 
                ? '🔥 Incredible streak! You\'re on fire!' 
                : stats.maxStreak >= 5
                  ? '⚡ Nice streak! You\'ve got quick reflexes!'
                  : '🎮 Great effort! Practice makes perfect.'}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logo} alt="AURA" className="w-5 h-5" />
            <span className="text-sm text-gray-600">Powered by <span style={{ color: 'var(--primary-color)' }}>AURA</span></span>
          </div>
          <p className="text-xs text-gray-700">Thanks for playing! 🎮</p>
        </div>
      </div>
      
      {/* CSS for confetti */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FinalProfile;
