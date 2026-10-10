// src/pages/Students.jsx
import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    student_number: '',
    first_name: '',
    last_name: '',
    email: '',
    year_level: 1,
    program_id: 1,
    status: 'ACTIVE',
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/students?page=${page}&search=${search}`);
      const studentList = response.data?.data?.data || [];
      const lastPage = response.data?.data?.meta?.last_page || 1;

      setStudents(studentList);
      setTotalPages(lastPage);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormData({
      student_number: `2026-${Math.floor(10000 + Math.random() * 90000)}`,
      first_name: '',
      last_name: '',
      email: '',
      year_level: 1,
      program_id: 1,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      student_number: student.student_number || '',
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      email: student.email || '',
      year_level: student.year_level || 1,
      program_id: student.program_id || 1,
      status: student.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student record?')) return;
    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Students Directory</h2>
          <p style={styles.subtitle}>Manage student records, view enrollments, and update statuses.</p>
        </div>
        <button onClick={handleOpenCreate} style={styles.btnPrimary}>
          + Add New Student
        </button>
      </div>

      {/* Search Bar */}
      <div style={styles.filterCard}>
        <input
          type="text"
          placeholder="Search by student name or email address..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={styles.searchInput}
        />
      </div>

      {/* Table Section */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={{ marginTop: '10px', color: '#888' }}>Fetching directory records...</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Student No.</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Year Level</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((std, idx) => (
                  <tr key={std.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>#{std.id}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{std.student_number || 'N/A'}</td>
                    <td style={{ ...styles.td, fontWeight: '500' }}>{`${std.first_name || ''} ${std.last_name || ''}`}</td>
                    <td style={{ ...styles.td, color: '#aaa' }}>{std.email || 'N/A'}</td>
                    <td style={styles.td}>Year {std.year_level || 1}</td>
                    <td style={styles.td}>
                      <span style={std.status === 'ACTIVE' ? styles.badgeActive : styles.badgeInactive}>
                        {std.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button onClick={() => handleOpenEdit(std)} style={styles.btnEdit}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(std.id)} style={styles.btnDelete}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={styles.emptyTd}>
                    No student records found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        <div style={styles.paginationRow}>
          <span style={{ fontSize: '14px', color: '#aaa' }}>
            Page <strong style={{ color: '#fff' }}>{page}</strong> of <strong style={{ color: '#fff' }}>{totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={page <= 1 ? styles.btnDisabled : styles.btnNav}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={page >= totalPages ? styles.btnDisabled : styles.btnNav}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>{editingStudent ? 'Edit Student Details' : 'Register New Student'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Student Number</label>
                <input
                  type="text"
                  required
                  value={formData.student_number}
                  onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                  placeholder="student@school.edu"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Year Level</label>
                  <select
                    value={formData.year_level}
                    onChange={(e) => setFormData({ ...formData, year_level: Number(e.target.value) })}
                    style={styles.select}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={styles.select}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={styles.btnSecondary}>
                  Cancel
                </button>
                <button type="submit" style={styles.btnPrimary}>
                  {editingStudent ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Style Object
const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '30px 20px',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: '#e0e0e0',
  },
  header: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#888888',
  },
  filterCard: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1e1e24',
    border: '1px solid #33333d',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  tableCard: {
    backgroundColor: '#18181c',
    border: '1px solid #2a2a32',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  thRow: {
    backgroundColor: '#22222a',
    borderBottom: '1px solid #2a2a32',
  },
  th: {
    padding: '14px 18px',
    fontWeight: '600',
    color: '#9a9a9a',
    textTransform: 'uppercase',
    fontSize: '12px',
    letterSpacing: '0.5px',
  },
  trEven: {
    backgroundColor: '#18181c',
    borderBottom: '1px solid #22222a',
  },
  trOdd: {
    backgroundColor: '#1c1c22',
    borderBottom: '1px solid #22222a',
  },
  td: {
    padding: '14px 18px',
    verticalAlign: 'middle',
  },
  emptyTd: {
    padding: '40px',
    textAlign: 'center',
    color: '#777',
  },
  badgeActive: {
    padding: '4px 10px',
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    color: '#28a745',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeInactive: {
    padding: '4px 10px',
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    color: '#dc3545',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
  },
  btnSecondary: {
    backgroundColor: '#2a2a32',
    color: '#ccc',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '14px',
  },
  btnEdit: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    marginRight: '8px',
    cursor: 'pointer',
  },
  btnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  btnNav: {
    padding: '6px 14px',
    backgroundColor: '#2a2a32',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  btnDisabled: {
    padding: '6px 14px',
    backgroundColor: '#1c1c22',
    color: '#555',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'not-allowed',
  },
  paginationRow: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: '#1c1c22',
    borderTop: '1px solid #2a2a32',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1e1e24',
    border: '1px solid #33333d',
    borderRadius: '12px',
    width: '460px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #2a2a32',
    paddingBottom: '12px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#aaa',
  },
  input: {
    padding: '10px 12px',
    backgroundColor: '#141418',
    border: '1px solid #2a2a32',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    backgroundColor: '#141418',
    border: '1px solid #2a2a32',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  modalFooter: {
    display: 'flex',
    justify: 'flex-end',
    gap: '10px',
    marginTop: '10px',
    paddingTop: '16px',
    borderTop: '1px solid #2a2a32',
  },
  loadingContainer: {
    padding: '50px',
    textAlign: 'center',
  },
};