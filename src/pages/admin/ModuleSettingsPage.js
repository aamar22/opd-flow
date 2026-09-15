import { useState } from "react";
import { MODULES, DEFAULT_MODULES } from "../../constants/modules.mjs";
import { clinicSettingsApi } from "../../services/api";
import "../../styles/modules.css";

export default function ModuleSettingsPage({
  clinicSettings,
  onSettingsChange,
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const modules = { ...DEFAULT_MODULES, ...clinicSettings.modules };
  const toggle = async (key) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await clinicSettingsApi.updateModules({
        ...modules,
        [key]: !modules[key],
      });
      onSettingsChange(data);
      setMessage("Module settings saved.");
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "The API server needs restarting to enable module settings. Restart npm run dev."
          : err.response?.data?.message ||
              "Unable to save module settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="panel moduleSettings">
      <h2>Module visibility</h2>
      <p>
        Choose which modules appear in the clinic workspaces. Changes save
        immediately.
      </p>
      {error && <p role="alert">{error}</p>}
      <p role="status">{saving ? "Saving settings..." : message}</p>
      {MODULES.map(({ key, name, pages }) => (
        <div className="moduleRow" key={key}>
          <div>
            <h3>{name} module</h3>
            <p>{pages.join(", ")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={modules[key]}
            aria-label={name + " module"}
            disabled={saving}
            className={"moduleToggle " + (modules[key] ? "enabled" : "")}
            onClick={() => toggle(key)}
          >
            <span className="moduleToggleDot" />
            {modules[key] ? "On" : "Off"}
          </button>
        </div>
      ))}
    </section>
  );
}
