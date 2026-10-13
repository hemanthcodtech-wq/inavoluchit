import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { Users, Plus, Trash2, Link as LinkIcon, Save, Briefcase } from 'lucide-react';

const EmployeeManager = () => {
  const { token, API_URL } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign State
  const [assigningEmployeeId, setAssigningEmployeeId] = useState(null);
  const [selectedChitId, setSelectedChitId] = useState('');

  const fetchData = async () => {
    try {
      const [empRes, chitRes] = await Promise.all([
        fetch(`${API_URL}/admin/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/chits`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const empData = await empRes.json();
      const chitData = await chitRes.json();

      if (empData.success) setEmployees(empData.data);
      if (chitData.success) setChits(chitData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, API_URL]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const res = await fetch(`${API_URL}/admin/employees`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setShowForm(false);
        setFormData({ name: '', email: '', phone: '', password: '' });
        fetchData();
      } else {
        setFormError(data.message);
      }
    } catch (err) {
      setFormError('Server error creating employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleAssignChit = async (chitId, employeeId) => {
    try {
      const res = await fetch(`${API_URL}/admin/chits/${chitId}/assign`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ employeeId }) // null to unassign
      });
      if (res.ok) {
        setAssigningEmployeeId(null);
        setSelectedChitId('');
        fetchData();
      }
    } catch (err) {
      console.error('Error assigning chit:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading employees...</div>;
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              Employee <span style={{ color: 'var(--color-primary-green)' }}>Management</span>
            </h1>
            <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
              Create staff accounts and assign chits for them to manage.
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            {showForm ? 'Cancel' : 'Add Employee'}
          </button>
        </div>
      </ScrollAnimationWrapper>

      {showForm && (
        <ScrollAnimationWrapper>
          <div className="glass-panel card-premium" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create New Employee</h3>
            {formError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '4px', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="input-group">
                <label>Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="input-field" />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="input-field" />
              </div>
              <div className="input-group">
                <label>Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="input-field" />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="input-field" />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </ScrollAnimationWrapper>
      )}

      <ScrollAnimationWrapper>
        {employees.length === 0 ? (
          <div className="card-premium" style={{ textAlign: 'center', padding: '3rem' }}>
            <Users size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--color-secondary)' }} />
            <h3 style={{ fontWeight: 700 }}>No Employees</h3>
            <p style={{ color: 'var(--color-secondary)' }}>Click 'Add Employee' to create a staff account.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {employees.map(emp => (
              <div key={emp.id} className="glass-panel card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{emp.name}</h3>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      <span>{emp.email}</span>
                      <span>•</span>
                      <span>{emp.phone}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(emp.id)} className="btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={16} /> Assigned Chits
                  </h4>
                  
                  {emp.createdChits.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {emp.createdChits.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', backgroundColor: '#fff', border: '1px solid var(--border-subtle)', borderRadius: '20px', fontSize: '0.8rem' }}>
                          <span>{c.name}</span>
                          <button onClick={() => handleAssignChit(c.id, null)} style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', marginBottom: '1rem' }}>No chits assigned yet.</p>
                  )}

                  {assigningEmployeeId === emp.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select 
                        value={selectedChitId} 
                        onChange={(e) => setSelectedChitId(e.target.value)}
                        className="input-field" 
                        style={{ flex: 1, padding: '0.4rem' }}
                      >
                        <option value="">-- Select a Chit to Assign --</option>
                        {chits
                          .filter(c => c.createdBy !== emp.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.createdBy ? `(Currently owned by someone else)` : ''}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => handleAssignChit(selectedChitId, emp.id)}
                        disabled={!selectedChitId}
                        className="btn-primary" 
                        style={{ padding: '0.4rem 1rem' }}
                      >
                        Assign
                      </button>
                      <button onClick={() => setAssigningEmployeeId(null)} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Cancel</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setAssigningEmployeeId(emp.id)}
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <LinkIcon size={14} /> Assign New Chit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollAnimationWrapper>
    </div>
  );
};

export default EmployeeManager;
