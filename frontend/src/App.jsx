import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Home from './components/Home';
import AdminForms from './components/AdminForms';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';
import FormatForm from './components/FormatForm';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminForms />} />
        <Route path="/manage" element={<ManageForms />} />
        <Route path="/formular/:formName/:patientId" element={<UserForm />} />
        <Route path="/formular-test/:formName" element={<UserForm />} />
        <Route path="/admin/format" element={<FormatForm />} />
        <Route path="/admin/print" element={<FormatForm />} />
        <Route path="*" element={<p className="p-4 text-red-600">❌ Seite nicht gefunden</p>} />
      </Routes>
    </Router>
  );
};

export default App;
