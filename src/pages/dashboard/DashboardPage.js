import { useEffect, useState } from "react";
import VisitTable from "../../components/common/VisitTable";
import { dashboardApi } from "../../services/api";

const emptyRevenue = {
  total: 0,
  opdTotal: 0,
  pharmacyTotal: 0,
  ipdTotal: 0,
  invoiceCount: 0,
  opdInvoiceCount: 0,
  pharmacyInvoiceCount: 0,
  ipdInvoiceCount: 0,
  buckets: [],
};

export default function DashboardPage({ dashboard, visits, role }) {
  const [period, setPeriod] = useState("month");
  const [chartType, setChartType] = useState("bar");
  const [revenue, setRevenue] = useState(emptyRevenue);
  useEffect(() => {
    if (role === "Admin")
      dashboardApi
        .revenue(period)
        .then(({ data }) => setRevenue(data))
        .catch(() => setRevenue(emptyRevenue));
  }, [role, period]);
  const cards =
    role === "Pharmacy"
      ? [
          ["Total medicines", dashboard.medicines || 0, "▤"],
          ["Low stock items", dashboard.lowStock || 0, "!"],
          [
            "Prescriptions",
            dashboard.prescriptions ||
              visits.filter((visit) => visit.medicines?.length).length,
            "▣",
          ],
        ]
      : [
          ["Registered patients", dashboard.patients || 0, "♙"],
          ["Today’s visits", dashboard.today || 0, "▣"],
          ["Waiting for consultation", dashboard.waiting || 0, "◷"],
        ];
  const chartMax = Math.max(
    ...revenue.buckets.flatMap((item) => [
      item.opd || 0,
      item.pharmacy || 0,
      item.ipd || 0,
    ]),
    1,
  );
  return (
    <>
      <section className="hero">
        <div>
          <p>GOOD MORNING</p>
          <h2>Everything under control.</h2>
          <span>Manage your OPD workflow with clarity and care.</span>
        </div>
        <div className="heroCross">✚</div>
      </section>
      <div className="stats">
        {cards.map(([label, value, icon]) => (
          <div className="card" key={label}>
            <div className="cardIcon">{icon}</div>
            <p>{label}</p>
            <h2>{value}</h2>
            <small>Live clinic data</small>
          </div>
        ))}
      </div>
      {role === "Admin" && (
        <section className="panel revenuePanel">
          <div className="panelHead">
            <div>
              <h2>Revenue overview</h2>
              <p>OPD, IPD and pharmacy revenue for the selected period</p>
            </div>
            <div className="revenueFilters">
              {["day", "week", "month", "year"].map((item) => (
                <button
                  key={item}
                  className={period === item ? "active" : ""}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="revenueSummary">
            <div>
              <span>Total revenue</span>
              <strong>₹{revenue.total.toLocaleString("en-IN")}</strong>
              <small>{revenue.invoiceCount} bills</small>
            </div>
            <div>
              <span>OPD revenue</span>
              <strong>
                ₹{(revenue.opdTotal || 0).toLocaleString("en-IN")}
              </strong>
              <small>{revenue.opdInvoiceCount || 0} bills</small>
            </div>
            <div>
              <span>Pharmacy revenue</span>
              <strong className="pharmacyRevenue">
                ₹{(revenue.pharmacyTotal || 0).toLocaleString("en-IN")}
              </strong>
              <small>{revenue.pharmacyInvoiceCount || 0} bills</small>
            </div>
            <div>
              <span>IPD revenue</span>
              <strong className="ipdRevenue">
                ₹{(revenue.ipdTotal || 0).toLocaleString("en-IN")}
              </strong>
              <small>{revenue.ipdInvoiceCount || 0} bills</small>
            </div>
          </div>
          <div className="revenueLegend">
            <div className="chartTypeFilters" aria-label="Revenue chart type">
              {["bar", "line", "pie"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={chartType === item ? "active" : ""}
                  onClick={() => setChartType(item)}
                >
                  {item} chart
                </button>
              ))}
            </div>
            <span>
              <i className="opdLegend" />
              OPD
            </span>
            <span>
              <i className="pharmacyLegend" />
              Pharmacy
            </span>
            <span>
              <i className="ipdLegend" />
              IPD
            </span>
          </div>
          {chartType === "bar" && (
            <div className="revenueChart">
              {revenue.buckets.map((bucket) => (
                <div
                  className="revenueBar"
                  key={bucket.label}
                  title={`${bucket.label}: OPD ₹${bucket.opd || 0}, Pharmacy ₹${bucket.pharmacy || 0}, IPD ₹${bucket.ipd || 0}`}
                >
                  <div className="revenueBarPair">
                    <i
                      className="opdBar"
                      style={{
                        height: `${Math.max(3, ((bucket.opd || 0) / chartMax) * 100)}%`,
                      }}
                    />
                    <i
                      className="pharmacyBar"
                      style={{
                        height: `${Math.max(3, ((bucket.pharmacy || 0) / chartMax) * 100)}%`,
                      }}
                    />
                    <i
                      className="ipdBar"
                      style={{
                        height: `${Math.max(3, ((bucket.ipd || 0) / chartMax) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>{bucket.label}</small>
                </div>
              ))}
            </div>
          )}
          {chartType === "line" && (
            <RevenueLineChart buckets={revenue.buckets} chartMax={chartMax} />
          )}
          {chartType === "pie" && (
            <RevenuePieChart
              opd={revenue.opdTotal || 0}
              pharmacy={revenue.pharmacyTotal || 0}
              ipd={revenue.ipdTotal || 0}
            />
          )}
        </section>
      )}
      {role === "Reception" ? (
        <section className="panel bedAvailabilityPanel">
          <div className="panelHead">
            <div>
              <h2>Bed availability</h2>
              <p>Live IPD bed occupancy</p>
            </div>
          </div>
          <div className="bedAvailabilityCounts">
            <div className="totalBedCount">
              <span>▦</span>
              <div>
                <small>Total beds</small>
                <strong>{dashboard.totalBeds || 0}</strong>
              </div>
            </div>
            <div className="availableBedCount">
              <span>✓</span>
              <div>
                <small>Available beds</small>
                <strong>{dashboard.availableBeds || 0}</strong>
              </div>
            </div>
            <div className="occupiedBedCount">
              <span>▰</span>
              <div>
                <small>Occupied beds</small>
                <strong>{dashboard.occupiedBeds || 0}</strong>
              </div>
            </div>
            <div className="maintenanceBedCount">
              <span>⚒</span>
              <div>
                <small>Under maintenance</small>
                <strong>{dashboard.maintenanceBeds || 0}</strong>
              </div>
            </div>
            <div className="occupancyPercentage">
              <div>
                <span>Bed occupancy</span>
                <strong>
                  {dashboard.totalBeds
                    ? Math.round(
                        ((dashboard.occupiedBeds || 0) / dashboard.totalBeds) *
                          100,
                      )
                    : 0}
                  %
                </strong>
              </div>
              <div
                className="occupancyTrack"
                aria-label="Bed occupancy percentage"
              >
                <i
                  style={{
                    width: `${dashboard.totalBeds ? Math.min(100, ((dashboard.occupiedBeds || 0) / dashboard.totalBeds) * 100) : 0}%`,
                  }}
                />
              </div>
              <small>
                {dashboard.occupiedBeds || 0} of {dashboard.totalBeds || 0} beds
                are occupied
              </small>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panelHead">
            <div>
              <h2>Recent patient visits</h2>
              <p>Today’s OPD activity</p>
            </div>
          </div>
          <VisitTable visits={visits.slice(0, 5)} />
        </section>
      )}
    </>
  );
}

function RevenueLineChart({ buckets, chartMax }) {
  const width = 900;
  const height = 180;
  const points = (key) =>
    buckets
      .map((bucket, index) => {
        const x =
          buckets.length > 1
            ? (index / (buckets.length - 1)) * width
            : width / 2;
        const y = height - ((bucket[key] || 0) / chartMax) * (height - 12);
        return `${x},${y}`;
      })
      .join(" ");
  return (
    <div className="revenueLineChart">
      {buckets.length ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="OPD, IPD and pharmacy revenue line chart"
        >
          <line
            x1="0"
            y1={height}
            x2={width}
            y2={height}
            className="chartAxis"
          />
          <polyline points={points("opd")} className="opdLine" />
          <polyline points={points("pharmacy")} className="pharmacyLine" />
          <polyline points={points("ipd")} className="ipdLine" />
        </svg>
      ) : (
        <p className="empty">No revenue data for this period.</p>
      )}
      <div className="lineLabels">
        {buckets.map((bucket) => (
          <small key={bucket.label}>{bucket.label}</small>
        ))}
      </div>
    </div>
  );
}

function RevenuePieChart({ opd, pharmacy, ipd }) {
  const total = opd + pharmacy + ipd;
  const opdPercent = total ? (opd / total) * 100 : 50;
  const pharmacyPercent = total ? (pharmacy / total) * 100 : 25;
  return (
    <div className="revenuePieChart">
      <div
        className="revenuePie"
        style={{
          background: total
            ? `conic-gradient(#168a82 0 ${opdPercent}%, #6655b5 ${opdPercent}% ${opdPercent + pharmacyPercent}%, #e18a24 ${opdPercent + pharmacyPercent}% 100%)`
            : "#edf1f3",
        }}
      >
        <div>
          <strong>₹{total.toLocaleString("en-IN")}</strong>
          <small>Total</small>
        </div>
      </div>
      <div className="pieDetails">
        <p>
          <i className="opdLegend" />
          <span>
            OPD<strong>₹{opd.toLocaleString("en-IN")}</strong>
          </span>
          <b>{total ? Math.round((opd / total) * 100) : 0}%</b>
        </p>
        <p>
          <i className="pharmacyLegend" />
          <span>
            Pharmacy<strong>₹{pharmacy.toLocaleString("en-IN")}</strong>
          </span>
          <b>{total ? Math.round((pharmacy / total) * 100) : 0}%</b>
        </p>
        <p>
          <i className="ipdLegend" />
          <span>
            IPD<strong>₹{ipd.toLocaleString("en-IN")}</strong>
          </span>
          <b>{total ? Math.round((ipd / total) * 100) : 0}%</b>
        </p>
      </div>
    </div>
  );
}
