import { useEffect, useState } from "react";
import { ipdApi } from "../../services/api";

const defaults = {
  calculationMethod: "Prorated",
  graceMinutes: 15,
  minimumHours: 1,
};
const methods = [
  [
    "Prorated",
    "Prorated by time",
    "Charge each recorded bed stay by its exact hours using daily tariff ÷ 24.",
  ],
  [
    "HighestPerDay",
    "Highest category per day",
    "For each calendar day, charge one full day at the highest bed tariff used.",
  ],
  [
    "MinimumGrace",
    "Minimum hours + grace",
    "Ignore the configured grace period, then round up and enforce minimum billable hours per stay.",
  ],
];

export default function BedBillingRulesPage({ onComplete }) {
  const [rules, setRules] = useState(defaults);
  useEffect(() => {
    ipdApi.getBillingRules().then(({ data }) => setRules(data));
  }, []);
  const save = async (event) => {
    event.preventDefault();
    setRules((await ipdApi.updateBillingRules(rules)).data);
    onComplete("IPD bed billing rules updated.");
  };
  return (
    <section className="mastersWorkspace">
      <form className="masterCard billingRulesCard" onSubmit={save}>
        <h3>Bed Tariff/Billing Rules</h3>
        <span className="masterHint">
          Transfers are always recorded separately. This rule controls how those
          stays are converted into billable charges.
        </span>
        <div className="billingRuleChoices">
          {methods.map(([value, title, description]) => (
            <label
              className={rules.calculationMethod === value ? "selected" : ""}
              key={value}
            >
              <input
                type="radio"
                name="calculationMethod"
                value={value}
                checked={rules.calculationMethod === value}
                onChange={(event) =>
                  setRules({ ...rules, calculationMethod: event.target.value })
                }
              />
              <span>
                <b>{title}</b>
                <small>{description}</small>
              </span>
            </label>
          ))}
        </div>
        {rules.calculationMethod === "MinimumGrace" && (
          <div className="grid2 billingRuleInputs">
            <label>
              Grace period (minutes)
              <input
                type="number"
                min="0"
                required
                value={rules.graceMinutes}
                onChange={(event) =>
                  setRules({ ...rules, graceMinutes: event.target.value })
                }
              />
            </label>
            <label>
              Minimum billable hours per stay
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={rules.minimumHours}
                onChange={(event) =>
                  setRules({ ...rules, minimumHours: event.target.value })
                }
              />
            </label>
          </div>
        )}
        <div className="billingRuleExample">
          {rules.calculationMethod === "Prorated"
            ? "Example: 6 hours in ICU charges 6 × ICU hourly rate."
            : rules.calculationMethod === "HighestPerDay"
              ? "Example: General → ICU on the same day charges one ICU daily tariff."
              : `Example: first ${rules.graceMinutes || 0} minutes are free; after that at least ${rules.minimumHours || 0} hour(s) are charged per stay.`}
        </div>
        <button className="primary">Save billing rules</button>
      </form>
    </section>
  );
}
