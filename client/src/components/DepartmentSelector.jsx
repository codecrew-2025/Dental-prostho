// client/src/components/DepartmentSelector.jsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import DepartmentCard from './DepartmentCard';
import { ERROR_TEXT, LOADING_BOX, MUTED_TEXT } from '../styles/designTokens';

const DepartmentSelector = ({
  onSelect,
  referralOnly = false,
  showStats = false,
  getStats = null,
}) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const endpoint = referralOnly
          ? `${API_BASE_URL}/api/departments/referral`
          : `${API_BASE_URL}/api/departments`;

        const response = await fetch(endpoint, { headers });

        if (!response.ok) {
          throw new Error(`Failed to load departments (${response.status})`);
        }

        const json = await response.json();

        if (!json.success || !Array.isArray(json.data)) {
          throw new Error(json.message || 'Invalid response format');
        }

        setDepartments(json.data);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError(err.message || 'Failed to load departments');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [referralOnly]);

  if (loading) {
    return (
      <div className={LOADING_BOX}>
        <p className="text-gray-600 font-semibold">Loading departments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-4 text-center border border-red-200 bg-red-50">
        <p className={ERROR_TEXT + ' mt-0'}>{error}</p>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="p-5 text-center">
        <p className={MUTED_TEXT}>No departments available.</p>
      </div>
    );
  }

  return (
    <div>
      <p className={`mb-5 ${MUTED_TEXT}`}>
        {referralOnly
          ? 'Select a department to refer the patient to'
          : 'Select a department to continue'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {departments.map((dept) => (
          <DepartmentCard
            key={dept._id}
            department={dept}
            onClick={onSelect}
            showStats={showStats}
            stats={showStats && getStats ? getStats(dept.slug) : null}
          />
        ))}
      </div>
    </div>
  );
};

export default DepartmentSelector;
