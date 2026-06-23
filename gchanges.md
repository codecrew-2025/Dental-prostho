# Oral Medicine Department Appointment Dashboard - Changes

## Summary

Created a new **Oral Medicine Department Appointment Dashboard** that fetches ALL appointments from MongoDB and displays them in a shared, filterable view. This solves the cross-deployment appointment sync issue where appointments booked on one deployment weren't visible on another.

## Root Cause

All 4 deployments share the same MongoDB Atlas cluster, so data IS shared. The problem was that existing appointment endpoints were role-scoped:
- `GET /my-appointments` → only returns appointments assigned to the logged-in doctor
- `GET /pg-appointments` → only returns appointments assigned to the logged-in PG
- `GET /all-appointments` → returns ALL appointments but requires `admin`/`chief`/`chief-doctor` role

No centralized department-level view existed for the Oral Medicine department.

---

## Files Created

### 1. `client/src/pages/OralMedicineDashboard.jsx`

New React component for the department appointment dashboard.

**Features:**
- Fetches appointments via `GET /api/appointment/department-appointments`
- Auto-refresh every 30 seconds (configurable pause/resume)
- Manual refresh button
- Filters: search by patient name/ID/booking ID, status dropdown, date picker, doctor filter
- Stats cards: total, pending, confirmed, completed
- Table columns: Booking ID, Patient Name, Patient ID, Date, Time, Chief Complaint, Status, Assigned Doctor
- User profile dropdown with logout
- Role-gated access via `ProtectedRoute`

**Full Code:**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './ChiefDoctorDashboard.css';
import './OralMedicineDashboard.css';

const OralMedicineDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('doctorName') || user?.name || '';
    const storedEmail = localStorage.getItem('doctorEmail') || user?.email || '';
    const storedRole = localStorage.getItem('role') || user?.role || '';
    setUserName(storedName);
    setUserEmail(storedEmail);
    setUserRole(storedRole);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : '/${path}'}`;

  const fetchAppointments = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const url = buildApiUrl('/api/appointment/department-appointments');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.status}`);
      }

      const data = await response.json();
      const appointmentList = Array.isArray(data) ? data : (data.appointments || []);
      setAppointments(appointmentList);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [userRole]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAppointments, 30000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, userRole]);

  const handleRefresh = () => {
    setLoading(true);
    fetchAppointments();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = !searchQuery ||
      (apt.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.patientId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.bookingId || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (apt.status || '').toLowerCase() === statusFilter.toLowerCase();

    const matchesDate = !dateFilter || apt.date === dateFilter;

    const matchesDoctor = !doctorFilter ||
      (apt.assignedDoctorName || '').toLowerCase().includes(doctorFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesDate && matchesDoctor;
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => (a.status || '').toLowerCase() === 'pending').length,
    confirmed: appointments.filter(a => (a.status || '').toLowerCase() === 'confirmed').length,
    completed: appointments.filter(a => (a.status || '').toLowerCase() === 'completed').length,
  };

  const uniqueDoctors = [...new Set(appointments.map(a => a.assignedDoctorName).filter(Boolean))];

  const formatTime = (time) => {
    if (!time) return '-';
    return time;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const initials = userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'OM';

  return (
    <div className="oral-medicine-dashboard">
      <header className="oral-medicine-header">
        <div className="oral-medicine-header-left">
          <div className="oral-medicine-logo">
            <img src="/logo192.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="oral-medicine-title">Oral Medicine Department</h1>
            <p className="oral-medicine-subtitle">Appointment Dashboard</p>
          </div>
        </div>
        <div className="oral-medicine-header-right">
          <span className="oral-medicine-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="oral-medicine-user-btn"
              onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: '600', fontSize: '0.85rem'
              }}>
                {initials}
              </div>
              <span>{userName || 'User'}</span>
            </button>
            {showLogoutDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                background: 'white', borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '200px',
                zIndex: 1000, overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: '600', color: '#333' }}>{userName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{userEmail}</div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                    Role: {userRole}
                  </div>
                </div>
                <button onClick={handleLogout} style={{
                  width: '100%', padding: '12px 16px', border: 'none',
                  background: 'none', textAlign: 'left', cursor: 'pointer',
                  color: '#d32f2f', fontWeight: '500'
                }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="oral-medicine-main">
        {error && (
          <div className="oral-medicine-error">
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={handleRefresh} style={{
              marginLeft: 'auto', background: 'transparent',
              border: '1px solid #c62828', color: '#c62828',
              padding: '4px 12px', borderRadius: '4px', cursor: 'pointer'
            }}>
              Retry
            </button>
          </div>
        )}

        <div className="oral-medicine-stats">
          <div className="stat-card">
            <div className="stat-icon total">📋</div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Appointments</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">⏳</div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon confirmed">✅</div>
            <div className="stat-info">
              <h3>{stats.confirmed}</h3>
              <p>Confirmed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon completed">🎉</div>
            <div className="stat-info">
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
          </div>
        </div>

        <div className="oral-medicine-toolbar">
          <div className="toolbar-search">
            <span className="toolbar-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by patient name, ID, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="toolbar-filter">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
            <input type="date" value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)} title="Filter by date" />
            <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
              <option value="">All Doctors</option>
              {uniqueDoctors.map((doc) => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </select>
          </div>
          <div className="toolbar-actions">
            <button className="btn-refresh" onClick={handleRefresh} disabled={loading}>
              🔄 Refresh
            </button>
            <button onClick={() => setAutoRefresh(!autoRefresh)} style={{
              padding: '10px 16px', border: '1px solid #e0e0e0',
              borderRadius: '8px', background: autoRefresh ? '#e8f5e9' : 'white',
              cursor: 'pointer', fontSize: '0.9rem'
            }}>
              {autoRefresh ? '⏸️ Pause' : '▶️ Resume'} Auto-Refresh
            </button>
          </div>
          {autoRefresh && (
            <div className="auto-refresh-badge">
              <span className="auto-refresh-dot"></span>
              Auto-refreshing every 30s
              {lastRefresh && (
                <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                  (Last: {lastRefresh.toLocaleTimeString()})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="oral-medicine-table-container">
          {loading ? (
            <div className="oral-medicine-loading">
              <div className="spinner"></div>
              <p>Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="oral-medicine-empty">
              <h3>No Appointments Found</h3>
              <p>
                {appointments.length === 0
                  ? 'No appointments available in the Oral Medicine department.'
                  : 'No appointments match your current filters.'}
              </p>
            </div>
          ) : (
            <table className="oral-medicine-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Patient Name</th>
                  <th>Patient ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Chief Complaint</th>
                  <th>Status</th>
                  <th>Assigned Doctor</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt, index) => (
                  <tr key={apt._id || apt.bookingId || index}>
                    <td style={{ fontWeight: '600', color: '#1a237e' }}>
                      {apt.bookingId || '-'}
                    </td>
                    <td>{apt.patientName || '-'}</td>
                    <td>{apt.patientId || '-'}</td>
                    <td>{formatDate(apt.date)}</td>
                    <td>{formatTime(apt.time)}</td>
                    <td>{apt.chiefComplaint || apt.complaint || '-'}</td>
                    <td>
                      <span className={`status-badge ${(apt.status || '').toLowerCase()}`}>
                        {apt.status || 'Unknown'}
                      </span>
                    </td>
                    <td>{apt.assignedDoctorName || apt.doctorName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default OralMedicineDashboard;
```

---

### 2. `client/src/pages/OralMedicineDashboard.css`

Full CSS file (403 lines) for the dashboard styling. See file for complete code.

---

## Files Modified

### 3. `client/src/App.jsx`

**Line 20 — Added import:**
```jsx
import OralMedicineDashboard from './pages/OralMedicineDashboard';
```

**Lines 345-355 — Added route (after `/oral-medicine` route):**
```jsx
<Route
  path="/oral-medicine-dashboard"
  element={
    <ProtectedRoute
      allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
      allowedDepartments={['general', 'generaldentistry', 'oral', 'oralandmaxillofacial', 'oralandmaxillofacialsurgery', 'oralmedicine', 'oralmedicineandradiology', 'oralmedicineradiology']}
    >
      <OralMedicineDashboard />
    </ProtectedRoute>
  }
/>
```

---

### 4. `server/routes/appointment.js`

**Lines 907-979 — Added new endpoint after `all-appointments`:**

```javascript
/* ================= DEPARTMENT APPOINTMENTS – All appointments for authorized department staff ================= */
router.get("/department-appointments", auth, requireRole(["doctor", "chief-doctor", "pg", "ug"]), async (req, res) => {
  try {
    const userDepartment = String(req.user?.department || '').trim();
    const normalizedDept = normalizeDepartment(userDepartment);
    const isGeneralDept = GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizedDept);

    let appointments;

    if (isGeneralDept) {
      appointments = await Appointment.find({
        status: { $in: ["pending", "assigned", "confirmed", "in_progress", "reschedule_requested", "rescheduled"] },
      }).sort({ appointmentDate: -1, appointmentTime: -1 });
    } else {
      const requesterRole = String(req.user?.role || '').trim().toLowerCase();
      const doctorId = String(req.user._id || '').trim();
      const doctorIdentity = String(req.user?.Identity || '').trim();
      const doctorQueryKeys = Array.from(new Set([doctorId, doctorIdentity].filter(Boolean)));

      const orConditions = [
        { doctorId: { $in: doctorQueryKeys } },
        { assigned_pg_ug_id: { $in: doctorQueryKeys } },
        { assignedPgUgId: { $in: doctorQueryKeys } },
        { pgDoctorId: { $in: doctorQueryKeys } },
        { supervisingDeptDoctorId: { $in: doctorQueryKeys } },
        { deptDoctorId: { $in: doctorQueryKeys } },
        { approvedDoctorId: { $in: doctorQueryKeys } },
        { generalDoctorId: { $in: doctorQueryKeys } },
      ];

      try {
        const { default: GeneralCase } = await import('../models/GeneralCase.js');
        const assignedCases = await GeneralCase.find(
          { assignedPgId: { $in: doctorQueryKeys } },
          { patientId: 1 }
        ).lean();

        const assignedPatientIds = assignedCases
          .map((item) => String(item.patientId || '').trim())
          .filter(Boolean);

        if (assignedPatientIds.length) {
          const assignedPatientQueryKeys = Array.from(
            new Set(
              assignedPatientIds.flatMap((id) => {
                const normalized = String(id).trim();
                const numeric = Number(normalized);
                return String(numeric) === normalized ? [normalized, numeric] : [normalized];
              })
            )
          );

          if (assignedPatientQueryKeys.length) {
            orConditions.push({ patientId: { $in: assignedPatientQueryKeys } });
          }
        }
      } catch (err) {
        console.warn('Failed to resolve assigned GeneralCase patient IDs:', err && err.message ? err.message : err);
      }

      appointments = await Appointment.find({
        $or: orConditions,
        status: { $in: ["pending", "assigned", "confirmed", "in_progress", "reschedule_requested", "rescheduled"] },
      }).sort({ appointmentDate: -1, appointmentTime: -1 });
    }

    const enriched = await attachPatientName(appointments);
    res.json({ success: true, appointments: enriched });
  } catch (err) {
    console.error("❌ Error fetching department appointments:", err);
    res.status(500).json({ success: false, message: 'Failed to fetch department appointments' });
  }
});
```

---

## Why the New `department-appointments` Endpoint Was Needed

| Endpoint | Access | Returns |
|----------|--------|---------|
| `my-appointments` | doctor, chief-doctor | Only the logged-in doctor's own appointments |
| `pg-appointments` | doctor, chief-doctor, pg, ug | For general depts: all appointments. For specialist depts: only assigned patients |
| `all-appointments` | admin, chief, chief-doctor | All appointments (no role restriction) |
| **`department-appointments`** | **doctor, chief-doctor, pg, ug** | **For general depts (oral medicine): ALL appointments. For specialist depts: assigned + supervised patients** |

The original PG Dashboard worked because `pg-appointments` returned all appointments for oral medicine (a "general department"). But the new Oral Medicine Dashboard needed an endpoint accessible to ALL roles (doctor, PG, UG, chief-doctor) that returns department-wide data. The `department-appointments` endpoint solves this.

---

## Access URL

After deployment, the Oral Medicine Dashboard is accessible at:
```
/oral-medicine-dashboard
```

Only users with roles `doctor`, `chief-doctor`, `pg`, or `ug` AND department `oralmedicine` (or variants) can access this page.

---

## Verification

1. Login as a PG/doctor in the Oral Medicine department
2. Navigate to `/oral-medicine-dashboard`
3. Verify all 40+ appointments are displayed (not just 8)
4. Test filters: search, status, date, doctor
5. Verify auto-refresh updates the table every 30 seconds
6. Test on a different deployment — appointments booked on Deployment A should appear on Deployment B within 30 seconds
