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
