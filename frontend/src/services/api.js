import axios from "axios";

export const BASE_URL = "http://localhost:8000";

export const getBusiness = async (id) => {
  // Map to institution analytics for v2
  const response = await axios.get(`/api/analytics`);
  return response.data;
};

export const getDashboard = async () => {
  const token = localStorage.getItem("token");
  const response = await axios.get(`/api/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getBusinessReviewsPage = async ({
  offset = 0,
  limit = 20,
  includeKeywords = true,
} = {}) => {
  const token = localStorage.getItem("token");
  const response = await axios.get(`/api/confessions`, {
    params: {
      offset,
      limit,
      include_keywords: includeKeywords,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getAnalytics = async () => {
  const token = localStorage.getItem("token");
  const response = await axios.get(`/api/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const importConfessions = async (items) => {
  const token = localStorage.getItem("token");
  const response = await axios.post(`/api/confessions/import`, items, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateBusinessProfile = async (payload) => {
  const token = localStorage.getItem("token");
  const response = await axios.patch("/api/businesses/profile", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const updateReview = async (reviewId, payload) => {
  const token = localStorage.getItem("token");
  const response = await axios.patch(`/api/reviews/${reviewId}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const deleteReview = async (reviewId) => {
  const token = localStorage.getItem("token");
  await axios.delete(`/api/reviews/${reviewId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getSentimentTimeline = async (groupBy = "month") => {
  const token = localStorage.getItem("token");
  const response = await axios.get(`/api/analytics/timeline`, {
    params: { group_by: groupBy },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};