import { ROLE_TABS, USERS } from "../../constants/clinic";
const iconFor = (tab) =>
  tab === "Dashboard"
    ? "⌘"
    : tab.includes("Patient")
      ? "♙"
      : tab.includes("Visit") ||
          tab.includes("Queue") ||
          tab.includes("Appointment")
        ? "▣"
        : "▤";
export default function AppShell({
  role,
  tab,
  notice,
  onRoleChange,
  onTabChange,
  children,
}) {
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="mark">+</div>
          <div>
            CLINIC<span>FLOW</span>
            <small>OPD MANAGEMENT</small>
          </div>
        </div>
        <div className="roleLabel">WORKSPACE</div>
        {ROLE_TABS[role].map((item) => (
          <button
            className={`nav ${tab === item ? "active" : ""}`}
            onClick={() => onTabChange(item)}
            key={item}
          >
            <span className="icon">{iconFor(item)}</span>
            {item}
          </button>
        ))}
        <div className="sideBottom">
          <div className="roleLabel">SWITCH ROLE</div>
          {Object.keys(ROLE_TABS).map((item) => (
            <button
              key={item}
              className={`role ${role === item ? "selected" : ""}`}
              onClick={() => onRoleChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">{role.toUpperCase()} PORTAL</p>
            <h1>{tab}</h1>
          </div>
          <div className="user">
            <div className="avatar">{role[0]}</div>
            <div>
              <b>{USERS[role]}</b>
              <small>{role}</small>
            </div>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
