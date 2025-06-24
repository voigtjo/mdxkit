import axios from 'axios';

const API = '/api/patients';

export const getPatients = async () => {
  const res = await axios.get(API);
  console.log('API-Antwort:', res.data); // <– prüfen, was zurückkommt
  return Array.isArray(res.data) ? res.data : []; // wichtig!
};
