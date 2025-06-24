import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import AdminFormManager from './components/AdminFormManager';
import ManageForms from './components/ManageForms';
import UserFormView from './components/UserFormView';

const Home = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-2">Formular-System</h1>
    <p className="mb-4">Willkommen! Bitte wähle einen Modus:</p>
    <div className="space-x-4">
      <Link to="/admin" className="text-blue-600 underline">Admin</Link>
      <Link to="/manage" className="text-blue-600 underline">Manage</Link>
      <Link to="/formular-eingabe/physiotherapie-aufklaerung/1" className="text-blue-600 underline">User</Link>
    </div>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminFormManager />} />
        <Route path="/manage" element={<ManageForms />} />
        <Route path="/formular-eingabe/:formName/:patientId" element={<UserFormView />} />
        {/* Optional: 404-Fallback */}
        <Route path="*" element={<p className="p-4 text-red-600">❌ Seite nicht gefunden</p>} />
      </Routes>
    </Router>
  );
};

export default App;
