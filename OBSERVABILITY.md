# Observability and load testing

Start the API first:

```powershell
npm run server
```

Prometheus metrics are exposed at `http://localhost:5000/metrics`.

Start Prometheus and Grafana with Docker Desktop running:

```powershell
npm run observability:up
```

Open Prometheus at `http://localhost:9090` and Grafana at `http://localhost:3000`.
Grafana is provisioned with the `OPD Flow API` dashboard. Log in with `admin` / `admin`, or set `GRAFANA_ADMIN_PASSWORD` before starting the stack.

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) and run the appointment booking load test:

```powershell
npm run load:test
```

The default scenario creates 1,000 patients and 1,000 appointments using 20 virtual users. Change the number of appointments or concurrent users when needed:

```powershell
k6 run -e APPOINTMENT_COUNT=1000 -e VUS=20 load-tests/appointments.js
```

Use another API target when required:

```powershell
k6 run -e BASE_URL=http://localhost:5000/api load-tests/appointments.js
```

The k6 test creates patients and appointments; use a development database only.
