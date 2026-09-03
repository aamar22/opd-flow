import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || " http://localhost:5000/api",
});

const list = (path, params) => api.get(path, { params });

export const patientApi = {
  getPage: (params) => list("/patients", params),
  create: (payload) => api.post("/patients", payload),
};
export const visitApi = {
  getPage: (params) => list("/visits", params),
  create: (payload) => api.post("/visits", payload),
  update: (id, payload) => api.patch(`/visits/${id}`, payload),
};
export const medicineApi = {
  getAll: () => api.get("/medicines"),
  create: (payload) => api.post("/medicines", payload),
  update: (id, payload) => api.patch(`/medicines/${id}`, payload),
  dispense: (items) => api.post("/medicines/dispense", { items }),
};
export const dashboardApi = {
  get: () => api.get("/dashboard"),
  revenue: (period) => api.get("/dashboard/revenue", { params: { period } }),
};
export const appointmentApi = {
  getPage: (params) => list("/appointments", params),
  create: (payload) => api.post("/appointments", payload),
  update: (id, payload) => api.patch(`/appointments/${id}`, payload),
};
export const clinicSettingsApi = {
  get: () => api.get("/clinic-settings"),
  update: (payload) => api.put("/clinic-settings", payload),
  getAvailability: (params) => list("/clinic-settings/availability", params),
};
export const serviceApi = {
  getAll: (params) => list("/services", params),
  create: (payload) => api.post("/services", payload),
  update: (id, payload) => api.patch(`/services/${id}`, payload),
};
export const invoiceApi = {
  getPage: (params) => list("/invoices", params),
  create: (payload) => api.post("/invoices", payload),
};
export const ipdApi = {
  getBillingRules: () => api.get("/ipd/billing-rules"),
  updateBillingRules: (payload) => api.put("/ipd/billing-rules", payload),
  getWards: () => api.get("/ipd/wards"),
  createWard: (payload) => api.post("/ipd/wards", payload),
  updateWard: (id, payload) => api.patch(`/ipd/wards/${id}`, payload),
  deleteWard: (id) => api.delete(`/ipd/wards/${id}`),
  addBed: (wardId, payload) => api.post(`/ipd/wards/${wardId}/beds`, payload),
  updateBed: (wardId, bedId, payload) =>
    api.patch(`/ipd/wards/${wardId}/beds/${bedId}`, payload),
  updateBedStatus: (wardId, bedId, status) =>
    api.patch(`/ipd/wards/${wardId}/beds/${bedId}/status`, { status }),
  deleteBed: (wardId, bedId) =>
    api.delete(`/ipd/wards/${wardId}/beds/${bedId}`),
  getAdmissions: (params) => list("/ipd/admissions", params),
  admit: (payload) => api.post("/ipd/admissions", payload),
  discharge: (id) => api.patch(`/ipd/admissions/${id}/discharge`),
  transfer: (id, payload) =>
    api.patch(`/ipd/admissions/${id}/transfer`, payload),
  addDoctorCharge: (id, payload) =>
    api.post(`/ipd/admissions/${id}/doctor-charges`, payload),
  addAdvance: (id, payload) =>
    api.post(`/ipd/admissions/${id}/advances`, payload),
  getBillPreview: (id) => api.get(`/ipd/admissions/${id}/bill-preview`),
  createBill: (id, payload) => api.post(`/ipd/admissions/${id}/bill`, payload),
};
