import { useState, useEffect } from 'react';
import useStore from '../state/store';
import { calculateRank, getXPToNextRank, formatXP } from '../utils/gamification';

/**
 * XP Display Component - Shows current XP, rank, and progress
 */
const XPDisplay = ({ compact = false }) => {
  const gamification = useStore((state) => state.gamification);
  const { totalXP } = gamification;
  
  const rank = calculateRank(totalXP);
  const { nextRank, xpNeeded } = getXPToNextRank(totalXP);
  
  // Calculate progress to next rank
  const currentRankIndex = rank.minXP;
  const nextRankXP = nextRank ? nextRank.minXP : totalXP;
  const progressPercent = nextRank 
    ? Math.min(100, ((totalXP - currentRankIndex) / (nextRankXP - currentRankIndex)) * 100)
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" 
        style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)', border: '1px solid rgba(var(--primary-color-rgb), 0.2)' }}>
        <span className="text-lg">{rank.icon}</span>
        <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>{formatXP(totalXP)} XP</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)', border: '1px solid rgba(var(--primary-color-rgb), 0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" 
            style={{ backgroundColor: rank.color + '20', border: `2px solid ${rank.color}` }}>
            {rank.icon}
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Agent Rank</div>
            <div className="text-lg font-bold text-white">{rank.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: 'var(--primary-color)' }}>
            {formatXP(totalXP)}
          </div>
          <div className="text-xs text-gray-400">Total XP</div>
        </div>
      </div>
      
      {nextRank && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Progress to {nextRank.name}</span>
            <span style={{ color: 'var(--primary-color)' }}>{xpNeeded} XP needed</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${rank.color}, var(--primary-color))`
              }}
            />
          </div>
        </div>
      )}
      
      {!nextRank && (
        <div className="text-center py-2 rounded-xl" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
            ✨ Maximum Rank Achieved! ✨
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * XP Popup - Shows when XP is earned (animated)
 */
export const XPPopup = () => {
  const pendingXP = useStore((state) => state.pendingXP);
  const clearPendingXP = useStore((state) => state.clearPendingXP);
  const [isVisible, setIsVisible] = useState(false);
  const [displayData, setDisplayData] = useState(null);

  useEffect(() => {
    if (pendingXP) {
      setDisplayData(pendingXP);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          clearPendingXP();
          setDisplayData(null);
        }, 300);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [pendingXP, clearPendingXP]);

  if (!displayData) return null;

  return (
    <div 
      className={`fixed top-20 right-4 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <div className="rounded-2xl p-4 shadow-2xl backdrop-blur-xl min-w-[280px]"
        style={{ 
          backgroundColor: 'rgba(17, 24, 39, 0.95)', 
          border: '1px solid rgba(var(--primary-color-rgb), 0.3)',
          boxShadow: '0 0 40px rgba(var(--primary-color-rgb), 0.2)'
        }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)' }}>
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <div className="text-xs text-gray-400">XP Earned!</div>
            <div className="text-2xl font-black" style={{ color: 'var(--primary-color)' }}>
              +{formatXP(displayData.amount)}
            </div>
          </div>
        </div>
        
        {/* Breakdown */}
        {displayData.breakdown && displayData.breakdown.length > 0 && (
          <div className="space-y-1 border-t border-gray-700 pt-3">
            {displayData.breakdown.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.reason}</span>
                <span style={{ color: 'var(--primary-color)' }}>+{item.xp}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Total */}
        <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between">
          <span className="text-gray-400 text-sm">Total XP</span>
          <span className="font-bold text-white">{formatXP(displayData.newTotal)}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Achievement Popup - Shows when achievement is unlocked
 */
export const AchievementPopup = () => {
  const pendingAchievements = useStore((state) => state.pendingAchievements);
  const clearPendingAchievements = useStore((state) => state.clearPendingAchievements);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (pendingAchievements.length > 0 && !currentAchievement) {
      setCurrentAchievement(pendingAchievements[0]);
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentAchievement(null);
          // Remove the shown achievement from pending
          const remaining = pendingAchievements.slice(1);
          if (remaining.length === 0) {
            clearPendingAchievements();
          }
        }, 300);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [pendingAchievements, currentAchievement, clearPendingAchievements]);

  if (!currentAchievement) return null;

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="rounded-2xl p-6 shadow-2xl backdrop-blur-xl text-center min-w-[320px]"
        style={{ 
          backgroundColor: 'rgba(17, 24, 39, 0.95)', 
          border: '2px solid rgba(var(--primary-color-rgb), 0.5)',
          boxShadow: '0 0 60px rgba(var(--primary-color-rgb), 0.3)'
        }}>
        {/* Achievement unlocked banner */}
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--primary-color)' }}>
          🏆 Achievement Unlocked!
        </div>
        
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-4xl animate-bounce"
          style={{ 
            backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)',
            border: '2px solid var(--primary-color)'
          }}>
          {currentAchievement.icon}
        </div>
        
        {/* Name & Description */}
        <h3 className="text-xl font-bold text-white mb-1">{currentAchievement.name}</h3>
        <p className="text-sm text-gray-400 mb-3">{currentAchievement.description}</p>
        
        {/* XP Bonus */}
        {currentAchievement.xpBonus && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)' }}>
            <span className="text-xl">⚡</span>
            <span className="font-bold" style={{ color: 'var(--primary-color)' }}>
              +{currentAchievement.xpBonus} XP
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Combo Display - Shows current combo during motor skills game
 */
export const ComboDisplay = ({ combo, maxCombo }) => {
  if (combo < 2) return null;
  
  const isOnFire = combo >= 5;
  const isLegendary = combo >= 10;
  
  return (
    <div className="absolute top-4 right-4 z-20 animate-bounce">
      <div 
        className="rounded-2xl px-4 py-2 text-center backdrop-blur-xl"
        style={{ 
          backgroundColor: isLegendary 
            ? 'rgba(245, 158, 11, 0.9)' 
            : isOnFire 
              ? 'rgba(var(--primary-color-rgb), 0.9)' 
              : 'rgba(31, 41, 55, 0.9)',
          border: `2px solid ${isLegendary ? '#f59e0b' : 'var(--primary-color)'}`,
          boxShadow: isOnFire ? '0 0 30px rgba(var(--primary-color-rgb), 0.5)' : 'none'
        }}
      >
        <div className="text-xs uppercase tracking-wider text-white/80">
          {isLegendary ? '🔥 LEGENDARY!' : isOnFire ? '🔥 ON FIRE!' : 'Combo'}
        </div>
        <div className="text-3xl font-black text-white">
          {combo}x
        </div>
      </div>
    </div>
  );
};

/**
 * Stars Display - Shows star rating
 */
export const StarsDisplay = ({ stars, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };
  
  return (
    <div className={`flex gap-1 ${sizeClasses[size]}`}>
      {[1, 2, 3].map((i) => (
        <span 
          key={i} 
          className={`transition-all duration-300 ${i <= stars ? 'scale-100' : 'scale-75 opacity-30'}`}
          style={{ 
            filter: i <= stars ? 'drop-shadow(0 0 8px rgba(var(--primary-color-rgb), 0.8))' : 'none'
          }}
        >
          {i <= stars ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  );
};

export default XPDisplay;

