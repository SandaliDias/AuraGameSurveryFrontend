import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/Home';

// Game Flow
import { GameProvider } from './context/GameContext';
import GameFlow from './components/game/GameFlow';

// Legacy individual tests (kept for backwards compatibility)
import ColorBlindnessTest from './modules/Visual/ColorBlindnessTest';
import VisualAcuityTest from './modules/Visual/VisualAcuityTest';
import MotorSkillsGame from './modules/Motor/MotorSkillsGame';
import LiteracyQuiz from './modules/Literacy/LiteracyQuiz';

function App() {
  return (
    <Router>
      <GameProvider>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Unified game flow */}
            <Route path="/play" element={<GameFlow />} />
            
            {/* Legacy routes - kept for backwards compatibility */}
            <Route path="/perception/color-blindness" element={<ColorBlindnessTest />} />
            <Route path="/perception/visual-acuity" element={<VisualAcuityTest />} />
            <Route path="/reaction/motor-skills" element={<MotorSkillsGame />} />
            <Route path="/knowledge/literacy" element={<LiteracyQuiz />} />
          </Routes>
        </div>
      </GameProvider>
    </Router>
  );
}

export default App;
