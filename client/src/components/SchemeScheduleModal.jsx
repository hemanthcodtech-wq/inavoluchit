import React, { useState } from 'react';
import { X, Calendar, DollarSign, Award, Percent, CheckCircle, Clock, Lock, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { getChitSchemeDetails, generateFixedSchemeSchedule, generateBidSchemeSchedule } from '../utils/auctionLogic';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SchemeScheduleModal = ({ isOpen, onClose, chit, onBookSlot, isUser = false, currentUserId = null }) => {
  if (!isOpen || !chit) return null;

  const schemeData = getChitSchemeDetails(chit);
  if (!schemeData) return null;

  const isFixed = schemeData.schemeType === 'FIXED_AMOUNT';

  const handleExportExcel = () => {
    const exportData = schemeData.schedule.map((row) => {
      if (isFixed) {
        return {
          'Month': row.monthName,
          'Total Chit Value': `Rs. ${row.chitValue.toLocaleString()}`,
          'Monthly Payment Fixed': `Rs. ${row.monthlyPaymentFixed.toLocaleString()}`,
          'Winner Amount': `Rs. ${row.winnerAmount.toLocaleString()}`,
          'Discount': `Rs. ${row.discountAmount.toLocaleString()}`,
          'Status': row.status,
          'Booked By': row.bookedBy?.name || 'N/A'
        };
      } else {
        return {
          'Month': row.monthName,
          'Paid Amount': `Rs. ${row.paidAmount.toLocaleString()}`,
          'Dividend Earned': `Rs. ${row.dividendEarned.toLocaleString()}`,
          'Prize Money': `Rs. ${row.prizeMoney.toLocaleString()}`,
          'Bid Discount': `Rs. ${row.bidDiscount.toLocaleString()}`,
          'Foreman Commission': `Rs. ${row.foremanCommission.toLocaleString()}`
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auction Scheme');
    XLSX.writeFile(wb, `${chit.name.replace(/\s+/g, '_')}_Scheme_Details.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`InaVolu Chit Funds — ${chit.name}`, 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Scheme Type: ${isFixed ? 'Fixed Amount Scheme' : 'Bid Auction Scheme'} | Total Value: Rs. ${Number(chit.chitValue).toLocaleString()} | Duration: ${chit.durationMonths} Months`, 14, 26);

    let head = [];
    let body = [];

    if (isFixed) {
      head = [['Status', 'Month', 'Total Chit Value', 'Monthly Payment Fixed', 'Winner Amount']];
      body = schemeData.schedule.map((r) => [
        r.status,
        r.monthName,
        `Rs. ${r.chitValue.toLocaleString()}`,
        `Rs. ${r.monthlyPaymentFixed.toLocaleString()}`,
        `Rs. ${r.winnerAmount.toLocaleString()}`
      ]);
    } else {
      head = [['Months', 'Paid Amount', 'Dividend Earned', 'Prize Money']];
      body = schemeData.schedule.map((r) => [
        r.monthName,
        `Rs. ${r.paidAmount.toLocaleString()}`,
        `Rs. ${r.dividendEarned.toLocaleString()}`,
        `Rs. ${r.prizeMoney.toLocaleString()}`
      ]);
    }

    autoTable(doc, {
      startY: 34,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: isFixed ? [22, 101, 52] : [30, 64, 175] }
    });

    doc.save(`${chit.name.replace(/\s+/g, '_')}_Scheme_Table.pdf`);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '1.25rem',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: isFixed ? '#eff6ff' : '#eff6ff'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '0.2rem 0.6rem',
                borderRadius: '1rem',
                backgroundColor: isFixed ? '#2563eb' : '#1e40af',
                color: '#fff',
                letterSpacing: '0.05em'
              }}>
                {isFixed ? '1. Fixed Amount Auction' : '2. Bid Auction (Reverse Auction)'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>
                {chit.durationMonths} Months • {chit.totalMembers} Members
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>
              {chit.name} — Scheme Details & Auction Logic
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleExportExcel}
              title="Download Excel"
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#fff',
                color: '#2563eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              title="Download PDF"
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#fff',
                color: '#1e40af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.4rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          padding: '1rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Total Chit Value</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>₹{Number(chit.chitValue).toLocaleString()}</span>
          </div>

          {isFixed ? (
            <>
              <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Monthly Payment Fixed</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>₹{schemeData.monthlyPaymentFixed.toLocaleString()}</span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Start Winner Payout</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>₹{schemeData.schedule[0].winnerAmount.toLocaleString()}</span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Final Month Payout</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>₹{schemeData.schedule[schemeData.schedule.length - 1].winnerAmount.toLocaleString()}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Nominal Installment</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>₹{schemeData.nominalInstallment.toLocaleString()}</span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Foreman Commission (5%)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>₹{schemeData.foremanCommission.toLocaleString()}</span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Est. Total Dividend</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>₹{schemeData.totalEstimatedDividend.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Scrollable Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {isFixed ? (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fef08a', color: '#713f12', borderBottom: '2px solid #ca8a04' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Month</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Total Chit Value</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Monthly Payment Fixed</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Winner Amount</th>
                    {onBookSlot && <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {schemeData.schedule.map((row) => {
                    const isBooked = row.isBooked;
                    const isBookedByMe = isUser && currentUserId && row.bookedBy?.userId === currentUserId;
                    return (
                      <tr
                        key={row.month}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: isBooked ? (isBookedByMe ? '#dbeafe' : '#eff6ff') : '#fff'
                        }}
                      >
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: isBooked ? '#3b82f6' : '#f3f4f6',
                            color: isBooked ? '#fff' : '#6b7280'
                          }}>
                            {isBooked ? (isBookedByMe ? 'Booked (You)' : 'Booked') : 'Available'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#1f2937' }}>{row.month}</td>
                        <td style={{ padding: '0.65rem 1rem', color: '#374151' }}>₹{row.chitValue.toLocaleString()}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#2563eb' }}>₹{row.monthlyPaymentFixed.toLocaleString()}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: '#1d4ed8' }}>₹{row.winnerAmount.toLocaleString()}</td>
                        {onBookSlot && (
                          <td style={{ padding: '0.65rem 1rem' }}>
                            {!isBooked ? (
                              <button
                                onClick={() => onBookSlot(chit.id, row.month)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: '#2563eb',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '0.4rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Book Month
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.bookedBy?.name || 'Locked'}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #93c5fd' }}>
                    <th style={{ backgroundColor: '#67e8f9', color: '#0e7490', padding: '0.75rem 1rem', fontWeight: 800 }}>Months</th>
                    <th style={{ backgroundColor: '#fde047', color: '#854d0e', padding: '0.75rem 1rem', fontWeight: 800 }}>Paid Amount</th>
                    <th style={{ backgroundColor: '#a5b4fc', color: '#2563eb', padding: '0.75rem 1rem', fontWeight: 800 }}>Dividend Earned</th>
                    <th style={{ backgroundColor: '#93c5fd', color: '#1e40af', padding: '0.75rem 1rem', fontWeight: 800 }}>Prize Money</th>
                  </tr>
                </thead>
                <tbody>
                  {schemeData.schedule.map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#1f2937' }}>{row.month}</td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#b45309' }}>₹{row.paidAmount.toLocaleString()}</td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#1d4ed8' }}>₹{row.dividendEarned.toLocaleString()}</td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: '#1e40af' }}>₹{row.prizeMoney.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#fef08a', fontWeight: 800, borderTop: '2px solid #ca8a04' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#713f12' }}>Total</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#713f12' }}>₹{schemeData.totalEstimatedPaid.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#713f12' }}>₹{schemeData.totalEstimatedDividend.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#713f12' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShieldCheck size={16} color="#2563eb" />
            <span>
              {isFixed
                ? 'Fixed Amount Scheme: Pre-scheduled escalating winner prizes with fixed monthly installments. Slots can be booked per month.'
                : 'Bid Auction Scheme: Reverse bidding dynamic auction. Distributable Dividend Pool = Bid Discount - 5% Foreman Commission, shared among all members.'}
            </span>
          </div>
        </div>

        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              backgroundColor: '#1f2937',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchemeScheduleModal;
