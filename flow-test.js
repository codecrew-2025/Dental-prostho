/**
 * Full flow diagnostic test — verifies the referral + approval chain end-to-end.
 */
const BASE = 'http://localhost:5000';

async function api(path, opts = {}) {
  const { headers: userHeaders, ...rest } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...userHeaders },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function main() {
  // 1. Get DNT20 token via debug endpoint
  console.log('=== LOGIN AS DNT20 ===');
  const loginR = await api('/api/debug/token-for-identity', {
    method: 'POST',
    body: JSON.stringify({ identity: 'DNT20' }),
  });
  const token = loginR.data?.token;
  if (!token) { console.log('LOGIN FAILED', JSON.stringify(loginR.data)); return; }
  console.log('  Token: obtained');
  const authH = { Authorization: `Bearer ${token}` };

  // 2. Get cases for DNT20 — dump full first case to see field names
  console.log('\n=== CASES FOR DNT20 (first case detail) ===');
  const cases = await api('/api/auth/doctor/assigned-pgs/cases?doctorId=DNT20', { headers: authH });
  const caseList = cases.data?.cases || cases.data?.data?.cases || [];
  console.log(`  Total cases: ${caseList.length}`);
  if (caseList.length > 0) {
    console.log('  First case keys:', Object.keys(caseList[0]).join(', '));
    console.log('  First case detail:', JSON.stringify(caseList[0], null, 2).slice(0, 1500));
  }

  // 3. Check raw DB state for each patient via oral and general endpoints
  const patients = ['2606013', '2606012', '2603017'];
  for (const pid of patients) {
    console.log(`\n=== PATIENT ${pid} ===`);

    const oral = await api(`/api/oral/patient/${pid}`, { headers: authH });
    console.log(`  Oral: ${oral.status} — cases=${oral.data?.cases?.length || oral.data?.length || 0}`);
    if (oral.status === 200) {
      const cases = oral.data?.cases || oral.data || [];
      for (const c of (Array.isArray(cases) ? cases : []).slice(0, 3)) {
        console.log(`    OC ${c._id?.slice(-8)}: doctorId=${c.doctorId}, referredDept=${c.referredDepartment || 'none'}, status=${c.chiefApprovalStatus || c.approvalStatus || 'pending'}`);
      }
    }

    const gen = await api(`/api/general/patient/${pid}`, { headers: authH });
    console.log(`  General: ${gen.status} — cases=${gen.data?.cases?.length || gen.data?.length || 0}`);
    if (gen.status === 200) {
      const cases = gen.data?.cases || gen.data || [];
      for (const c of (Array.isArray(cases) ? cases : []).slice(0, 3)) {
        console.log(`    GC ${c._id?.slice(-8)}: referredDept=${c.referredDepartment}, specStatus=${c.specialistStatus}, specDoc=${c.specialistDoctorId || 'none'}`);
      }
    }

    const appt = await api(`/api/appointment/appointments/patient/${pid}`, { headers: authH });
    console.log(`  Appointments: ${appt.status} — count=${appt.data?.appointments?.length || appt.data?.length || 0}`);
    const appts = appt.data?.appointments || appt.data || [];
    for (const a of (Array.isArray(appts) ? appts : []).slice(0, 5)) {
      console.log(`    Appt ${a.appointmentId || a.bookingId}: dept=${a.currentDepartment || 'none'}, status=${a.status}`);
    }
  }

  // 4. Try approval on a pending oral case from 2606013
  console.log('\n=== APPROVAL TEST ===');
  const pendingCase = caseList.find(c => (c.chiefApprovalStatus || c.approvalStatus || 'pending') === 'pending');
  if (pendingCase) {
    console.log(`  Pending case: ${pendingCase._id}, patient=${pendingCase.patientId}, dept=${pendingCase.department}`);
    const approve = await api(`/api/auth/doctor/assigned-pgs/cases/${pendingCase._id}/approve`, {
      method: 'PATCH',
      headers: authH,
      body: JSON.stringify({
        department: pendingCase.department || 'Oral Medicine and Radiology',
        chiefApproval: 'approved',
        approvedBy: 'DNT20',
        referredDepartment: pendingCase.referredDepartment || 'Prosthodontics',
      }),
    });
    console.log(`  Result: ${approve.status}`);
    console.log(`  Body: ${JSON.stringify(approve.data).slice(0, 1000)}`);

    // Check server logs for approval
    const { execSync } = await import('child_process');
    try {
      const log = execSync(`powershell -Command "Get-Content '$env:TEMP\\server.log' | Select-String '\\[APPROVAL\\]' | Select-Object -Last 10"`).toString();
      console.log(`  Server logs:\n${log}`);
    } catch { }
  } else {
    console.log('  No pending cases found');
  }

  console.log('\n=== FLOW TEST COMPLETE ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
