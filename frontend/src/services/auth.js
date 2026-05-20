import axios from "axios";

export const login = async (username, password) => {
  const response = await axios.post("/api/auth/login", {
    username,
    password,
  });

  return response.data;
};

export const register = async (data) => {
  const token = localStorage.getItem("token");
  const response = await axios.post("/api/auth/admin/register", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const registerOwner = async (payload) => {
  // owner registration is deprecated in v2
  throw new Error("Owner registration is deprecated in v2");
};
