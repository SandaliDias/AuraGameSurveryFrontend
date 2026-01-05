/**
 * Enhanced Motor Skills Tracking
 * Comprehensive tracking for the bubble-pop game
 */

import { 
  logPointerSamples,
  logMotorAttempts,
  computeRoundSummary,
  computeSessionSummary,
} from './api';

class MotorSkillsTracker {
  constructor(sessionId, userId = null) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.participantId = this.getOrCreateParticipantId();
    this.interactions = [];
    this.touchStartTimes = new Map();
    this.lastTapTime = 0;
    this.lastPosition = null;
    this.velocityHistory = [];
    this.trajectoryPoints = [];
    this.round = 1;
    
    // Pointer samples buffer for kinematics
    this.pointerSamples = [];
    this.lastSampleTime = 0;
    this.SAMPLE_INTERVAL = 33; // ~30Hz sampling (reduced from 60Hz to improve performance)
    this.isPointerDown = false;
    
    // Batching for performance
    this.interactionBuffer = [];
    this.BATCH_SIZE = 15; // Increased batch size to reduce flush frequency
    this.BATCH_TIMEOUT = 3000; // 3 seconds
    this.batchTimer = null;
    
    // Throttle pointer move tracking
    this.lastMoveTrackTime = 0;
    this.MOVE_TRACK_INTERVAL = 33; // ~30Hz for move tracking
    
  }
  
  // Set userId after initialization (if not available at construction time)
  setUserId(userId) {
    this.userId = userId;
  }
  
  // Get or create stable participant ID
  getOrCreateParticipantId() {
    let participantId = localStorage.getItem('participantId');
    if (!participantId) {
      participantId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('participantId', participantId);
    }
    return participantId;
  }

  // Track bubble spawn
  trackBubbleSpawn(bubbleData) {
    this.logInteraction('bubble_spawn', {
      bubbleId: bubbleData.id,
      column: bubbleData.column,
      speed: bubbleData.speed,
      round: this.round,
      spawnTime: bubbleData.spawnTime,
      initialPosition: {
        x: bubbleData.x,
        y: bubbleData.y,
      },
    });
  }

  // Track mouse/touch down
  trackPointerDown(event, bubbleId = null) {
    const now = Date.now();
    const coords = this.getCoordinates(event);
    
    this.touchStartTimes.set(bubbleId || 'screen', now);
    this.lastPosition = coords;
    this.trajectoryPoints = [{ ...coords, time: now }];
    
    this.logInteraction('pointer_down', {
      coordinates: coords,
      bubbleId,
      pointerType: event.pointerType || (event.touches ? 'touch' : 'mouse'),
      pressure: event.pressure || (event.touches?.[0]?.force) || 0,
      touchArea: event.touches?.[0] ? {
        radiusX: event.touches[0].radiusX,
        radiusY: event.touches[0].radiusY,
      } : null,
      round: this.round,
    });
  }

  // Track movement (for velocity, acceleration, trajectory)
  trackPointerMove(event) {
    const now = Date.now();
    
    // Throttle move tracking for better performance
    if (now - this.lastMoveTrackTime < this.MOVE_TRACK_INTERVAL) {
      return;
    }
    this.lastMoveTrackTime = now;
    
    const coords = this.getCoordinates(event);
    
    // Store normalized pointer sample for kinematics
    if (now - this.lastSampleTime >= this.SAMPLE_INTERVAL) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      this.pointerSamples.push({
        round: this.round,
        tms: now,
        x: coords.x / screenWidth,  // Normalized 0-1
        y: coords.y / screenHeight, // Normalized 0-1
        isDown: this.isPointerDown,
        pointerType: event.pointerType || (event.touches ? 'touch' : 'mouse'),
      });
      
      this.lastSampleTime = now;
      
      // Limit pointer samples buffer to prevent memory buildup
      if (this.pointerSamples.length > 1000) {
        this.pointerSamples = this.pointerSamples.slice(-800);
      }
    }
    
    // Calculate velocity and acceleration for local tracking
    if (this.lastPosition) {
      const dt = now - (this.trajectoryPoints[this.trajectoryPoints.length - 1]?.time || now);
      if (dt > 0) {
        const dx = coords.x - this.lastPosition.x;
        const dy = coords.y - this.lastPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / (dt / 1000); // pixels per second
        
        // Calculate acceleration
        const acceleration = this.velocityHistory.length > 0
          ? (velocity - this.velocityHistory[this.velocityHistory.length - 1].velocity) / (dt / 1000)
          : 0;
        
        // Track velocity history
        this.velocityHistory.push({
          velocity,
          acceleration,
          time: now,
        });
        
        // Keep only recent history (last 10 points)
        if (this.velocityHistory.length > 10) {
          this.velocityHistory.shift();
        }
        
        // Add to trajectory (limit size)
        this.trajectoryPoints.push({
          ...coords,
          time: now,
          velocity,
          acceleration,
        });
        
        // Limit trajectory points to prevent memory buildup
        if (this.trajectoryPoints.length > 100) {
          this.trajectoryPoints = this.trajectoryPoints.slice(-80);
        }
      }
    }
    
    this.lastPosition = coords;
  }
  
  // Track pointer down state
  trackPointerDownState(event) {
    this.isPointerDown = true;
  }
  
  // Track pointer up state
  trackPointerUpState(event) {
    this.isPointerDown = false;
  }

  // Track pointer up (end of tap/click)
  trackPointerUp(event, bubbleId = null, bubbleHit = false) {
    const now = Date.now();
    const coords = this.getCoordinates(event);
    const startTime = this.touchStartTimes.get(bubbleId || 'screen');
    const touchDuration = startTime ? now - startTime : 0;
    
    // Inter-tap interval
    const interTapInterval = this.lastTapTime ? now - this.lastTapTime : 0;
    this.lastTapTime = now;
    
    // Calculate trajectory metrics
    const trajectoryMetrics = this.analyzeTrajectory();
    
    // Clear tracking data
    this.touchStartTimes.delete(bubbleId || 'screen');
    this.velocityHistory = [];
    this.trajectoryPoints = [];
    this.lastPosition = null;
    
    this.logInteraction(bubbleHit ? 'bubble_hit' : 'stage_clicked_miss', {
      coordinates: coords,
      bubbleId,
      touchDuration,
      interTapInterval,
      trajectoryMetrics,
      round: this.round,
      success: bubbleHit,
    });
  }

  // Track bubble hit (successful click)
  trackBubbleHit(bubbleData, event) {
    const now = Date.now();
    const reactionTime = now - bubbleData.spawnTime;
    const coords = this.getCoordinates(event);
    
    // Calculate accuracy (distance from bubble center)
    const dx = coords.x - bubbleData.x;
    const dy = coords.y - bubbleData.y;
    const clickAccuracy = Math.sqrt(dx * dx + dy * dy);
    
    this.logInteraction('bubble_hit', {
      bubbleId: bubbleData.id,
      coordinates: coords,
      bubblePosition: { x: bubbleData.x, y: bubbleData.y },
      clickAccuracy: parseFloat(clickAccuracy.toFixed(2)),
      reactionTime,
      bubbleLifetime: now - bubbleData.spawnTime,
      spawnTime: bubbleData.spawnTime, // Add spawn time for feature extraction
      bubbleSpeed: bubbleData.speed,
      column: bubbleData.column,
      round: this.round,
    });
  }

  // Track missed bubble (escaped)
  trackBubbleMiss(bubbleData) {
    this.logInteraction('bubble_miss', {
      bubbleId: bubbleData.id,
      column: bubbleData.column,
      bubblePosition: { x: bubbleData.x, y: bubbleData.y }, // Add bubble position for target
      bubbleSpeed: bubbleData.speed,
      bubbleLifetime: Date.now() - bubbleData.spawnTime,
      spawnTime: bubbleData.spawnTime, // Add spawn time for feature extraction
      round: this.round,
    });
  }

  // Track round completion
  async trackRoundComplete(roundData) {
    const totalAttempts = roundData.hits + roundData.misses;
    const successRate = totalAttempts > 0 ? parseFloat((roundData.hits / totalAttempts * 100).toFixed(2)) : 0;
    
    this.logInteraction('round_end', {
      round: this.round,
      hits: roundData.hits,
      misses: roundData.misses,
      escaped: roundData.escaped,
      successRate,
      totalAttempts,
      roundDuration: roundData.duration,
      averageReactionTime: roundData.averageReactionTime,
    });
    
    // Flush current batch to ensure data is sent
    try {
      await this.flushBatch();
    } catch (error) {
      // Continue even if flush fails
    }
    
    // Send round-specific data to ML schemas
    try {
      await this.sendRoundDataToML(this.round);
    } catch (error) {
      // Continue even if ML data send fails
    }
    
    // Compute round summary on backend
    try {
      await computeRoundSummary(this.sessionId, this.participantId, this.round);
    } catch (error) {
      // Continue even if summary computation fails
    }
    
    this.round++;
  }
  
  // Send round-specific data to ML schemas
  async sendRoundDataToML(round) {
    // Send pointer samples for this round
    const roundSamples = this.pointerSamples.filter(s => s.round === round);
    
    if (roundSamples.length > 0) {
      try {
        await logPointerSamples(this.sessionId, this.userId, roundSamples);
      } catch (error) {
        // Continue even if pointer sample send fails
      }
    }
    
    // Extract attempts for this round
    const roundAttempts = this.interactions.filter(i => 
      (i.eventType === 'bubble_hit' || i.eventType === 'bubble_miss') && i.round === round
    );
    
    if (roundAttempts.length > 0) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const minDim = Math.min(screenWidth, screenHeight);
      
      const attempts = roundAttempts.map((event, idx) => {
        // Get reaction time - use explicit check for undefined/null to preserve 0
        const reactionTimeMs = event.reactionTime !== undefined && event.reactionTime !== null 
          ? event.reactionTime 
          : null;
        
        // Get click accuracy - same handling for 0 values
        const errorDistNorm = event.clickAccuracy !== undefined && event.clickAccuracy !== null
          ? event.clickAccuracy / minDim  // Normalize by min dimension
          : null;
        
        return {
          round: event.round,
          attemptId: `r${event.round}_${event.bubbleId || 'unknown'}`,
          bubbleId: event.bubbleId || 'unknown',
          spawnTms: event.spawnTime || 0,
          column: event.column !== undefined ? event.column : null,
          speedNorm: event.bubbleSpeed ? event.bubbleSpeed / minDim : 0,
          
          target: {
            x: event.bubblePosition ? event.bubblePosition.x / screenWidth : 0,
            y: event.bubblePosition ? event.bubblePosition.y / screenHeight : 0,
            radius: 40 / minDim,
          },
          
          click: {
            clicked: event.eventType === 'bubble_hit',
            hit: event.eventType === 'bubble_hit',
            missType: event.eventType === 'bubble_hit' ? 'hit' : (event.eventType === 'bubble_miss' ? 'timeout' : 'unknown'),
            tms: event.timestamp ? new Date(event.timestamp).getTime() : Date.now(),
            x: event.coordinates ? event.coordinates.x / screenWidth : null,
            y: event.coordinates ? event.coordinates.y / screenHeight : null,
          },
          
          timing: {
            reactionTimeMs,
          },
          
          spatial: {
            errorDistNorm,
          },
        };
      });
      
      try {
        await logMotorAttempts(this.sessionId, this.userId, attempts);
      } catch (error) {
        // Continue even if attempt send fails
      }
    }
  }

  // Helper: Get coordinates from event
  getCoordinates(event) {
    if (event.touches && event.touches[0]) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
    return {
      x: event.clientX || 0,
      y: event.clientY || 0,
    };
  }

  // Helper: Calculate jerkiness (variability in acceleration)
  calculateJerkiness() {
    if (this.velocityHistory.length < 3) return 0;
    
    const accelerations = this.velocityHistory.map(v => v.acceleration);
    const mean = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    const variance = accelerations.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accelerations.length;
    
    return Math.sqrt(variance);
  }

  // Helper: Analyze trajectory path
  analyzeTrajectory() {
    if (this.trajectoryPoints.length < 2) {
      return {
        pathLength: 0,
        straightness: 1,
        smoothness: 1,
        pointCount: this.trajectoryPoints.length,
      };
    }
    
    // Calculate total path length
    let pathLength = 0;
    for (let i = 1; i < this.trajectoryPoints.length; i++) {
      const dx = this.trajectoryPoints[i].x - this.trajectoryPoints[i - 1].x;
      const dy = this.trajectoryPoints[i].y - this.trajectoryPoints[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calculate straight-line distance
    const first = this.trajectoryPoints[0];
    const last = this.trajectoryPoints[this.trajectoryPoints.length - 1];
    const straightDistance = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    );
    
    // Straightness: ratio of straight distance to path length (1 = perfectly straight)
    const straightness = straightDistance / pathLength;
    
    // Smoothness: based on velocity consistency
    const velocities = this.trajectoryPoints.filter(p => p.velocity).map(p => p.velocity);
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityVariance = velocities.reduce((sum, v) => 
      sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    const smoothness = 1 / (1 + Math.sqrt(velocityVariance) / avgVelocity);
    
    return {
      pathLength: parseFloat(pathLength.toFixed(2)),
      straightDistance: parseFloat(straightDistance.toFixed(2)),
      straightness: parseFloat(straightness.toFixed(3)),
      smoothness: parseFloat(smoothness.toFixed(3)),
      pointCount: this.trajectoryPoints.length,
      averageVelocity: parseFloat(avgVelocity.toFixed(2)),
    };
  }

  // Helper: Add interaction to buffer
  addToBuffer(data) {
    this.interactionBuffer.push(data);
    
    // Auto-flush if buffer is full
    if (this.interactionBuffer.length >= this.BATCH_SIZE) {
      this.flushBatch();
    } else {
      // Reset batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.BATCH_TIMEOUT);
    }
  }

  // Helper: Flush batch to backend (clears buffer for next batch)
  async flushBatch() {
    if (this.interactionBuffer.length === 0) return;
    
    const batch = [...this.interactionBuffer];
    this.interactionBuffer = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
  }

  // Helper: Log interaction
  logInteraction(eventType, data) {
    const interaction = {
      sessionId: this.sessionId,
      module: 'motorSkills',
      round: this.round,
      eventType,
      timestamp: new Date(),
      ...data,
    };
    
    this.interactions.push(interaction);
    
    // Add to batch buffer (uses bucket pattern)
    this.addToBuffer(interaction);
  }
  
  // Complete motor skills session (flush remaining interactions + compute session summary)
  async complete() {
    // Flush remaining raw interactions
    try {
      await this.flushBatch();
    } catch (error) {
      // Continue even if flush fails
    }
    
    // Compute session summary on backend (aggregates all rounds)
    try {
      await computeSessionSummary(this.sessionId, this.participantId);
    } catch (error) {
      // Continue even if summary computation fails
    }
  }

  // Get all interactions
  getAllInteractions() {
    return this.interactions;
  }
}

export default MotorSkillsTracker;