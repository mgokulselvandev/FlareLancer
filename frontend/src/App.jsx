import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";
import ClientPage from "./components/ClientPage";
import JobDetailPage from "./components/JobDetailPage";
import FreelancerPage from "./components/FreelancerPage";
import FreelancerJobDetailPage from "./components/FreelancerJobDetailPage";

function App() {
  return (
    <Router>
      <div data-theme="professional-green" className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/client" element={<ClientPage />} />
          <Route path="/client/job/:jobId" element={<JobDetailPage />} />
          <Route path="/freelancer" element={<FreelancerPage />} />
          <Route path="/freelancer/job/:jobId" element={<FreelancerJobDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
