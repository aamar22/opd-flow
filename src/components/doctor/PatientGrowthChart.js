import { useState } from "react";
import { growthPoints, isGrowthEligible } from "../../utils/growth.mjs";

const indicators = {
  weight: "Weight-for-age",
  height: "Height/length-for-age",
  weightHeight: "Weight-for-height",
  bmi: "BMI-for-age",
  head: "Head circumference-for-age",
};
function Graph({
  title,
  points,
  xLabel,
  yLabel,
  empty,
  xRange,
  yRange,
  color = "#2563eb",
  tint = "#eff6ff",
}) {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const xs = sorted.map((point) => point.x);
  const ys = sorted.map((point) => point.y);
  const minX = xRange?.[0] ?? (xs.length ? Math.min(...xs) - 1 : 0);
  const maxX = xRange?.[1] ?? (xs.length ? Math.max(...xs) + 1 : 100);
  const minY =
    yRange?.[0] ??
    (ys.length
      ? Math.min(...ys) -
        Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.15)
      : 0);
  const maxY =
    yRange?.[1] ??
    (ys.length
      ? Math.max(...ys) +
        Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.15)
      : 10);
  const x = (value) => 65 + ((value - minX) / (maxX - minX)) * 600;
  const y = (value) => 285 - ((value - minY) / (maxY - minY)) * 235;
  return (
    <article
      className="growthGraphCard"
      style={{ "--graph-color": color, "--graph-tint": tint }}
    >
      <h4>{title}</h4>
      <div className="growthGraphScroll">
        <svg
          className="growthPlot"
          viewBox="0 0 740 365"
          role="img"
          aria-label={`${title}: ${yLabel} against ${xLabel}`}
        >
          <text x="16" y="22">
            {yLabel}
          </text>
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <g key={step}>
              <line
                x1="65"
                x2="665"
                y1={285 - step * 235}
                y2={285 - step * 235}
                stroke="#e7edf1"
              />
              <text x="55" y={289 - step * 235} textAnchor="end">
                {(minY + step * (maxY - minY)).toFixed(1)}
              </text>
              <text x={65 + step * 600} y="310" textAnchor="middle">
                {(minX + step * (maxX - minX)).toFixed(1)}
              </text>
            </g>
          ))}
          <path d="M65 40V285H665" fill="none" stroke="#8c9dab" />
          <text x="365" y="345" textAnchor="middle">
            {xLabel}
          </text>
          {sorted.length > 1 && (
            <polygon
              points={`${x(sorted[0].x)},285 ${sorted.map((point) => `${x(point.x)},${y(point.y)}`).join(" ")} ${x(sorted[sorted.length - 1].x)},285`}
              fill={color}
              opacity="0.09"
            />
          )}
          <polyline
            points={sorted
              .map((point) => `${x(point.x)},${y(point.y)}`)
              .join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
          {sorted.map((point, index) => (
            <circle
              key={index}
              cx={x(point.x)}
              cy={y(point.y)}
              r="5"
              fill={color}
              stroke="#fff"
              strokeWidth="2"
            >
              <title>
                {point.date.toLocaleString()}: {point.y.toFixed(2)} {yLabel}
                {point.source ? ` (${point.source})` : ""}
              </title>
            </circle>
          ))}
          {!sorted.length && (
            <text x="365" y="160" textAnchor="middle">
              No eligible measurements yet
            </text>
          )}
        </svg>
      </div>
      <p className="growthGraphHint">
        {sorted.length
          ? `${sorted.length} measurement(s). Hover over a point for details.`
          : empty}
      </p>
      {sorted.length > 0 && (
        <details className="growthMeasurements">
          <summary>View measurements</summary>
          <div className="growthTableWrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{xLabel}</th>
                  <th>{yLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((point, index) => (
                  <tr key={index}>
                    <td>{point.date.toLocaleDateString()}</td>
                    <td>{point.x.toFixed(1)}</td>
                    <td>
                      {point.y.toFixed(2)}
                      {point.source && <small>{point.source}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  );
}
export default function PatientGrowthChart({
  visit,
  readings,
  history,
  patient,
  onRecord,
}) {
  const [metric, setMetric] = useState("weight");
  if (!isGrowthEligible(patient)) return null;
  const rows = growthPoints(visit, readings, history, patient);
  const points = (field, eligible = () => true, xField = "age") =>
    rows
      .filter(
        (row) =>
          row[field] !== null &&
          row[field] > 0 &&
          row[xField] !== null &&
          eligible(row),
      )
      .map((row) => ({ x: row[xField], y: row[field], date: row.date }));
  const zPoints = rows
    .filter(
      (row) =>
        row.z !== null &&
        row.source &&
        row.metric === metric &&
        (metric !== "bmi" || row.age >= 24) &&
        (!["head", "weightHeight"].includes(metric) || row.age <= 60),
    )
    .map((row) => ({
      x: row.age,
      y: row.z,
      date: row.date,
      source: row.source,
    }));
  return (
    <section className="opdSection patientGrowthChart">
      <h3>Pediatric Growth Charts</h3>
      <p>
        For patients aged 6 years and younger. Graphs use recorded age in months
        and measurements from loaded visits. BMI uses weight and height from the
        same reading.
      </p>
      <button className="primary" type="button" onClick={onRecord}>
        Record growth measurements in Vitals
      </button>
      <div className="pediatricGrowthGrid">
        <Graph
          color="#2563eb"
          tint="#eff6ff"
          title="1. Weight-for-age"
          points={points("weight")}
          xLabel="Age (months)"
          yLabel="Weight (kg)"
          xRange={[0, 84]}
          empty="Record age in months and weight in kg."
        />
        <Graph
          color="#7c3aed"
          tint="#f5f3ff"
          title="2. Height/length-for-age"
          points={points("height")}
          xLabel="Age (months)"
          yLabel="Height / length (cm)"
          xRange={[0, 84]}
          empty="Record age in months and height or length in cm."
        />
        <Graph
          color="#0f766e"
          tint="#f0fdfa"
          title="3. Weight-for-height (birth–5 years)"
          points={points(
            "weight",
            (row) => row.age <= 60 && row.height > 0,
            "height",
          )}
          xLabel="Height / length (cm)"
          yLabel="Weight (kg)"
          empty="Requires weight and height/length in the same reading, from birth through 60 months."
        />
        <Graph
          color="#c2410c"
          tint="#fff7ed"
          title="4. BMI-for-age (2–19 years)"
          points={points("bmi", (row) => row.age >= 24)}
          xLabel="Age (months)"
          yLabel="BMI (kg/m²)"
          xRange={[24, 84]}
          empty="Requires weight and height in the same reading at age 24 months or older. This workspace displays patients through age 6 only."
        />
        <Graph
          color="#be185d"
          tint="#fdf2f8"
          title="5. Head circumference-for-age (birth–5 years)"
          points={points("head", (row) => row.age <= 60)}
          xLabel="Age (months)"
          yLabel="Head circumference (cm)"
          xRange={[0, 60]}
          empty="Record head circumference and age from birth through 60 months."
        />
        <div>
          <label className="growthIndicatorSelect">
            Z-score indicator
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {Object.entries(indicators).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Graph
            color="#4338ca"
            tint="#eef2ff"
            title="6. Z-score over time"
            points={zPoints}
            xLabel="Age (months)"
            yLabel={`${indicators[metric]} Z-score`}
            xRange={[0, 84]}
            empty="Enter a verified Z-score, its indicator, and reference/source with the vital reading. Z-scores are not calculated automatically."
          />
        </div>
      </div>
      <p>
        Measurement graphs do not include reference percentile curves. The
        Z-score graph uses clinician-entered values; keep the same reference
        standard when comparing readings.
      </p>
    </section>
  );
}
