import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import StatusPanel from './StatusPanel';
import './App.css';
import EventPanel from './EventPanel';

function Hello() {
  return (
    <div>
      <StatusPanel />
      <EventPanel />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
