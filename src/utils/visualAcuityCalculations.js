/**
 * Visual Acuity Calculation Utilities
 * Based on standard optometric formulas and Snellen notation
 * 
 * IMPORTANT: All calculations assume 50cm viewing distance (arm's length)
 * This is the standard for near vision testing on screens.
 */

// Standard viewing distance for screen-based vision test (arm's length)
export const STANDARD_VIEWING_DISTANCE_CM = 50;

/**
 * Calculate visual acuity based on resolved size vs 20/20 threshold
 * This is the PRIMARY method for screen-based vision testing
 * 
 * @param {number} resolvedSize - Smallest size the user could resolve (pixels)
 * @param {number} twentyTwentyThreshold - 20/20 threshold for this screen (pixels)
 * @returns {object} Visual acuity metrics
 */
export const calculateVisualAcuityFromThreshold = (resolvedSize, twentyTwentyThreshold) => {
  if (!resolvedSize || resolvedSize <= 0) {
    return {
      visualAcuityDecimal: 0,
      visionLoss: 1.0,
      snellenDenominator: 400,
      snellenEstimate: '20/400',
    };
  }
  
  if (!twentyTwentyThreshold || twentyTwentyThreshold <= 0) {
    twentyTwentyThreshold = 12; // Fallback default
  }
  
  // Visual acuity = threshold / resolvedSize
  // If resolved = threshold (e.g., 12px), acuity = 1.0 (20/20)
  // If resolved = 2x threshold (e.g., 24px), acuity = 0.5 (20/40) - worse vision
  // If resolved = 0.5x threshold (e.g., 6px), acuity = 2.0 (20/10) - better vision
  const visualAcuityDecimal = Math.round((twentyTwentyThreshold / resolvedSize) * 100) / 100;
  
  // Snellen denominator: 20 / acuity
  // acuity 1.0 = 20/20, acuity 0.5 = 20/40
  const snellenDenominator = Math.round(20 / Math.max(0.05, visualAcuityDecimal));
  const clampedDenominator = Math.max(10, Math.min(400, snellenDenominator));
  
  // Vision loss: how much worse than 20/20
  // acuity >= 1.0 = no loss (0.0)
  // acuity 0.5 = 50% loss (0.5)
  const visionLoss = visualAcuityDecimal >= 1.0 
    ? 0.0 
    : Math.round(Math.max(0, Math.min(1, 1 - visualAcuityDecimal)) * 100) / 100;
  
  return {
    visualAcuityDecimal: Math.min(2.0, visualAcuityDecimal), // Cap at 2.0 (20/10)
    visionLoss,
    snellenDenominator: clampedDenominator,
    snellenEstimate: `20/${clampedDenominator}`,
  };
};

/**
 * Calculate visual angle in degrees
 * @param {number} objectSize - Size of the object in pixels
 * @param {number} viewingDistance - Distance from screen in cm
 * @param {number} pixelsPerCm - Pixels per cm (calculated from screen DPI)
 * @returns {number} Visual angle in degrees
 */
export const calculateVisualAngle = (objectSize, viewingDistance = 50, pixelsPerCm = 37.8) => {
  // Convert pixels to cm
  const objectSizeCm = objectSize / pixelsPerCm;
  
  // Calculate visual angle in radians
  const angleRadians = 2 * Math.atan(objectSizeCm / (2 * viewingDistance));
  
  // Convert to degrees
  const angleDegrees = angleRadians * (180 / Math.PI);
  
  return angleDegrees;
};

/**
 * Calculate Minimum Angle of Resolution (MAR)
 * @param {number} visualAngle - Visual angle in degrees
 * @returns {number} MAR in arc minutes
 */
export const calculateMAR = (visualAngle) => {
  // Convert degrees to arc minutes (1 degree = 60 arc minutes)
  return visualAngle * 60;
};

/**
 * Calculate Snellen denominator from MAR
 * @param {number} mar - Minimum Angle of Resolution in arc minutes
 * @returns {number} Snellen denominator
 */
export const calculateSnellenDenominator = (mar) => {
  // Standard: 20/20 vision = 1 arc minute
  // Denominator = 20 * MAR
  return Math.round(20 * mar);
};

/**
 * Convert Snellen denominator to Snellen notation
 * @param {number} denominator - Snellen denominator
 * @returns {string} Snellen notation (e.g., "20/40")
 */
export const getSnellenNotation = (denominator) => {
  // Clamp to reasonable values
  const clampedDenominator = Math.max(10, Math.min(400, denominator));
  return `20/${clampedDenominator}`;
};

/**
 * Calculate visual acuity as a decimal (Snellen decimal)
 * 20/20 = 1.0, 20/40 = 0.5, 20/100 = 0.2, etc.
 * @param {number} snellenDenominator - The denominator in Snellen notation
 * @returns {number} Visual acuity decimal (0.0 to 2.0+)
 */
export const calculateVisualAcuityDecimal = (snellenDenominator) => {
  if (!snellenDenominator || snellenDenominator <= 0) return 0;
  // Visual Acuity = 20 / denominator
  // 20/20 = 1.0 (normal), 20/10 = 2.0 (better than normal), 20/40 = 0.5
  const decimal = 20 / snellenDenominator;
  return Math.round(decimal * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate vision loss as a decimal (0.0 = no loss, 1.0 = total loss)
 * Based on WHO/ICD-11 visual impairment categories
 * @param {number} visualAcuityDecimal - Visual acuity as decimal (e.g., 0.5 for 20/40)
 * @returns {number} Vision loss decimal (0.0 to 1.0)
 */
export const calculateVisionLoss = (visualAcuityDecimal) => {
  if (!visualAcuityDecimal || visualAcuityDecimal <= 0) return 1.0;
  
  // Vision loss = 1 - visual acuity (capped at 1.0 for normal/better vision)
  // If acuity >= 1.0 (20/20 or better), no loss
  // If acuity = 0.5 (20/40), loss = 0.5
  // If acuity = 0.1 (20/200), loss = 0.9
  const loss = Math.max(0, 1 - visualAcuityDecimal);
  return Math.round(loss * 100) / 100; // Round to 2 decimal places
};

/**
 * Get vision category based on WHO/ICD-11 classification
 * @param {number} visualAcuityDecimal - Visual acuity decimal
 * @returns {object} Vision category with name and description
 */
export const getVisionCategory = (visualAcuityDecimal) => {
  if (visualAcuityDecimal >= 1.0) {
    return {
      category: 'normal',
      name: 'Normal Vision',
      snellenRange: '20/20 or better',
      description: 'No visual impairment'
    };
  } else if (visualAcuityDecimal >= 0.5) {
    return {
      category: 'mild',
      name: 'Mild Vision Loss',
      snellenRange: '20/25 to 20/40',
      description: 'Mild visual impairment - may need corrective lenses'
    };
  } else if (visualAcuityDecimal >= 0.3) {
    return {
      category: 'moderate',
      name: 'Moderate Vision Loss',
      snellenRange: '20/50 to 20/70',
      description: 'Moderate visual impairment'
    };
  } else if (visualAcuityDecimal >= 0.1) {
    return {
      category: 'severe',
      name: 'Severe Vision Loss',
      snellenRange: '20/100 to 20/200',
      description: 'Severe visual impairment'
    };
  } else {
    return {
      category: 'profound',
      name: 'Profound Vision Loss',
      snellenRange: 'Worse than 20/200',
      description: 'Profound visual impairment - legal blindness threshold'
    };
  }
};

/**
 * Calculate all visual acuity metrics
 * @param {number} objectSize - Size in pixels
 * @param {number} viewingDistance - Distance in cm (default 50cm)
 * @param {number} screenPPI - Screen pixels per inch (default 96)
 * @returns {object} Object containing all metrics
 */
export const calculateVisualAcuityMetrics = (
  objectSize, 
  viewingDistance = 50, 
  screenPPI = 96
) => {
  // Calculate pixels per cm from PPI
  const pixelsPerCm = screenPPI / 2.54;
  
  // Calculate visual angle
  const visualAngle = calculateVisualAngle(objectSize, viewingDistance, pixelsPerCm);
  
  // Calculate MAR
  const mar = calculateMAR(visualAngle);
  
  // Calculate Snellen denominator
  const snellenDenominator = calculateSnellenDenominator(mar);
  
  // Get Snellen notation
  const snellenEstimate = getSnellenNotation(snellenDenominator);
  
  // Calculate visual acuity decimal (e.g., 0.5 for 20/40)
  const visualAcuityDecimal = calculateVisualAcuityDecimal(snellenDenominator);
  
  // Calculate vision loss decimal (e.g., 0.5 for 50% loss)
  const visionLoss = calculateVisionLoss(visualAcuityDecimal);
  
  // Get vision category
  const visionCategory = getVisionCategory(visualAcuityDecimal);
  
  return {
    objectSize,
    viewingDistance,
    visualAngle: parseFloat(visualAngle.toFixed(4)),
    mar: parseFloat(mar.toFixed(2)),
    snellenDenominator,
    snellenEstimate,
    // New decimal scores
    visualAcuityDecimal,  // 1.0 = 20/20, 0.5 = 20/40
    visionLoss,           // 0.0 = no loss, 0.5 = 50% loss
    visionCategory: visionCategory.category,
    visionCategoryName: visionCategory.name,
    visionCategoryDescription: visionCategory.description,
  };
};

/**
 * Estimate screen PPI if not provided
 * @param {number} screenWidth - Screen width in pixels
 * @param {number} screenHeight - Screen height in pixels
 * @returns {number} Estimated PPI
 */
export const estimateScreenPPI = (screenWidth, screenHeight) => {
  // Assume standard desktop monitor diagonal of 24 inches
  // This is a rough estimate; for accurate results, users should measure
  const diagonalPixels = Math.sqrt(screenWidth ** 2 + screenHeight ** 2);
  const assumedDiagonalInches = 24;
  return Math.round(diagonalPixels / assumedDiagonalInches);
};

/**
 * Get viewing distance prompt
 * @returns {number} Viewing distance in cm (can be enhanced to prompt user)
 */
export const getViewingDistance = () => {
  // Default comfortable viewing distance for desktop
  // Could be enhanced to detect device type or prompt user
  return 50; // cm
};
