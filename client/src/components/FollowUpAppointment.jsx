import React from 'react';

const formatMinutesToTime = (minutes) => {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
};

export const generateTimeSlots = () => {
  const rawDept = String(
    localStorage.getItem('doctorDepartment') ||
    localStorage.getItem('pgDepartment') ||
    localStorage.getItem('ugDepartment') ||
    ''
  ).trim().toLowerCase().replace(/[\s_]+/g, '');

  const isGeneralDept =
    rawDept === 'general' ||
    rawDept === 'generaldentistry' ||
    rawDept.includes('oral') ||
    rawDept === 'oralmedicine' ||
    rawDept === 'oralmedicineandradiology' ||
    rawDept === 'oralmedicineradiology';

  if (isGeneralDept) {
    const slotStartsInMinutes = [];
    const lunchStart = 13 * 60;
    const lunchEnd   = 14 * 60;
    const breakSlot  = 11 * 60;

    for (let t = 9 * 60; t <= 14 * 60; t += 15) {
      if (t >= lunchStart && t < lunchEnd) continue;
      if (t === breakSlot) continue;
      slotStartsInMinutes.push(t);
    }

    return slotStartsInMinutes.map(start => formatMinutesToTime(start));
  }

  const slotStartsInMinutes = [
    9 * 60,
    9 * 60 + 30,
    10 * 60,
    10 * 60 + 30,
    11 * 60 + 30,
    12 * 60,
    12 * 60 + 30,
    14 * 60,
  ];

  return slotStartsInMinutes.map(start => formatMinutesToTime(start));
};

const FollowUpAppointment = ({ date, setDate, time, setTime }) => {
  const timeSlots = generateTimeSlots();

  return (
    <div className="form-group" style={{ marginTop: 32 }}>
      <div style={{ 
        padding: '20px', 
        background: 'rgba(255,255,255,0.05)', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>
          Optional Follow-up Appointment
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#cbd5e1' }}>
          Schedule a patient appointment when you finish the case sheet. Leave blank to skip booking.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label className="omr-lbl" style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontSize: '0.9rem' }}>
              Appointment Date:
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              min={new Date().toISOString().split('T')[0]}
              style={{ 
                width: '100%', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                border: '1px solid #475569',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }} 
            />
          </div>
          <div>
            <label className="omr-lbl" style={{ display: 'block', marginBottom: '8px', color: '#e2e8f0', fontSize: '0.9rem' }}>
              Appointment Time:
            </label>
            <select 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                border: '1px solid #475569',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select time</option>
              {timeSlots.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpAppointment;
