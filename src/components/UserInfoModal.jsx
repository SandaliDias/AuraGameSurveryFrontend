import { useState, useEffect, useRef, useCallback } from 'react';
import { createSession, checkUserIdExists, suggestUserId } from '../utils/api';
import useStore from '../state/store';
import useDeviceInfo from '../hooks/useDeviceInfo';
import logo from '../resources/logo.png';

const UserInfoModal = ({ isOpen, onClose, onSubmit, onUserIdSet }) => {
  const sessionId = useStore((state) => state.sessionId);
  const deviceInfo = useDeviceInfo();
  
  const [formData, setFormData] = useState({
    userId: '',
    age: '',
    gender: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const [userIdExists, setUserIdExists] = useState(false);
  const [suggestedUserId, setSuggestedUserId] = useState('');
  const checkTimeoutRef = useRef(null);
  
  // Pre-fill userId from localStorage if exists (returning user)
  useEffect(() => {
    const savedUserId = localStorage.getItem('aura_user_id');
    if (savedUserId) {
      setFormData(prev => ({ ...prev, userId: savedUserId }));
      // For returning users, don't show the "exists" error since it's their own ID
      setUserIdExists(false);
    }
  }, []);

  // Debounced check for userId uniqueness
  const checkUserIdUniqueness = useCallback(async (userId) => {
    const trimmed = userId.trim();
    if (trimmed.length < 2) {
      setUserIdExists(false);
      setSuggestedUserId('');
      return;
    }

    // Check if this is the user's own saved ID (returning user)
    const savedUserId = localStorage.getItem('aura_user_id');
    if (savedUserId && trimmed === savedUserId) {
      setUserIdExists(false);
      setSuggestedUserId('');
      return;
    }

    setIsCheckingUserId(true);
    try {
      const result = await checkUserIdExists(trimmed);
      setUserIdExists(result.exists);
      
      if (result.exists) {
        // Get a suggestion based on the entered ID
        const suggestion = await suggestUserId(trimmed);
        setSuggestedUserId(suggestion.suggestion);
      } else {
        setSuggestedUserId('');
      }
    } catch (error) {
      console.error('Error checking userId:', error);
      // Don't block on error, allow submission
      setUserIdExists(false);
    } finally {
      setIsCheckingUserId(false);
    }
  }, []);

  // Handle userId change with debounce
  const handleUserIdChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, userId: value }));
    
    // Clear previous timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    
    // Clear error when typing
    if (errors.userId) {
      setErrors(prev => ({ ...prev, userId: '' }));
    }
    
    // Debounce the uniqueness check
    checkTimeoutRef.current = setTimeout(() => {
      checkUserIdUniqueness(value);
    }, 500);
  };

  // Use suggested userId
  const useSuggestedId = () => {
    setFormData(prev => ({ ...prev, userId: suggestedUserId }));
    setUserIdExists(false);
    setSuggestedUserId('');
    setErrors(prev => ({ ...prev, userId: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate User ID
    const trimmedUserId = formData.userId.trim();
    if (!trimmedUserId) {
      newErrors.userId = 'User ID is required';
    } else if (trimmedUserId.length < 2) {
      newErrors.userId = 'User ID must be at least 2 characters';
    } else if (userIdExists) {
      newErrors.userId = 'This User ID is already taken';
    }

    const age = parseInt(formData.age);
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(age) || age < 18 || age > 120) {
      newErrors.age = 'You must be 18 or older to participate';
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    const trimmedUserId = formData.userId.trim();

    try {
      await createSession({
        sessionId,
        userId: trimmedUserId,
        userAgent: deviceInfo.userAgent,
        screenResolution: deviceInfo.screenResolution,
        deviceType: deviceInfo.deviceType,
        preferredTheme: deviceInfo.preferredTheme,
        viewportWidth: deviceInfo.viewportWidth,
        viewportHeight: deviceInfo.viewportHeight,
        highContrastMode: deviceInfo.highContrastMode,
        reducedMotionPreference: deviceInfo.reducedMotionPreference,
        devicePixelRatio: deviceInfo.devicePixelRatio,
        hardwareConcurrency: deviceInfo.hardwareConcurrency,
        pageLoadTime: deviceInfo.pageLoadTime,
        connectionType: deviceInfo.connectionType,
        memory: deviceInfo.memory,
        platform: deviceInfo.platform,
        language: deviceInfo.language,
        device: deviceInfo.device,
        screen: deviceInfo.screen,
        userInfo: {
          age: parseInt(formData.age),
          gender: formData.gender,
        },
      });

      // Only save to localStorage after successful creation
      localStorage.setItem('aura_user_id', trimmedUserId);
      
      // Notify parent about userId (for GameContext)
      if (onUserIdSet) {
        onUserIdSet(trimmedUserId);
      }

      onSubmit({ ...formData, userId: trimmedUserId });
      onClose();
    } catch (error) {
      console.error('Error saving user info:', error);
      
      // Check if error is due to duplicate userId
      const errorMessage = error.response?.data?.error || error.message || '';
      const isDuplicateUserId = 
        errorMessage.toLowerCase().includes('duplicate') ||
        errorMessage.toLowerCase().includes('unique') ||
        errorMessage.toLowerCase().includes('userid') ||
        errorMessage.toLowerCase().includes('user_id') ||
        error.response?.status === 409 ||
        (error.response?.data?.code === 11000); // MongoDB duplicate key error code
      
      if (isDuplicateUserId) {
        // Set userId as taken
        setUserIdExists(true);
        setErrors({ userId: 'This User ID is already taken. Please choose a different one.' });
        
        // Get a suggestion
        try {
          const suggestion = await suggestUserId(trimmedUserId);
          setSuggestedUserId(suggestion.suggestion);
        } catch (suggestionError) {
          console.error('Error getting suggestion:', suggestionError);
        }
      } else {
        setErrors({ submit: 'Failed to save information. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-gray-900/90 backdrop-blur-xl border border-gray-800 p-8 shadow-2xl animate-fade-in relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(var(--primary-color-rgb), 0.2)' }} />
        
        {/* Header */}
        <div className="relative text-center mb-8">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-white mb-2">Ready to Play?</h2>
          <p className="text-sm text-gray-400">
            Quick setup before the games begin!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-6">
          {/* User ID Input */}
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-300 mb-2">
              User ID <span style={{ color: 'var(--primary-color)' }}>*</span>
            </label>
            <div className="relative">
              <input
                id="userId"
                name="userId"
                type="text"
                value={formData.userId}
                onChange={handleUserIdChange}
                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 text-white placeholder-gray-500 transition-all duration-300 focus:outline-none font-mono pr-10"
                style={{
                  border: (errors.userId || userIdExists)
                    ? '2px solid rgba(239, 68, 68, 0.5)' 
                    : formData.userId.trim().length >= 2 && !isCheckingUserId && !userIdExists
                    ? '2px solid rgba(34, 197, 94, 0.5)'
                    : '2px solid rgba(55, 65, 81, 0.5)',
                }}
                onFocus={(e) => {
                  if (!errors.userId && !userIdExists) {
                    e.target.style.borderColor = 'rgba(var(--primary-color-rgb), 0.5)';
                    e.target.style.boxShadow = '0 0 15px rgba(var(--primary-color-rgb), 0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.userId && !userIdExists) {
                    e.target.style.borderColor = formData.userId.trim().length >= 2 
                      ? 'rgba(34, 197, 94, 0.5)' 
                      : 'rgba(55, 65, 81, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
                placeholder="Enter your unique ID"
                autoFocus
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingUserId && (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                )}
                {!isCheckingUserId && formData.userId.trim().length >= 2 && !userIdExists && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {!isCheckingUserId && userIdExists && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            {/* Error message */}
            {(errors.userId || userIdExists) && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.userId || 'This User ID is already taken'}
              </p>
            )}
            {/* Suggestion */}
            {userIdExists && suggestedUserId && (
              <button
                type="button"
                onClick={useSuggestedId}
                className="mt-2 w-full py-2 px-4 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
                  border: '1px solid rgba(var(--primary-color-rgb), 0.3)',
                  color: 'var(--primary-color)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Use suggested: <span className="font-mono font-bold">{suggestedUserId}</span>
              </button>
            )}
            <p className="text-xs text-gray-500 mt-1">This ID will be used to track your progress</p>
          </div>
          
          {/* Age Input */}
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-2">
              Age <span style={{ color: 'var(--primary-color)' }}>*</span>
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min="18"
              max="120"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 text-white placeholder-gray-500 transition-all duration-300 focus:outline-none"
              style={{
                border: errors.age 
                  ? '2px solid rgba(239, 68, 68, 0.5)' 
                  : '2px solid rgba(55, 65, 81, 0.5)',
              }}
              onFocus={(e) => {
                if (!errors.age) {
                  e.target.style.borderColor = 'rgba(var(--primary-color-rgb), 0.5)';
                  e.target.style.boxShadow = '0 0 15px rgba(var(--primary-color-rgb), 0.1)';
                }
              }}
              onBlur={(e) => {
                if (!errors.age) {
                  e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
                  e.target.style.boxShadow = 'none';
                }
              }}
              placeholder="Enter your age"
            />
            {errors.age && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.age}
              </p>
            )}
          </div>

          {/* Gender Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gender <span style={{ color: 'var(--primary-color)' }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'gender', value: option } })}
                  className="p-3 rounded-xl text-sm font-medium transition-all duration-300"
                  style={formData.gender === option 
                    ? { 
                        backgroundColor: 'var(--primary-color)', 
                        color: 'white',
                        boxShadow: '0 0 20px var(--primary-color-glow)'
                      }
                    : { 
                        backgroundColor: 'rgba(31, 41, 55, 0.5)',
                        color: '#d1d5db',
                        border: '1px solid rgba(55, 65, 81, 0.5)'
                      }
                  }
                >
                  {option}
                </button>
              ))}
            </div>
            {errors.gender && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.gender}
              </p>
            )}
          </div>

          {/* Privacy Notice */}
          <div 
            className="rounded-xl p-4"
            style={{ 
              backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
              border: '1px solid rgba(var(--primary-color-rgb), 0.2)'
            }}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl">🔒</div>
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--primary-color)' }}>Your Privacy is Safe</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Just for making the games better! Everything stays anonymous.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-sm text-center">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isCheckingUserId || userIdExists}
            className="w-full py-4 px-6 rounded-xl font-semibold text-black transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            style={{ 
              background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-light) 100%)',
              boxShadow: '0 4px 20px var(--primary-color-glow)'
            }}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Loading Games...</span>
              </>
            ) : (
              <>
                <span>Start Playing!</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="relative text-center text-gray-600 text-xs mt-4">
          <span style={{ color: 'var(--primary-color)' }}>*</span> Required fields
        </p>
      </div>
    </div>
  );
};

export default UserInfoModal;
