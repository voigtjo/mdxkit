// frontend/src/api/userApi.js
import api from './axios';

const usersAPI = '/users';

// Alle User (vormals Patienten) laden – kompatibles Format [{ _id, name, email, status }]
export const getUsers = async () => {
  const res = await api.get(`${usersAPI}`);
  return Array.isArray(res.data) ? res.data : [];
};

// Einzelnen User per ID laden (detaillierter)
export const getUserById = async (id) => {
  const res = await api.get(`${usersAPI}/${encodeURIComponent(id)}`);
  return res.data; // { _id, name, displayName, email, status, ... }
};

// Neuen User anlegen
export const createUser = async ({ displayName, email = '', status = 'active' }) => {
  const res = await api.post(`${usersAPI}`, { displayName, email, status });
  return res.data; // {_id, name, email, status}
};

// User aktualisieren
export const updateUser = async (id, patch) => {
  const res = await api.put(`${usersAPI}/${encodeURIComponent(id)}`, patch);
  return res.data;
};

// User löschen (Soft Delete)
export const deleteUser = async (id) => {
  const res = await api.delete(`${usersAPI}/${encodeURIComponent(id)}`);
  return res.data; // {success:true}
};
