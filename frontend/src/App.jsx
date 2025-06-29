import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Home from './components/Home';
import AdminForms from './components/AdminForms';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminForms />} />
        <Route path="/manage" element={<ManageForms />} />
        <Route path="/formular/:formName/:patientId" element={<UserForm />} />
        {/* Optional: 404-Fallback */}
        <Route path="*" element={<p className="p-4 text-red-600">❌ Seite nicht gefunden</p>} />
      </Routes>
    </Router>
  );
};

export default App;
