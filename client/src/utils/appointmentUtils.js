import { API_BASE_URL } from '../config/api';

export const bookFollowUpAppointment = async (patientId, patientEmail, date, time) => {
  if (!patientId || !date || !time) return false;

  try {
    const emailToUse = patientEmail || `${patientId}@temp.com`;
    
    const appointmentData = {
      patientId: patientId,
      patientEmail: emailToUse,
      chiefComplaint: 'Follow up',
      appointmentDate: date,
      appointmentTime: time
    };

    console.log('Booking follow-up appointment:', appointmentData);

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api/appointment/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(appointmentData)
    });

    if (response.ok) {
      console.log('Follow-up appointment booked successfully!');
      return true;
    } else {
      const error = await response.json();
      console.error('Failed to book follow-up appointment:', error);
      return false;
    }
  } catch (error) {
    console.error('Error booking follow-up appointment:', error);
    return false;
  }
};
