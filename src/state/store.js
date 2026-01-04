import { create } from 'zustand';
import { getSessionResults, updateModuleCompletion } from '../utils/api';
import { calculateRank, checkAchievements } from '../utils/gamification';

// Generate or retrieve session ID
const generateUUID = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sensecheck_session_id');
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('sensecheck_session_id', sessionId);
  }
  return sessionId;
};

// Load persisted gamification data
const loadGamificationData = () => {
  try {
    const saved = sessionStorage.getItem('sensecheck_gamification');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load gamification data:', e);
  }
  return {
    totalXP: 0,
    achievements: [],
    chamberStats: {},
    assessmentStartTime: null,
  };
};

const useStore = create((set, get) => ({
  // Session
  sessionId: getSessionId(),
  sessionStartTime: Date.now(),
  
  // Current module
  currentModule: null,
  moduleStartTime: null,
  
  // Completed modules
  completedModules: [],
  
  // Vision Test Data
  colorBlindnessResults: {
    plates: [],
    currentPlate: 0,
    completed: false,
  },
  visualAcuityResults: {
    attempts: [],
    currentSize: 80,
    completed: false,
  },
  
  // Motor Skills Data (interaction tracking only)
  motorSkillsData: {
    currentRound: 1,
    totalRounds: 3,
    interactions: [],
    completed: false,
    // Gamification stats
    totalHits: 0,
    totalMisses: 0,
    maxCombo: 0,
    currentCombo: 0,
    accuracy: 0,
    hasPerfectRound: false,
    avgReactionTime: 0,
    roundStats: [],
  },
  
  // Literacy Test Data
  literacyResults: {
    responses: [],
    currentQuestion: 0,
    completed: false,
    // Gamification stats
    currentStreak: 0,
    maxStreak: 0,
  },
  
  // ===== GAMIFICATION STATE =====
  gamification: loadGamificationData(),
  
  // Pending XP to show in animation
  pendingXP: null,
  
  // Pending achievements to show in popup
  pendingAchievements: [],
  
  // ===== GAMIFICATION ACTIONS =====
  
  // Add XP with breakdown for animation
  addXP: (amount, breakdown = []) => {
    set((state) => {
      const newTotalXP = state.gamification.totalXP + amount;
      const newGamification = {
        ...state.gamification,
        totalXP: newTotalXP,
      };
      
      // Persist to sessionStorage
      sessionStorage.setItem('sensecheck_gamification', JSON.stringify(newGamification));
      
      return {
        gamification: newGamification,
        pendingXP: { amount, breakdown, newTotal: newTotalXP },
      };
    });
  },
  
  // Clear pending XP (after animation)
  clearPendingXP: () => set({ pendingXP: null }),
  
  // Unlock achievement
  unlockAchievement: (achievement) => {
    const state = get();
    const existingIds = state.gamification.achievements.map(a => a.id);
    
    if (!existingIds.includes(achievement.id)) {
      set((state) => {
        const newAchievements = [...state.gamification.achievements, {
          ...achievement,
          unlockedAt: Date.now(),
        }];
        
        const newGamification = {
          ...state.gamification,
          achievements: newAchievements,
          totalXP: state.gamification.totalXP + (achievement.xpBonus || 0),
        };
        
        // Persist to sessionStorage
        sessionStorage.setItem('sensecheck_gamification', JSON.stringify(newGamification));
        
        return {
          gamification: newGamification,
          pendingAchievements: [...state.pendingAchievements, achievement],
        };
      });
    }
  },
  
  // Unlock multiple achievements
  unlockAchievements: (achievements) => {
    achievements.forEach(achievement => {
      get().unlockAchievement(achievement);
    });
  },
  
  // Clear pending achievements (after showing popup)
  clearPendingAchievements: () => set({ pendingAchievements: [] }),
  
  // Update chamber stats
  updateChamberStats: (chamberId, stats) => {
    set((state) => {
      const newChamberStats = {
        ...state.gamification.chamberStats,
        [chamberId]: {
          ...state.gamification.chamberStats[chamberId],
          ...stats,
          completedAt: Date.now(),
        },
      };
      
      const newGamification = {
        ...state.gamification,
        chamberStats: newChamberStats,
      };
      
      // Persist to sessionStorage
      sessionStorage.setItem('sensecheck_gamification', JSON.stringify(newGamification));
      
      return { gamification: newGamification };
    });
  },
  
  // Start assessment timer
  startAssessment: () => {
    set((state) => {
      if (!state.gamification.assessmentStartTime) {
        const newGamification = {
          ...state.gamification,
          assessmentStartTime: Date.now(),
        };
        sessionStorage.setItem('sensecheck_gamification', JSON.stringify(newGamification));
        return { gamification: newGamification };
      }
      return {};
    });
  },
  
  // Get total assessment time
  getAssessmentTime: () => {
    const state = get();
    if (state.gamification.assessmentStartTime) {
      return Date.now() - state.gamification.assessmentStartTime;
    }
    return 0;
  },
  
  // Get current rank
  getCurrentRank: () => {
    const state = get();
    return calculateRank(state.gamification.totalXP);
  },
  
  // ===== ORIGINAL ACTIONS =====
  setCurrentModule: (module) => set({
    currentModule: module,
    moduleStartTime: Date.now(),
  }),
  
  completeModule: async (moduleName) => {
    const state = get();
    const sessionId = state.sessionId;
    
    // Save to backend
    try {
      const response = await updateModuleCompletion(sessionId, moduleName);
    } catch (error) {
      console.error('Failed to save module completion to backend:', error);
      throw error; // Re-throw to let caller handle it
    }
    
    // Update local state
    set((state) => ({
      completedModules: [...state.completedModules, {
        moduleName, // Use moduleName to match backend
        name: moduleName, // Keep for backwards compatibility
        completedAt: Date.now(),
      }],
      currentModule: null,
    }));
  },
  
  // Load session data from backend
  loadSessionData: async () => {
    const state = get();
    const sessionId = state.sessionId;
    
    try {
      const response = await getSessionResults(sessionId);
      if (response.success && response.data.session) {
        const session = response.data.session;
        
        // Update completed modules from backend
        set({
          completedModules: session.completedModules || [],
        });
        
        return session;
      }
    } catch (error) {
      // Session might not exist yet, that's okay - silently continue
      if (error.response?.status !== 404) {
        console.error('Error loading session:', error);
      }
    }
    return null;
  },
  
  // Color Blindness Actions
  recordColorBlindnessResponse: (plateData) => set((state) => ({
    colorBlindnessResults: {
      ...state.colorBlindnessResults,
      plates: [...state.colorBlindnessResults.plates, plateData],
      currentPlate: state.colorBlindnessResults.currentPlate + 1,
    },
  })),
  
  completeColorBlindnessTest: () => set((state) => ({
    colorBlindnessResults: {
      ...state.colorBlindnessResults,
      completed: true,
    },
  })),
  
  // Visual Acuity Actions
  recordVisualAcuityAttempt: (attemptData) => set((state) => ({
    visualAcuityResults: {
      ...state.visualAcuityResults,
      attempts: [...state.visualAcuityResults.attempts, attemptData],
    },
  })),
  
  setVisualAcuitySize: (size) => set((state) => ({
    visualAcuityResults: {
      ...state.visualAcuityResults,
      currentSize: size,
    },
  })),
  
  completeVisualAcuityTest: () => set((state) => ({
    visualAcuityResults: {
      ...state.visualAcuityResults,
      completed: true,
    },
  })),
  
  // Motor Skills Actions
  addMotorInteraction: (interactionData) => set((state) => ({
    motorSkillsData: {
      ...state.motorSkillsData,
      interactions: [...state.motorSkillsData.interactions, interactionData],
    },
  })),
  
  setMotorRound: (round) => set((state) => ({
    motorSkillsData: {
      ...state.motorSkillsData,
      currentRound: round,
    },
  })),
  
  // Record bubble hit (for combo system)
  recordBubbleHit: (reactionTime) => set((state) => {
    const newCombo = state.motorSkillsData.currentCombo + 1;
    const newMaxCombo = Math.max(state.motorSkillsData.maxCombo, newCombo);
    const newTotalHits = state.motorSkillsData.totalHits + 1;
    
    return {
      motorSkillsData: {
        ...state.motorSkillsData,
        totalHits: newTotalHits,
        currentCombo: newCombo,
        maxCombo: newMaxCombo,
      },
    };
  }),
  
  // Record bubble miss (breaks combo)
  recordBubbleMiss: () => set((state) => ({
    motorSkillsData: {
      ...state.motorSkillsData,
      totalMisses: state.motorSkillsData.totalMisses + 1,
      currentCombo: 0, // Reset combo on miss
    },
  })),
  
  // Complete a round with stats
  completeMotorRound: (roundStats) => set((state) => {
    const newRoundStats = [...state.motorSkillsData.roundStats, roundStats];
    const totalHits = newRoundStats.reduce((sum, r) => sum + r.hits, 0);
    const totalMisses = newRoundStats.reduce((sum, r) => sum + r.misses, 0);
    const accuracy = totalHits + totalMisses > 0 
      ? Math.round((totalHits / (totalHits + totalMisses)) * 100) 
      : 0;
    const hasPerfectRound = state.motorSkillsData.hasPerfectRound || roundStats.misses === 0;
    
    return {
      motorSkillsData: {
        ...state.motorSkillsData,
        roundStats: newRoundStats,
        accuracy,
        hasPerfectRound,
        currentCombo: 0, // Reset combo between rounds
      },
    };
  }),
  
  completeMotorSkillsTest: () => set((state) => ({
    motorSkillsData: {
      ...state.motorSkillsData,
      completed: true,
    },
  })),
  
  // Literacy Actions
  recordLiteracyResponse: (responseData) => set((state) => {
    const isCorrect = responseData.isCorrect;
    const newStreak = isCorrect ? state.literacyResults.currentStreak + 1 : 0;
    const newMaxStreak = Math.max(state.literacyResults.maxStreak, newStreak);
    
    return {
      literacyResults: {
        ...state.literacyResults,
        responses: [...state.literacyResults.responses, responseData],
        currentQuestion: state.literacyResults.currentQuestion + 1,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
      },
    };
  }),
  
  completeLiteracyTest: () => set((state) => ({
    literacyResults: {
      ...state.literacyResults,
      completed: true,
    },
  })),
  
  // Reset (for testing)
  resetStore: () => {
    sessionStorage.removeItem('sensecheck_gamification');
    set({
      currentModule: null,
      completedModules: [],
      colorBlindnessResults: { plates: [], currentPlate: 0, completed: false },
      visualAcuityResults: { attempts: [], currentSize: 80, completed: false },
      motorSkillsData: { 
        currentRound: 1, totalRounds: 3, interactions: [], completed: false,
        totalHits: 0, totalMisses: 0, maxCombo: 0, currentCombo: 0, accuracy: 0,
        hasPerfectRound: false, avgReactionTime: 0, roundStats: [],
      },
      literacyResults: { responses: [], currentQuestion: 0, completed: false, currentStreak: 0, maxStreak: 0 },
      gamification: { totalXP: 0, achievements: [], chamberStats: {}, assessmentStartTime: null },
      pendingXP: null,
      pendingAchievements: [],
    });
  },
}));

export default useStore;
