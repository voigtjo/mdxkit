import axios from 'axios';

const API = '/api/user';

export const getFormForPatient = async (formName, patientId) => {
  try {
    const res = await axios.get(`${API}/form/${formName}/${patientId}`);
    return res.data;
  } catch (err) {
    console.error("❌ [getFormForPatient] Fehler:", err);
    throw err;
  }
};

export const saveFormData = async (id, data, signature) => {
  try {
    console.log("[saveFormData] id=", id, "data=", data, "signaturePreview=", signature?.substring(0, 50));
    const res = await axios.put(`${API}/save/${id}`, { data, signature });
    return res.data;
  } catch (err) {
    console.error("❌ [saveFormData] Fehler beim Speichern:", err);
    throw err;
  }
};

export const submitForm = async (id, data, signature) => {
  try {
    console.log("[submitForm] id=", id, "data=", data, "signaturePreview=", signature?.substring(0, 50));
    const res = await axios.post(`${API}/submit/${id}`, { data, signature });
    return res.data;
  } catch (err) {
    console.error("❌ [submitForm] Fehler beim Abschicken:", err);
    throw err;
  }
};

// ✅ Formulardaten für Test laden
export const getFormForTest = async (formName) => {
  try {
    const res = await axios.get(`${API}/form-test/${formName}`);
    return res.data;
  } catch (err) {
    console.error("❌ [getFormForTest] Fehler:", err);
    throw err;
  }
};

// ✅ Formular im Testmodus speichern
export const saveFormDataTest = async (id, data, signature) => {
  try {
    console.log("[saveFormDataTest] id=", id, "data=", data, "signaturePreview=", signature?.substring(0, 50));
    const res = await axios.put(`${API}/save-test/${id}`, { data, signature });
    return res.data;
  } catch (err) {
    console.error("❌ [saveFormDataTest] Fehler beim Speichern (TEST):", err);
    throw err;
  }
};

// ✅ Formular im Testmodus absenden
export const submitFormTest = async (id, data, signature) => {
  try {
    console.log("[submitFormTest] id=", id, "data=", data, "signaturePreview=", signature?.substring(0, 50));
    const res = await axios.post(`${API}/submit-test/${id}`, { data, signature });
    return res.data;
  } catch (err) {
    console.error("❌ [submitFormTest] Fehler beim Abschicken (TEST):", err);
    throw err;
  }
};


export const getPatient = async (id) => {
  try {
    const res = await axios.get(`/api/patients/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ [getPatient] Fehler:", err);
    throw err;
  }
};
