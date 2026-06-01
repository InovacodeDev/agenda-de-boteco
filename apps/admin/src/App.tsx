export default function App() {
  return (
    <div className="dashboard">
      <span className="badge">ADMIN PANEL</span>
      <h1>Agenda de Boteco</h1>
      <p className="subtitle">
        Centralized management dashboard for boteco schedules, users, and ratings.
      </p>

      <div className="grid">
        <div className="card">
          <span className="card-icon">🍻</span>
          <h3 className="card-title">Botecos</h3>
          <p className="card-desc">
            Manage registered bars, locations, opening hours, and menu items.
          </p>
        </div>

        <div className="card">
          <span className="card-icon">👥</span>
          <h3 className="card-title">Users</h3>
          <p className="card-desc">
            Monitor active members, friend networks, and participant check-ins.
          </p>
        </div>

        <div className="card">
          <span className="card-icon">📊</span>
          <h3 className="card-title">Analytics</h3>
          <p className="card-desc">
            Review event logs, visit statistics, and popular meet-up points.
          </p>
        </div>
      </div>
    </div>
  );
}
