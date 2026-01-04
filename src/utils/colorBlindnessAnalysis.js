/**
 * Color Blindness Analysis Utilities
 * Based on Ishihara plate interpretation
 */

// Ishihara plate definitions
export const ISHIHARA_PLATES = [
  {
    plateId: 1,
    imageName: 'ishihara_1.jpg',
    normalAnswer: '12',
    colorBlindAnswer: '12',
    description: 'Control plate - both normal and color blind can see 12',
  },
  {
    plateId: 2,
    imageName: 'ishihara_3.jpg',
    normalAnswer: '6',
    colorBlindAnswer: '5',
    description: 'Normal sees 6, red/green deficiency sees 5',
  },
  {
    plateId: 3,
    imageName: 'ishihara_11.jpg',
    normalAnswer: '6',
    colorBlindAnswer: 'nothing',
    description: 'Normal sees 6, red/green deficiency sees nothing',
  },
  {
    plateId: 4,
    imageName: 'ishihara_19.jpg',
    normalAnswer: 'nothing',
    colorBlindAnswer: '2',
    description: 'Normal sees nothing, red/green deficiency sees 2',
  },
];

/**
 * Calculate color vision score as a decimal (0.0 to 1.0)
 * @param {number} normalVisionCount - Number of correct normal vision answers
 * @param {number} totalPlates - Total number of plates tested
 * @returns {number} Score as decimal (1.0 = perfect, 0.0 = none correct)
 */
export const calculateColorVisionDecimal = (normalVisionCount, totalPlates) => {
  if (!totalPlates || totalPlates === 0) return 0;
  const decimal = normalVisionCount / totalPlates;
  return Math.round(decimal * 100) / 100; // Round to 2 decimal places
};

/**
 * Get color vision category based on score
 * @param {number} colorVisionDecimal - Color vision score (0.0 to 1.0)
 * @returns {object} Category with name and description
 */
export const getColorVisionCategory = (colorVisionDecimal) => {
  if (colorVisionDecimal >= 0.75) {
    return {
      category: 'normal',
      name: 'Normal Color Vision',
      description: 'Full color perception'
    };
  } else if (colorVisionDecimal >= 0.5) {
    return {
      category: 'mild',
      name: 'Mild Color Deficiency',
      description: 'Slight difficulty distinguishing some colors'
    };
  } else if (colorVisionDecimal >= 0.25) {
    return {
      category: 'moderate',
      name: 'Moderate Color Deficiency',
      description: 'Noticeable difficulty with red-green distinction'
    };
  } else {
    return {
      category: 'significant',
      name: 'Significant Color Deficiency',
      description: 'Major difficulty distinguishing colors'
    };
  }
};

/**
 * Analyze color blindness test results
 * @param {Array} plates - Array of plate response objects
 * @returns {object} Analysis results
 */
export const analyzeColorBlindness = (plates) => {
  if (!plates || plates.length === 0) {
    return {
      colorVisionScore: 0,        // Decimal: 0.0 to 1.0
      colorVisionPercent: 0,      // Legacy: 0 to 100
      diagnosis: 'Inconclusive',
      details: 'No test data available',
    };
  }

  let normalVisionCount = 0;
  let colorBlindCount = 0;
  let totalResponseTime = 0;

  plates.forEach((plate, index) => {
    const definition = ISHIHARA_PLATES[index];
    if (!definition) return;

    const userAnswer = String(plate.userAnswer).toLowerCase().trim();
    const normalAnswer = String(definition.normalAnswer).toLowerCase();
    const colorBlindAnswer = String(definition.colorBlindAnswer).toLowerCase();

    // Check which pattern the answer matches
    if (userAnswer === normalAnswer) {
      normalVisionCount++;
    } else if (userAnswer === colorBlindAnswer) {
      colorBlindCount++;
    }

    totalResponseTime += plate.responseTime || 0;
  });

  const totalPlates = plates.length;
  
  // Calculate decimal score (0.0 to 1.0)
  const colorVisionScore = calculateColorVisionDecimal(normalVisionCount, totalPlates);
  
  // Calculate color blindness score based ONLY on color blind pattern answers
  // This is NOT simply 1 - colorVisionScore, because random wrong answers don't indicate color blindness
  const colorBlindnessScore = totalPlates > 0 
    ? parseFloat((colorBlindCount / totalPlates).toFixed(2))
    : 0;
  
  // Legacy percentage for backwards compatibility
  const colorVisionPercent = Math.round(colorVisionScore * 100);
  
  // Get category
  const colorCategory = getColorVisionCategory(colorVisionScore);

  // Determine diagnosis
  let diagnosis = 'Inconclusive';
  
  if (colorVisionScore >= 0.75) {
    diagnosis = 'Normal';
  } else if (colorBlindCount >= 2) {
    diagnosis = 'Suspected Red-Green Deficiency';
  } else if (colorVisionScore < 0.5) {
    diagnosis = 'Suspected Color Deficiency';
  }

  return {
    // Primary decimal score (0.0 to 1.0) - measures normal color vision
    colorVisionScore,
    
    // Color blindness score (0.0 to 1.0) - based ONLY on color blind pattern answers
    // This indicates actual color blindness, not just wrong answers
    colorBlindnessScore,
    
    // Legacy percentage (0-100) for backwards compatibility
    colorVisionPercent,
    
    // Diagnosis
    diagnosis,
    
    // Category info
    colorVisionCategory: colorCategory.category,
    colorVisionCategoryName: colorCategory.name,
    
    // Detailed counts
    normalVisionCount,
    colorBlindCount,
    totalPlates,
    
    // Timing
    averageResponseTime: Math.round(totalResponseTime / totalPlates),
    totalResponseTime,
    
    // Human-readable summary
    details: `Answered ${normalVisionCount} of ${totalPlates} plates correctly for normal vision (${colorVisionScore.toFixed(2)} score). Color blindness indicators: ${colorBlindCount} of ${totalPlates} (${colorBlindnessScore.toFixed(2)} score).`,
  };
};

/**
 * Check if an answer is correct for normal vision
 * @param {number} plateId - Plate identifier
 * @param {string} userAnswer - User's answer
 * @returns {boolean} True if correct for normal vision
 */
export const isNormalVisionAnswer = (plateId, userAnswer) => {
  const plate = ISHIHARA_PLATES.find(p => p.plateId === plateId);
  if (!plate) return false;
  
  return String(userAnswer).toLowerCase().trim() === String(plate.normalAnswer).toLowerCase();
};

/**
 * Check if an answer matches color blind pattern
 * @param {number} plateId - Plate identifier
 * @param {string} userAnswer - User's answer
 * @returns {boolean} True if matches color blind pattern
 */
export const isColorBlindAnswer = (plateId, userAnswer) => {
  const plate = ISHIHARA_PLATES.find(p => p.plateId === plateId);
  if (!plate) return false;
  
  return String(userAnswer).toLowerCase().trim() === String(plate.colorBlindAnswer).toLowerCase();
};
