import axios from 'axios';

const API = '/api/user';

export const getFormForPatient = async (formName, patientId) => {
  const res = await axios.get(`${API}/form/${formName}/${patientId}`);
  return res.data;
};

export const submitForm = async (id, data, signature) => {
  const res = await axios.post(`${API}/submit/${id}`, { data, signature });
  return res.data;
};

export const getPatient = async (id) => {
  const res = await axios.get(`/api/patients/${id}`);
  return res.data;
};

export const saveFormData = async (id, data) => {
  const res = await axios.put(`${API}/save/${id}`, { data });
  return res.data;
};
