import { ROLE_TABS, USERS } from "../../constants/clinic";
import { isPageEnabled } from "../../constants/modules.mjs";
import clinavioLogo from "../../assets/clinavio-logo.jpeg";
import "../../styles/brand.css";
import "../../styles/header-actions.css";
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
  modules,
}) {
  return (
    <div className="app">
      <aside>
        <div className="brand clinavioBrand">
          <img className="clinavioLogo" src={clinavioLogo} alt="Clinavio" />
        </div>
        <div className="roleLabel">WORKSPACE</div>
        {ROLE_TABS[role]
          .filter((item) => isPageEnabled(item, modules))
          .map((item) => (
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
          <div className="headerUserArea">
            <div className="user">
              <div className="avatar">{role[0]}</div>
              <div>
                <b>{USERS[role]}</b>
                <small>{role}</small>
              </div>
            </div>
            <div className="headerActions">
              <details className="headerAction">
                <summary aria-label="Settings" title="Settings">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9.5 3-.5 2-2 1-2-.5-2 3 1.5 1.5v3L3 14.5l2 3 2-.5 2 1 .5 3h5l.5-3 2-1 2 .5 2-3-1.5-1.5v-3L21 8.5l-2-3-2 .5-2-1-.5-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </summary>
                <div className="headerPopover">
                  <strong>Settings</strong>
                  {role === "Super Admin" || role === "Admin" ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        onTabChange(
                          role === "Super Admin"
                            ? "Module Settings"
                            : "Clinic Masters",
                        );
                        event.currentTarget.closest("details").open = false;
                      }}
                    >
                      {role === "Super Admin"
                        ? "Module settings"
                        : "Clinic settings"}
                    </button>
                  ) : (
                    <p>Clinic settings are managed by your administrator.</p>
                  )}
                </div>
              </details>
              <details className="headerAction">
                <summary aria-label="Notifications" title="Notifications">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                  </svg>
                  {notice && <span className="notificationDot" />}
                </summary>
                <div className="headerPopover">
                  <strong>Notifications</strong>
                  <p>{notice || "No new notifications."}</p>
                </div>
              </details>
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
