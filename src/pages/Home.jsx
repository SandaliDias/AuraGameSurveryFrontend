import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserInfoModal from '../components/UserInfoModal';
import useStore from '../state/store';
import { useGame } from '../context/GameContext';
import logo from '../resources/logo.png';

const Home = () => {
  const navigate = useNavigate();
  const completedModules = useStore((state) => state.completedModules);
  const loadSessionData = useStore((state) => state.loadSessionData);
  const { setUserId } = useGame();
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [userInfoCollected, setUserInfoCollected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);

  // Load session data and check if user info has been collected
  useEffect(() => {
    const initializeSession = async () => {
      await loadSessionData();
      
      const infoCollected = sessionStorage.getItem('sensecheck_user_info_collected');
      if (infoCollected === 'true') {
        setUserInfoCollected(true);
      }
      
      setLoading(false);
    };
    
    initializeSession();
  }, [loadSessionData]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        loadSessionData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadSessionData, loading]);

  const handleUserIdSet = (userId) => {
    // Set userId in GameContext
    setUserId(userId);
    sessionStorage.setItem('sensecheck_user_id', userId);
  };

  const handleUserInfoSubmit = (formData) => {
    sessionStorage.setItem('sensecheck_user_info_collected', 'true');
    sessionStorage.setItem('sensecheck_user_age', formData.age);
    sessionStorage.setItem('sensecheck_user_gender', formData.gender);
    if (formData.userId) {
      sessionStorage.setItem('sensecheck_user_id', formData.userId);
    }
    setUserInfoCollected(true);
    setShowUserInfoModal(false);
    
    // Execute pending action after collecting user info
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleStartUnifiedGame = () => {
    if (!userInfoCollected) {
      setPendingAction(() => () => navigate('/play'));
      setShowUserInfoModal(true);
    } else {
      navigate('/play');
    }
  };

  // Check if any modules are completed
  const isModuleCompleted = (moduleName) => {
    return completedModules.some((m) => m.moduleName === moduleName || m.name === moduleName);
  };

  const allCompleted = ['perception', 'reaction', 'knowledge'].every(isModuleCompleted);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <img src={logo} alt="AURA Logo" className="w-16 h-16 mx-auto mb-6 animate-pulse" />
          <p className="text-gray-400 text-sm">Initializing AURA...</p>
        </div>
      </div>
    );
  }

  // If all completed, show completion summary
  if (allCompleted) {
    return (
      <>
        <UserInfoModal 
          isOpen={showUserInfoModal}
          onClose={() => setShowUserInfoModal(false)}
          onSubmit={handleUserInfoSubmit}
          onUserIdSet={handleUserIdSet}
        />
        
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.08)' }} />
          </div>
          
          <div className="relative z-10 max-w-lg w-full text-center">
            <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
              <div 
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%)',
                  boxShadow: '0 10px 40px var(--primary-color-glow)'
                }}
              >
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Assessment Complete!</h2>
              <p className="text-gray-400 mb-6">You've finished all assessment modules.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UserInfoModal 
        isOpen={showUserInfoModal}
        onClose={() => setShowUserInfoModal(false)}
        onSubmit={handleUserInfoSubmit}
        onUserIdSet={handleUserIdSet}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
        {/* Decorative background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 1200 200" className="absolute -top-20 left-0 w-full opacity-10">
            <path
              d="M0,100 Q300,180 600,100 T1200,100 L1200,0 L0,0 Z"
              fill="url(#homeGradient)"
            />
            <defs>
              <linearGradient id="homeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary-color-dark)" />
                <stop offset="100%" stopColor="var(--primary-color)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.06)' }} />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.05)', animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 min-h-screen flex flex-col items-center justify-center">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-8">
              <img src={logo} alt="AURA Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              <div className="text-left">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">AURA</h1>
                <p className="text-xs sm:text-sm font-medium tracking-widest uppercase" style={{ color: 'var(--primary-color)' }}>Digital Profile</p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-white leading-tight">
              Ready to <span className="text-aura-gradient">Challenge Yourself?</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl mx-auto mb-10">
              Four fun brain games await! Spot hidden patterns, test your focus, 
              pop bubbles at lightning speed, and show off your digital smarts.
            </p>

            {/* Challenge preview */}
            <div className="flex justify-center gap-4 sm:gap-6 mb-10">
              {[
                { icon: '🎨', name: 'Patterns' },
                { icon: '🦅', name: 'Focus' },
                { icon: '🎯', name: 'Speed' },
                { icon: '🧠', name: 'Trivia' },
              ].map((challenge, index) => (
                <div 
                  key={challenge.name}
                  className="flex flex-col items-center"
                >
                  <div 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl mb-2 transition-all duration-300 hover:scale-110"
                    style={{ 
                      backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
                      border: '1px solid rgba(var(--primary-color-rgb), 0.2)'
                    }}
                  >
                    {challenge.icon}
                  </div>
                  <span className="text-xs text-gray-500">{challenge.name}</span>
                </div>
              ))}
            </div>

            {/* Time estimate */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 mb-8">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-400">Takes about <span className="text-white font-semibold">5-7 minutes</span></span>
            </div>

            {/* CTA Button */}
            <div className="space-y-4">
              <button
                onClick={handleStartUnifiedGame}
                className="w-full sm:w-auto px-12 py-5 rounded-xl font-bold text-lg text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg group"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
                  boxShadow: '0 8px 30px var(--primary-color-glow)'
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  Let's Play!
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </button>
              
              <p className="text-xs text-gray-600">
                Your gameplay helps improve our games 🎮
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 max-w-4xl w-full">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: '🔥', title: 'Build Streaks', desc: 'Chain correct answers for glory' },
                { icon: '⚡', title: 'Unlock Skills', desc: 'Earn badges as you play' },
                { icon: '🏆', title: 'Get Results', desc: 'See your player profile' },
              ].map((item) => (
                <div key={item.title} className="p-5 rounded-xl bg-gray-900/50 border border-gray-800 text-center">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-semibold text-white mb-1">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 text-xs tracking-wider">
              Powered by <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>AURA</span> • Unleash the Future of UI
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
