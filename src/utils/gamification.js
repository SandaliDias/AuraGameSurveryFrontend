/**
 * AURA Academy Gamification System
 * 
 * Theme: Users are recruits at AURA Academy training to become certified AURA Agents.
 * Each assessment is a "trial" that earns XP, unlocks achievements, and determines rank.
 */

// Agent Ranks (XP thresholds)
export const AGENT_RANKS = [
  { id: 'recruit', name: 'Recruit', minXP: 0, icon: '🎯', color: '#6b7280' },
  { id: 'cadet', name: 'Cadet', minXP: 100, icon: '⚡', color: '#3b82f6' },
  { id: 'agent', name: 'Agent', minXP: 300, icon: '🛡️', color: '#8b5cf6' },
  { id: 'elite', name: 'Elite Agent', minXP: 500, icon: '🔥', color: '#f59e0b' },
  { id: 'legendary', name: 'Legendary', minXP: 750, icon: '👑', color: '#1FB854' },
];

// Achievements
export const ACHIEVEMENTS = {
  // Perception Lab
  perfect_vision: {
    id: 'perfect_vision',
    name: 'Eagle Eye',
    description: 'Complete Color Blindness test without errors',
    icon: '👁️',
    xpBonus: 50,
    category: 'perception',
  },
  hawk_sight: {
    id: 'hawk_sight',
    name: 'Hawk Sight',
    description: 'Reach the smallest size in Visual Acuity',
    icon: '🦅',
    xpBonus: 75,
    category: 'perception',
  },
  speed_reader: {
    id: 'speed_reader',
    name: 'Speed Reader',
    description: 'Complete Visual Acuity under 60 seconds',
    icon: '⚡',
    xpBonus: 30,
    category: 'perception',
  },
  
  // Reaction Lab
  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Achieve 90%+ accuracy in any round',
    icon: '🎯',
    xpBonus: 40,
    category: 'reaction',
  },
  combo_master: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Reach a 10-hit combo streak',
    icon: '🔥',
    xpBonus: 50,
    category: 'reaction',
  },
  untouchable: {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Complete a round without missing any bubble',
    icon: '💫',
    xpBonus: 75,
    category: 'reaction',
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Average reaction time under 400ms',
    icon: '⚡',
    xpBonus: 60,
    category: 'reaction',
  },
  
  // Knowledge Console
  scholar: {
    id: 'scholar',
    name: 'Scholar',
    description: 'Score 100% on Literacy Quiz',
    icon: '📚',
    xpBonus: 100,
    category: 'knowledge',
  },
  quick_thinker: {
    id: 'quick_thinker',
    name: 'Quick Thinker',
    description: 'Average response time under 5 seconds',
    icon: '🧠',
    xpBonus: 40,
    category: 'knowledge',
  },
  streak_legend: {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Get 5 correct answers in a row',
    icon: '🌟',
    xpBonus: 30,
    category: 'knowledge',
  },
  category_master: {
    id: 'category_master',
    name: 'Category Master',
    description: 'Score 100% in any category',
    icon: '🏆',
    xpBonus: 25,
    category: 'knowledge',
  },
  
  // Overall
  completionist: {
    id: 'completionist',
    name: 'Completionist',
    description: 'Complete all three chambers',
    icon: '✅',
    xpBonus: 100,
    category: 'overall',
  },
  speedrunner: {
    id: 'speedrunner',
    name: 'Speedrunner',
    description: 'Complete entire assessment in under 5 minutes',
    icon: '🏃',
    xpBonus: 75,
    category: 'overall',
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Earn all chamber-specific achievements',
    icon: '💎',
    xpBonus: 150,
    category: 'overall',
  },
};

// XP Rewards Configuration
export const XP_CONFIG = {
  // Color Blindness Test
  colorBlindness: {
    baseCompletion: 50,
    perCorrectPlate: 15,
    speedBonus: 20, // Under 3s per plate
    perfectBonus: 50,
  },
  
  // Visual Acuity Test
  visualAcuity: {
    baseCompletion: 50,
    perCorrectAnswer: 10,
    perSizeLevel: 15, // Bonus per smaller size reached
    speedBonus: 25,
    perfectBonus: 75,
  },
  
  // Motor Skills Game
  motorSkills: {
    baseCompletion: 75,
    perBubbleHit: 5,
    comboMultiplier: 0.5, // Extra XP per combo level
    roundBonus: 25, // Per round completed
    accuracyBonus: 50, // For 90%+ accuracy
    perfectRoundBonus: 100,
  },
  
  // Literacy Quiz
  literacy: {
    baseCompletion: 50,
    perCorrectAnswer: 10,
    streakBonus: 5, // Per streak level
    speedBonus: 15, // Under 5s per question
    perfectBonus: 100,
  },
};

// Star rating thresholds (percentage-based)
export const STAR_THRESHOLDS = {
  one: 50,
  two: 75,
  three: 95,
};

/**
 * Calculate the current agent rank based on XP
 */
export const calculateRank = (totalXP) => {
  let currentRank = AGENT_RANKS[0];
  
  for (const rank of AGENT_RANKS) {
    if (totalXP >= rank.minXP) {
      currentRank = rank;
    } else {
      break;
    }
  }
  
  return currentRank;
};

/**
 * Get XP needed for next rank
 */
export const getXPToNextRank = (totalXP) => {
  const currentRank = calculateRank(totalXP);
  const currentIndex = AGENT_RANKS.findIndex(r => r.id === currentRank.id);
  
  if (currentIndex >= AGENT_RANKS.length - 1) {
    return { nextRank: null, xpNeeded: 0 };
  }
  
  const nextRank = AGENT_RANKS[currentIndex + 1];
  return {
    nextRank,
    xpNeeded: nextRank.minXP - totalXP,
  };
};

/**
 * Calculate stars based on performance percentage
 */
export const calculateStars = (performancePercent) => {
  if (performancePercent >= STAR_THRESHOLDS.three) return 3;
  if (performancePercent >= STAR_THRESHOLDS.two) return 2;
  if (performancePercent >= STAR_THRESHOLDS.one) return 1;
  return 0;
};

/**
 * Calculate XP for Color Blindness Test
 */
export const calculateColorBlindnessXP = (results) => {
  const config = XP_CONFIG.colorBlindness;
  let xp = config.baseCompletion;
  let breakdown = [{ reason: 'Chamber Complete', xp: config.baseCompletion }];
  
  // Count correct plates (this depends on how we store results)
  const correctPlates = results.plates?.filter(p => p.isCorrect)?.length || 0;
  const plateXP = correctPlates * config.perCorrectPlate;
  if (plateXP > 0) {
    xp += plateXP;
    breakdown.push({ reason: `${correctPlates} Correct Plates`, xp: plateXP });
  }
  
  // Perfect bonus
  if (correctPlates === results.plates?.length) {
    xp += config.perfectBonus;
    breakdown.push({ reason: 'Perfect Score!', xp: config.perfectBonus });
  }
  
  return { totalXP: xp, breakdown };
};

/**
 * Calculate XP for Visual Acuity Test
 */
export const calculateVisualAcuityXP = (results) => {
  const config = XP_CONFIG.visualAcuity;
  let xp = config.baseCompletion;
  let breakdown = [{ reason: 'Chamber Complete', xp: config.baseCompletion }];
  
  // Correct answers
  const correctAttempts = results.attempts?.filter(a => a.isCorrect)?.length || 0;
  const answerXP = correctAttempts * config.perCorrectAnswer;
  if (answerXP > 0) {
    xp += answerXP;
    breakdown.push({ reason: `${correctAttempts} Correct`, xp: answerXP });
  }
  
  // Size level bonus (smaller = better)
  const finalSize = results.finalResolvedSize || 80;
  const sizeLevels = Math.floor((80 - finalSize) / 10);
  const sizeXP = sizeLevels * config.perSizeLevel;
  if (sizeXP > 0) {
    xp += sizeXP;
    breakdown.push({ reason: `Reached ${finalSize}px`, xp: sizeXP });
  }
  
  // Perfect bonus (reached smallest size)
  if (finalSize <= 20) {
    xp += config.perfectBonus;
    breakdown.push({ reason: 'Maximum Acuity!', xp: config.perfectBonus });
  }
  
  return { totalXP: xp, breakdown };
};

/**
 * Calculate XP for Motor Skills Game
 */
export const calculateMotorSkillsXP = (roundStats, totalStats) => {
  const config = XP_CONFIG.motorSkills;
  let xp = config.baseCompletion;
  let breakdown = [{ reason: 'All Rounds Complete', xp: config.baseCompletion }];
  
  // Per bubble hit
  const totalHits = totalStats.totalHits || 0;
  const hitXP = totalHits * config.perBubbleHit;
  if (hitXP > 0) {
    xp += hitXP;
    breakdown.push({ reason: `${totalHits} Bubbles Popped`, xp: hitXP });
  }
  
  // Max combo bonus
  const maxCombo = totalStats.maxCombo || 0;
  const comboXP = Math.floor(maxCombo * config.comboMultiplier * 10);
  if (comboXP > 0) {
    xp += comboXP;
    breakdown.push({ reason: `Max Combo: ${maxCombo}x`, xp: comboXP });
  }
  
  // Accuracy bonus
  const accuracy = totalStats.accuracy || 0;
  if (accuracy >= 90) {
    xp += config.accuracyBonus;
    breakdown.push({ reason: 'Sharpshooter (90%+)', xp: config.accuracyBonus });
  }
  
  return { totalXP: xp, breakdown };
};

/**
 * Calculate XP for Literacy Quiz
 */
export const calculateLiteracyXP = (results) => {
  const config = XP_CONFIG.literacy;
  let xp = config.baseCompletion;
  let breakdown = [{ reason: 'Quiz Complete', xp: config.baseCompletion }];
  
  // Correct answers
  const correctAnswers = results.responses?.filter(r => r.isCorrect)?.length || 0;
  const answerXP = correctAnswers * config.perCorrectAnswer;
  if (answerXP > 0) {
    xp += answerXP;
    breakdown.push({ reason: `${correctAnswers} Correct Answers`, xp: answerXP });
  }
  
  // Max streak bonus
  const maxStreak = results.maxStreak || 0;
  const streakXP = maxStreak * config.streakBonus;
  if (streakXP > 0) {
    xp += streakXP;
    breakdown.push({ reason: `${maxStreak} Answer Streak`, xp: streakXP });
  }
  
  // Perfect score bonus
  const totalQuestions = results.responses?.length || 0;
  if (correctAnswers === totalQuestions && totalQuestions > 0) {
    xp += config.perfectBonus;
    breakdown.push({ reason: 'Perfect Score!', xp: config.perfectBonus });
  }
  
  return { totalXP: xp, breakdown };
};

/**
 * Check and return newly unlocked achievements
 */
export const checkAchievements = (gameState, existingAchievements = []) => {
  const newAchievements = [];
  const existingIds = existingAchievements.map(a => a.id);
  
  // Helper to add achievement if not already earned
  const addIfNew = (achievementId) => {
    if (!existingIds.includes(achievementId) && ACHIEVEMENTS[achievementId]) {
      newAchievements.push(ACHIEVEMENTS[achievementId]);
    }
  };
  
  // Check perception achievements
  if (gameState.colorBlindness?.completed) {
    const correctPlates = gameState.colorBlindness.plates?.filter(p => p.isCorrect)?.length || 0;
    if (correctPlates === gameState.colorBlindness.plates?.length) {
      addIfNew('perfect_vision');
    }
  }
  
  if (gameState.visualAcuity?.completed) {
    if (gameState.visualAcuity.finalResolvedSize <= 20) {
      addIfNew('hawk_sight');
    }
    if (gameState.visualAcuity.totalTime && gameState.visualAcuity.totalTime < 60000) {
      addIfNew('speed_reader');
    }
  }
  
  // Check reaction achievements
  if (gameState.motorSkills?.completed) {
    const stats = gameState.motorSkills;
    if (stats.maxCombo >= 10) {
      addIfNew('combo_master');
    }
    if (stats.accuracy >= 90) {
      addIfNew('sharpshooter');
    }
    if (stats.hasPerfectRound) {
      addIfNew('untouchable');
    }
    if (stats.avgReactionTime && stats.avgReactionTime < 400) {
      addIfNew('speed_demon');
    }
  }
  
  // Check knowledge achievements
  if (gameState.literacy?.completed) {
    const results = gameState.literacy;
    const correctAnswers = results.responses?.filter(r => r.isCorrect)?.length || 0;
    const totalQuestions = results.responses?.length || 0;
    
    if (correctAnswers === totalQuestions && totalQuestions > 0) {
      addIfNew('scholar');
    }
    if (results.maxStreak >= 5) {
      addIfNew('streak_legend');
    }
    if (results.avgResponseTime && results.avgResponseTime < 5000) {
      addIfNew('quick_thinker');
    }
    // Check category mastery
    if (results.categoryScores) {
      const hasPerfectCategory = Object.values(results.categoryScores).some(
        score => score.correct === score.total && score.total > 0
      );
      if (hasPerfectCategory) {
        addIfNew('category_master');
      }
    }
  }
  
  // Check overall achievements
  const allCompleted = 
    gameState.colorBlindness?.completed && 
    gameState.visualAcuity?.completed && 
    gameState.motorSkills?.completed && 
    gameState.literacy?.completed;
    
  if (allCompleted) {
    addIfNew('completionist');
    
    // Check total time for speedrunner
    if (gameState.totalTime && gameState.totalTime < 300000) { // 5 minutes
      addIfNew('speedrunner');
    }
  }
  
  return newAchievements;
};

/**
 * Generate motivational message based on performance
 */
export const getMotivationalMessage = (rank, xp) => {
  const messages = {
    recruit: [
      "Every legend starts somewhere. Keep pushing, Recruit!",
      "Your journey has begun. The Academy awaits your growth!",
    ],
    cadet: [
      "You're showing promise, Cadet. Keep up the momentum!",
      "The training is paying off. Elite status awaits!",
    ],
    agent: [
      "Agent status achieved! You're becoming a force to reckon with.",
      "Your skills are sharp. Push for Elite!",
    ],
    elite: [
      "Elite Agent! Your abilities are exceptional.",
      "Few reach this level. Legendary status is within reach!",
    ],
    legendary: [
      "LEGENDARY! You've mastered the AURA trials!",
      "You are among the best. The Academy salutes you!",
    ],
  };
  
  const rankMessages = messages[rank.id] || messages.recruit;
  return rankMessages[Math.floor(Math.random() * rankMessages.length)];
};

/**
 * Format XP number with animation-friendly structure
 */
export const formatXP = (xp) => {
  return xp.toLocaleString();
};

/**
 * Calculate chamber performance score (0-100)
 */
export const calculateChamberScore = (chamberType, results) => {
  switch (chamberType) {
    case 'colorBlindness': {
      const correct = results.plates?.filter(p => p.isCorrect)?.length || 0;
      const total = results.plates?.length || 1;
      return Math.round((correct / total) * 100);
    }
    case 'visualAcuity': {
      // Score based on final size reached (80 -> 20)
      const finalSize = results.finalResolvedSize || 80;
      const progress = (80 - finalSize) / 60; // 0 to 1
      return Math.round(progress * 100);
    }
    case 'motorSkills': {
      return Math.round(results.accuracy || 0);
    }
    case 'literacy': {
      const correct = results.responses?.filter(r => r.isCorrect)?.length || 0;
      const total = results.responses?.length || 1;
      return Math.round((correct / total) * 100);
    }
    default:
      return 0;
  }
};

