import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { Lock, Search, Download, Briefcase, ChevronDown, ChevronUp, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FrozenMonths = () => {
  const { token, API_URL, user: currentUser } = useAuth();
  const [chitRecords, setChitRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChitId, setExpandedChitId] = useState(null);

  const fetchChitRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/chits-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setChitRecords(data.data);
      }
    } catch (error) {
      console.error('Error fetching chits records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChitRecords();
  }, [token, API_URL]);

  const toggleExpandChit = (id) => {
    setExpandedChitId(expandedChitId === id ? null : id);
  };

  const handleExportExcel = () => {
    if (chitRecords.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const exportData = [];
    chitRecords.forEach(record => {
      const chit = record.chit;
      for (let i = 1; i <= chit.durationMonths; i++) {
        const freeze = chit.freezes?.find(f => f.monthNumber === i);
        exportData.push({
          'Chit Name': chit.name,
          'Month': `Month ${i}`,
          'Status': freeze ? 'Taken' : 'Available',
          'Member ID': (freeze?.ticketId || 'N/A').replace(/^TICKET-/, 'MEMBER-'),
          'Taken By': freeze?.user?.name || 'N/A',
          'Taken Date': freeze ? new Date(freeze.createdAt).toLocaleDateString() : 'N/A'
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Taken Payments Detailed');
    XLSX.writeFile(workbook, 'All_Taken_Payments_Report.xlsx');
  };

  const handleExportChitExcel = (e, chit) => {
    e.stopPropagation(); // Prevent expanding the accordion
    const exportData = [];
    for (let i = 1; i <= chit.durationMonths; i++) {
      const freeze = chit.freezes?.find(f => f.monthNumber === i);
      exportData.push({
        'Month': `Month ${i}`,
        'Status': freeze ? 'Taken' : 'Available',
        'Member ID': (freeze?.ticketId || 'N/A').replace(/^TICKET-/, 'MEMBER-'),
        'Taken By': freeze?.user?.name || 'N/A',
        'Phone': freeze?.user?.phone || 'N/A',
        'Taken Date': freeze ? new Date(freeze.createdAt).toLocaleDateString() : 'N/A'
      });
    }
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chit Payments');
    XLSX.writeFile(workbook, `${chit.name.replace(/\s+/g, '_')}_Taken_Payments.xlsx`);
  };

  const handleExportChitPDF = (e, chit) => {
    e.stopPropagation(); // Prevent expanding the accordion
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Taken Payments Report - ${chit.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Chit Value: Rs. ${chit.chitValue.toLocaleString()}`, 14, 28);
    doc.text(`Duration: ${chit.durationMonths} Months`, 14, 34);

    const tableData = [];
    for (let i = 1; i <= chit.durationMonths; i++) {
      const freeze = chit.freezes?.find(f => f.monthNumber === i);
      tableData.push([
        `Month ${i}`,
        freeze ? 'Taken' : 'Available',
        freeze?.user?.name || '-',
        freeze?.user?.phone || '-',
        freeze ? new Date(freeze.createdAt).toLocaleDateString() : '-'
      ]);
    }

    autoTable(doc, {
      startY: 42,
      head: [['Month', 'Status', 'Taken By', 'Phone', 'Taken Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`${chit.name.replace(/\s+/g, '_')}_Taken_Payments.pdf`);
  };

  const filteredData = chitRecords.filter((record) => {
    const s = searchTerm.toLowerCase();
    const chitName = record.chit?.name?.toLowerCase() || '';
    return chitName.includes(s);
  });

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading taken payments data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <ScrollAnimationWrapper>
        <div className="fm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>
              Taken Payments <span style={{ color: '#2563eb' }}>(By Chit)</span>
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.3rem', fontSize: '0.85rem' }}>
              View all months for each chit and see which members have taken the payment.
            </p>
          </div>
          
          <div className="fm-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ position: 'relative', flex: '1 1 auto', minWidth: '200px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex' }}>
                <Search size={16} />
              </div>
              <input 
                type="text" 
                placeholder="Search by Chit Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '2rem', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.85rem', color: '#1f2937', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
              />
            </div>
            {(currentUser?.role === 'superadmin' || currentUser?.role === 'employee') && (
              <button 
                onClick={handleExportExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
              >
                <Download size={16} color="#2563eb" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px dashed #e5e7eb', padding: '3rem', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Briefcase size={24} color="#2563eb" />
            </div>
            <h3 style={{ fontWeight: 700, color: '#374151', fontSize: '1.1rem' }}>No Chits Found</h3>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              There are no chits matching your search.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredData.map((record) => {
              const chit = record.chit;
              const isExpanded = expandedChitId === chit.id;
              
              return (
                <div key={chit.id} style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  
                  {/* Chit Header */}
                  <div 
                    className="fm-chit-header"
                    onClick={() => toggleExpandChit(chit.id)}
                    style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isExpanded ? '#f9fafb' : '#fff', transition: 'background-color 0.2s', gap: '1rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase size={20} color="#2563eb" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>{chit.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, marginTop: '0.2rem' }}>
                          Value: ₹{chit.chitValue.toLocaleString()} | Duration: {chit.durationMonths} Months | 
                          <span style={{ color: '#2563eb', fontWeight: 600, marginLeft: '4px' }}>
                            {chit.freezes?.length || 0} Taken
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="fm-chit-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={(e) => handleExportChitPDF(e, chit)}
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer' }}
                          title="Export PDF"
                        >
                          <FileText size={14} /> PDF
                        </button>
                        <button 
                          onClick={(e) => handleExportChitExcel(e, chit)}
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', color: '#2563eb', cursor: 'pointer' }}
                          title="Export Excel"
                        >
                          <FileSpreadsheet size={14} /> Excel
                        </button>
                      </div>
                      {isExpanded ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                    </div>
                  </div>

                  {/* Expanded Content - Months Grid */}
                  {isExpanded && (
                    <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                      <div className="fm-months-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {Array.from({ length: chit.durationMonths }, (_, i) => i + 1).map(monthNum => {
                          const freeze = chit.freezes?.find(f => f.monthNumber === monthNum);
                          const isTaken = !!freeze;
                          
                          return (
                            <div 
                              key={monthNum}
                              style={{ 
                                padding: '1rem', 
                                borderRadius: '0.75rem', 
                                border: isTaken ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                                backgroundColor: isTaken ? '#eff6ff' : '#fff',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '0.4rem',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isTaken ? '#2563eb' : '#374151' }}>Month {monthNum}</span>
                                {isTaken ? (
                                  <span style={{ fontSize: '0.65rem', backgroundColor: '#dbeafe', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 700 }}>TAKEN</span>
                                ) : (
                                  <span style={{ fontSize: '0.65rem', backgroundColor: '#f3f4f6', color: '#6b7280', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>AVAILABLE</span>
                                )}
                              </div>
                              
                              {isTaken ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#1f2937', fontWeight: 600 }}>
                                      {freeze.user?.name || 'Unknown User'}
                                    </span>
                                    {freeze.ticketId && (
                                      <span style={{ fontSize: '0.68rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                        {freeze.ticketId.replace(/^TICKET-/, 'MEMBER-')}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>
                                    {new Date(freeze.createdAt).toLocaleDateString()}
                                  </span>
                                </>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                  Not taken yet
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </ScrollAnimationWrapper>

      <style>{`
        @media (min-width: 768px) {
          .fm-actions {
            width: auto !important;
          }
        }
        @media (max-width: 767px) {
          .fm-header {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .fm-chit-header {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .fm-chit-actions {
            width: 100%;
            justify-content: space-between;
          }
          .fm-months-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FrozenMonths;
