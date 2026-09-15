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

## Connect MongoDB Atlas to the existing Render service

1. Create a Free Atlas cluster and a database user with readWrite access to clinavio.
2. In Render, open the service Connect menu and copy all Outbound IP ranges.
   Add those ranges to the Atlas project Network Access IP access list.
3. In Atlas choose Connect > Drivers > Node.js and copy the connection string.
   Set its database path to /clinavio before the query string. Replace credential
   placeholders and URL-encode special characters in the username and password.
4. In Render Environment, set MONGODB_URI to that private connection string,
   DEMO_MODE to false, and VITE_DEMO_MODE to false. Save, rebuild, and deploy.
   Do not place MONGODB_URI in any VITE_ variable or GitHub file.
5. Confirm the runtime log says MongoDB connected. Create a fictional patient,
   restart the service, and confirm the patient remains and appears in Atlas.

The repository Blueprint defaults to a temporary demo for new deployments. Keep
these Atlas overrides in the existing service when reviewing future Blueprint syncs.
Existing in-memory demo records are not migrated. Production startup now stops if
Atlas is unavailable; API requests receive 503 if the connection drops later.
Atlas persistence does not add login protection: continue using fictional patients
until server-side authentication and authorization are implemented.
