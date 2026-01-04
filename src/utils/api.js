import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Session Management
export const createSession = async (sessionData) => {
  try {
    const response = await api.post('/results/session', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

// Check if userId already exists
export const checkUserIdExists = async (userId) => {
  try {
    const response = await api.get(`/results/check-userid/${encodeURIComponent(userId)}`);
    return response.data;
  } catch (error) {
    console.error('Error checking userId:', error);
    throw error;
  }
};

// Get a unique userId suggestion
export const suggestUserId = async (baseId = '') => {
  try {
    const params = baseId ? `?baseId=${encodeURIComponent(baseId)}` : '';
    const response = await api.get(`/results/suggest-userid${params}`);
    return response.data;
  } catch (error) {
    console.error('Error getting userId suggestion:', error);
    throw error;
  }
};

// Update session with performance metrics
export const updateSessionPerformance = async (sessionId, perfMetrics) => {
  try {
    const response = await api.patch('/results/session/performance', {
      sessionId,
      perf: perfMetrics,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating session performance:', error);
    throw error;
  }
};

// Vision Results
export const saveVisionResults = async (resultsData) => {
  try {
    const response = await api.post('/results/vision', resultsData);
    return response.data;
  } catch (error) {
    console.error('Error saving vision results:', error);
    throw error;
  }
};

// Literacy Results
export const saveLiteracyResults = async (resultsData) => {
  try {
    const response = await api.post('/results/literacy', resultsData);
    return response.data;
  } catch (error) {
    console.error('Error saving literacy results:', error);
    throw error;
  }
};

// Get Session Results
export const getSessionResults = async (sessionId) => {
  try {
    const response = await api.get(`/results/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching session results:', error);
    throw error;
  }
};

// Update Session Module Completion
export const updateModuleCompletion = async (sessionId, moduleName) => {
  try {
    const response = await api.post('/results/module-complete', {
      sessionId,
      moduleName,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating module completion:', error);
    throw error;
  }
};

// ==================== ML-READY MOTOR SKILLS APIs ====================

/**
 * Log pointer trace samples (for kinematics/Fitts computation)
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {array} samples - Array of pointer samples [{round, tms, x, y, isDown, pointerType}]
 */
export const logPointerSamples = async (sessionId, userId, samples) => {
  try {
    const response = await api.post('/motor/trace', {
      sessionId,
      userId,
      samples,
    });
    return response.data;
  } catch (error) {
    console.error('Error logging pointer samples:', error);
    throw error;
  }
};

/**
 * Log motor attempts (for ML training)
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {array} attempts - Array of attempt objects with features
 */
export const logMotorAttempts = async (sessionId, userId, attempts) => {
  try {
    const response = await api.post('/motor/attempts', {
      sessionId,
      userId,
      attempts,
    });
    return response.data;
  } catch (error) {
    console.error('Error logging motor attempts:', error);
    throw error;
  }
};

/**
 * Compute round summary
 * @param {string} sessionId - Session ID
 * @param {string} participantId - Participant ID
 * @param {number} round - Round number (1-3)
 */
export const computeRoundSummary = async (sessionId, participantId, round) => {
  try {
    const response = await api.post('/motor/summary/round', {
      sessionId,
      participantId,
      round,
    });
    return response.data;
  } catch (error) {
    console.error('Error computing round summary:', error);
    throw error;
  }
};

/**
 * Compute session summary
 * @param {string} sessionId - Session ID
 * @param {string} participantId - Participant ID
 */
export const computeSessionSummary = async (sessionId, participantId) => {
  try {
    const response = await api.post('/motor/summary/session', {
      sessionId,
      participantId,
    });
    return response.data;
  } catch (error) {
    console.error('Error computing session summary:', error);
    throw error;
  }
};

// ==================== INTERACTION ANALYTICS APIs ====================

/**
 * Save interaction analytics batch
 * @param {object} analyticsData - Interaction analytics data
 */
export const saveInteractionAnalytics = async (analyticsData) => {
  try {
    const response = await api.post('/interactions', analyticsData);
    return response.data;
  } catch (error) {
    console.error('Error saving interaction analytics:', error);
    throw error;
  }
};

/**
 * Save multiple interaction analytics batches
 * @param {array} batches - Array of analytics batches
 */
export const saveInteractionAnalyticsBatch = async (batches) => {
  try {
    const response = await api.post('/interactions/batch', { batches });
    return response.data;
  } catch (error) {
    console.error('Error saving interaction analytics batch:', error);
    throw error;
  }
};

/**
 * Get interaction analytics for a session
 * @param {string} sessionId - Session ID
 * @param {string} module - Optional module filter
 * @param {boolean} includeRawSamples - Whether to include raw samples
 */
export const getInteractionAnalytics = async (sessionId, module = null, includeRawSamples = false) => {
  try {
    let url = `/interactions/${sessionId}?includeRawSamples=${includeRawSamples}`;
    if (module) url += `&module=${module}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching interaction analytics:', error);
    throw error;
  }
};

/**
 * Get interaction analytics summary for a session
 * @param {string} sessionId - Session ID
 */
export const getInteractionAnalyticsSummary = async (sessionId) => {
  try {
    const response = await api.get(`/interactions/summary/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching interaction analytics summary:', error);
    throw error;
  }
};

// ==================== IMPAIRMENT PROFILE APIs ====================

/**
 * Save impairment profile
 * @param {object} profileData - Impairment profile (snake_case)
 * 
 * Schema:
 * {
 *   user_id: "u_001",
 *   session_id: "onb_001",
 *   captured_at: "2025-10-06T11:00:00Z",
 *   impairment_probs: {
 *     vision: { vision_loss: 0.2, color_blindness: 0.1 },
 *     motor: { inaccurate_click: 0.2 },
 *     literacy: 0.4
 *   },
 *   onboarding_metrics: { avg_reaction_ms: 720, hit_rate: 0.88 },
 *   device_context: { os: "Windows", browser: "Chrome", screen_w: 1440, screen_h: 900, dpr: 1 }
 * }
 */
export const saveImpairmentProfile = async (profileData) => {
  try {
    const response = await api.post('/impairment/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Error saving impairment profile:', error);
    throw error;
  }
};

/**
 * Get impairment profile by session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Impairment profile
 */
export const getImpairmentProfile = async (sessionId) => {
  try {
    const response = await api.get(`/impairment/profile/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching impairment profile:', error);
    throw error;
  }
};

/**
 * Get impairment profile for a user
 * @param {string} userId - User ID (unique primary key)
 * @returns {Promise<object>} User's impairment profile
 */
export const getUserImpairmentProfile = async (userId) => {
  try {
    const response = await api.get(`/impairment/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user impairment profile:', error);
    throw error;
  }
};

/**
 * Delete impairment profile for a user
 * @param {string} userId - User ID
 */
export const deleteUserImpairmentProfile = async (userId) => {
  try {
    const response = await api.delete(`/impairment/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user impairment profile:', error);
    throw error;
  }
};

// ==================== DEVICE CONTEXT APIs ====================

/**
 * Save device context
 * @param {object} contextData - Device context data
 * 
 * Schema:
 * {
 *   user_id: "u_29922",
 *   session_id: "onb_001",
 *   captured_at: "2025-10-06T11:00:00Z",
 *   viewportWidth: 2560,
 *   viewportHeight: 1305,
 *   devicePixelRatio: 1
 * }
 */
export const saveDeviceContext = async (contextData) => {
  try {
    const response = await api.post('/device-context', contextData);
    return response.data;
  } catch (error) {
    console.error('Error saving device context:', error);
    throw error;
  }
};

/**
 * Get device context for a user
 * @param {string} userId - User ID (unique primary key)
 * @returns {Promise<object>} User's device context
 */
export const getDeviceContext = async (userId) => {
  try {
    const response = await api.get(`/device-context/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device context:', error);
    throw error;
  }
};

export default api;

