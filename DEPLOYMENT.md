# Free Clinavio demo deployment

[Deploy to Render](https://render.com/deploy?repo=https://github.com/aamar22/opd-flow)

1. Sign in to Render and open the deployment link.
2. Connect the GitHub repository when prompted and review the free clinavio-demo service.
3. Deploy the Blueprint. Open the onrender.com URL after the deployment succeeds.

The Node service serves both the built React frontend and API, including Socket.IO.
No localhost API or socket settings are needed on Render. Leave VITE_API_URL and
VITE_SOCKET_URL unset for this deployment.

This configuration is a public demo with fictional data only. DEMO_MODE deliberately
uses temporary in-memory storage; records reset on restart or idle shutdown. The UI
shows this limitation. Free Render services sleep after 15 minutes without traffic.

Before using real records, implement server-side authentication and role authorization.
For persistent storage, configure MongoDB Atlas through Render's secret environment
settings, set MONGODB_URI, disable DEMO_MODE, and verify database connectivity and
backup requirements. Never commit database credentials.

Local checks: npm test and npm run build. Local development: npm run dev.
