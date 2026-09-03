import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "https://w9wngclh-5000.inc1.devtunnels.ms/api";

export const options = {
  scenarios: {
    appointment_booking: {
      executor: "shared-iterations",
      vus: Number(__ENV.VUS || 50),
      iterations: Number(__ENV.APPOINTMENT_COUNT || 1000
        
      ),
      maxDuration: "10m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const jsonHeaders = { headers: { "Content-Type": "application/json" } };

export default function () {
  const suffix = `${__VU}-${__ITER}-${Date.now()}`;
  const patientResponse = http.post(
    `${baseUrl}/patients`,
    JSON.stringify({
      name: `Load Test Patient ${suffix}`,
      age: 30,
      gender: "Other",
      phone: `9${String(__VU * 100000 + __ITER).padStart(9, "0")}`,
      address: "Load test",
    }),
    jsonHeaders,
  );

  check(patientResponse, {
    "patient created": (response) => response.status === 201,
  });
  if (patientResponse.status !== 201) return;

  const patient = patientResponse.json();
  const appointmentResponse = http.post(
    `${baseUrl}/appointments`,
    JSON.stringify({
      patientId: patient._id,
      patientName: patient.name,
      doctor: "Dr. Ananya Sharma",
      department: "General Medicine",
      appointmentDate: "2026-08-29",
      appointmentTime: "09:00",
      reason: "k6 appointment booking test",
    }),
    jsonHeaders,
  );

  check(appointmentResponse, {
    "appointment created": (response) => response.status === 201,
  });
  sleep(0.1);
}
