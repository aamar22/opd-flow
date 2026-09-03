import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import AppShell from "./components/layout/AppShell";
import {
  clinicSettingsApi,
  dashboardApi,
  medicineApi,
  visitApi,
} from "./services/api";
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const PatientRegistrationPage = lazy(
  () => import("./pages/reception/PatientRegistrationPage"),
);
const VisitManagementPage = lazy(
  () => import("./pages/reception/VisitManagementPage"),
);
const ConsultationQueuePage = lazy(
  () => import("./pages/doctor/ConsultationQueuePage"),
);
const InventoryPage = lazy(() => import("./pages/pharmacy/InventoryPage"));
const DispensePage = lazy(() => import("./pages/pharmacy/DispensePage"));
const PharmacyBillingPage = lazy(
  () => import("./pages/pharmacy/PharmacyBillingPage"),
);
const AppointmentPage = lazy(() => import("./pages/reception/AppointmentPage"));
const ClinicMastersPage = lazy(() => import("./pages/admin/ClinicMastersPage"));
const ServiceMastersPage = lazy(
  () => import("./pages/admin/ServiceMastersPage"),
);
const BillingPage = lazy(() => import("./pages/reception/BillingPage"));
const WardBedMastersPage = lazy(
  () => import("./pages/admin/WardBedMastersPage"),
);
const BedBillingRulesPage = lazy(
  () => import("./pages/admin/BedBillingRulesPage"),
);
const IPDAdmissionsPage = lazy(
  () => import("./pages/reception/IPDAdmissionsPage"),
);
const IPDBillingPage = lazy(() => import("./pages/reception/IPDBillingPage"));

const PAGE_COMPONENTS = {
  Dashboard: DashboardPage,
  "Patient Registration": PatientRegistrationPage,
  Appointments: AppointmentPage,
  "OPD Visits": VisitManagementPage,
  "Consultation Queue": ConsultationQueuePage,
  "Pharmacy Inventory": InventoryPage,
  "Dispense Medicines": DispensePage,
  "Pharmacy Billing": PharmacyBillingPage,
  "Clinic Masters": ClinicMastersPage,
  "Service Masters": ServiceMastersPage,
  "Patient Billing": BillingPage,
  "Ward & Bed Masters": WardBedMastersPage,
  "Bed Tariff/Billing Rules": BedBillingRulesPage,
  "IPD Admissions": IPDAdmissionsPage,
  "IPD Billing": IPDBillingPage,
};

export default function App() {
  const [role, setRole] = useState("Reception");
  const [tab, setTab] = useState("Dashboard");
  const [visits, setVisits] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [notice, setNotice] = useState("");
  const [navigationContext, setNavigationContext] = useState(null);
  const [clinicSettings, setClinicSettings] = useState({
    clinicName: "ClinicFlow",
    logoUrl: "",
    address: "",
    phone: "",
    email: "",
    doctors: [],
  });
  const loadData = useCallback(async () => {
    try {
      const [
        visitResponse,
        medicineResponse,
        dashboardResponse,
        settingsResponse,
      ] = await Promise.all([
        visitApi.getPage({ page: 1, limit: 5 }),
        medicineApi.getAll(),
        dashboardApi.get(),
        clinicSettingsApi.get(),
      ]);
      setVisits(visitResponse.data.items);
      setMedicines(medicineResponse.data);
      setDashboard(dashboardResponse.data);
      setClinicSettings(settingsResponse.data);
    } catch {
      setNotice("Unable to reach the API. Start the server with npm run dev.");
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
    );
    socket.on("dashboard:update", setDashboard);
    return () => socket.disconnect();
  }, []);
  const handleComplete = (message) => {
    setNotice(message);
    loadData();
    window.setTimeout(() => setNotice(""), 3000);
  };
  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setTab("Dashboard");
    setNavigationContext(null);
  };
  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setNavigationContext(null);
  };
  const handleNavigate = (nextTab, context = null) => {
    setNavigationContext(context);
    setTab(nextTab);
  };
  const Page = PAGE_COMPONENTS[tab];
  return (
    <AppShell
      role={role}
      tab={tab}
      notice={notice}
      onRoleChange={handleRoleChange}
      onTabChange={handleTabChange}
    >
      <Suspense fallback={<div className="panel">Loading page…</div>}>
        <Page
          dashboard={dashboard}
          visits={visits}
          medicines={medicines}
          role={role}
          clinicSettings={clinicSettings}
          onSettingsChange={setClinicSettings}
          onComplete={handleComplete}
          navigationContext={navigationContext}
          onNavigate={handleNavigate}
        />
      </Suspense>
    </AppShell>
  );
}
