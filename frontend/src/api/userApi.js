// src/api/userApi.js
import api from './axios';

const usersAPI = '/users';

// Alle User (vormals Patienten) laden – kompatibles Format [{ _id, name, email }]
export const getUsers = async () => {
  const res = await api.get(`${usersAPI}`);
  return Array.isArray(res.data) ? res.data : [];
};

// Einzelnen User per ID laden
export const getUserById = async (id) => {
  const res = await api.get(`${usersAPI}/${encodeURIComponent(id)}`);
  return res.data; // { _id, name, email, status }
};
