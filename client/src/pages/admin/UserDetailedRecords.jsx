import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertCircle,
  Check,
  X,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
  Upload,
  Search,
  Lock,
  ShieldCheck,
  Camera,
  Edit3,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Trash2,
  Receipt,
  Sparkles,
  MapPin,
  Users,
  Shield,
  CreditCard,
  Gavel,
  Trophy
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ProofUploader from '../../components/ProofUploader';
import OfficialReceipt from '../../components/OfficialReceipt';
import { formatChitMonthYear } from '../../utils/chitDateUtils';

// Helper to create clean URL slug from user name
const slugify = (text) => {
  if (!text) return 'member';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'member';
};

const UserDetailedRecords = () => {
  const { userId, slug } = useParams();
  const navigate = useNavigate();
  const { token, API_URL, SERVER_URL } = useAuth();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  // Active Tab: 'payments' (all payments ledger) | 'chits' (scheme-by-scheme ledger)
  const [activeTab, setActiveTab] = useState('payments');

  // Lightbox Preview State
  const [lightboxData, setLightboxData] = useState(null); // { url, title }

  // Official Receipt Modal State
  const [viewReceiptData, setViewReceiptData] = useState(null);

  // Selected Chit Scheme View State (for Tab 2)
  const [selectedChitId, setSelectedChitId] = useState(null);
  const [allAuctions, setAllAuctions] = useState([]);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Upload / Mark Paid Modal State
  const [uploadModal, setUploadModal] = useState({
    isOpen: false,
    chitId: null,
    slotNumber: 1,
    chitName: '',
    amount: null,
    monthNumber: null
  });
  const [uploadData, setUploadData] = useState({ file: null, text: '' });
  const [uploadLoading, setUploadLoading] = useState(false);

  // Edit User Profile Modal State
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Quick Photo Upload State
  const fileInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Quick Document Upload Modal State (Aadhaar / PAN / Profile)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTypeToUpload, setDocTypeToUpload] = useState('profile'); // 'profile' | 'aadhar' | 'pan'
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);

  // Payments Ledger Table Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChitId, setFilterChitId] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auction History Filters & Pagination State
  const [auctionFilterRole, setAuctionFilterRole] = useState('all'); // 'all' | 'won' | 'dividend'
  const [auctionFilterChitId, setAuctionFilterChitId] = useState('all');
  const [auctionSearch, setAuctionSearch] = useState('');
  const [auctionCurrentPage, setAuctionCurrentPage] = useState(1);
  const [auctionPageSize, setAuctionPageSize] = useState(10);

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = SERVER_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'));
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchUserRecord = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users-records/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setUserData(data.data);

        // Sync URL slug cleanly with user's name without page reload
        const user = data.data.user;
        if (user && user.name) {
          const properSlug = slugify(user.name);
          if (slug !== properSlug && window.history && window.history.replaceState) {
            window.history.replaceState(null, '', `/admin/records/user/${userId}/${properSlug}`);
          }
        }
      } else {
        // Fallback: fetch all and find
        const allRes = await fetch(`${API_URL}/admin/users-records`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allData = await allRes.json();
        if (allData.success) {
          const match = allData.data.find(r => r.user.id === userId || r.user._id === userId);
          if (match) {
            setUserData(match);
            const user = match.user;
            if (user && user.name) {
              const properSlug = slugify(user.name);
              if (slug !== properSlug && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', `/admin/records/user/${userId}/${properSlug}`);
              }
            }
          } else {
            setError('Member records not found');
          }
        } else {
          setError(data.message || 'Failed to load member records');
        }
      }

      // Fetch all recorded auctions for accurate dividend adjustments
      try {
        const aucRes = await fetch(`${API_URL}/auctions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const aucData = await aucRes.json();
        if (aucData.success && Array.isArray(aucData.data)) {
          setAllAuctions(aucData.data);
        }
      } catch (aucErr) {
        console.warn('Auctions fetch notice:', aucErr);
      }
    } catch (err) {
      console.error('Error fetching detailed user records:', err);
      setError('Connection error loading member records');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserRecord();
    }
  }, [userId, token, API_URL]);

  // Handle Quick Profile Picture Upload via file picker
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile', file);

      const targetId = userData?.user?._id || userData?.user?.id || userId;
      const res = await fetch(`${API_URL}/admin/users/${targetId}/documents`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Profile photo updated successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to upload profile photo');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      alert('Error uploading profile photo');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open Edit User Modal with populated data
  const handleOpenEditUser = () => {
    if (!userData?.user) return;
    const u = userData.user;
    setEditFormData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      whatsappNumber: u.whatsappNumber || '',
      memberId: u.memberId || '',
      gender: u.gender || '',
      age: u.age || '',
      dob: u.dob || '',
      occupation: u.occupation || '',
      address: u.address || '',
      city: u.city || '',
      state: u.state || '',
      pincode: u.pincode || '',
      remarks: u.remarks || '',
      aadharNumber: u.aadharNumber || '',
      panNumber: u.panNumber || '',
      nomineeName: u.nomineeName || '',
      nomineeRelationship: u.nomineeRelationship || '',
      nomineePhone: u.nomineePhone || '',
      nomineeDob: u.nomineeDob || '',
      nomineeType: u.nomineeType || 'Primary',
      nomineeAddress: u.nomineeAddress || '',
      nomineeRemarks: u.nomineeRemarks || '',
      guarantorRequired: u.guarantorRequired || 'No',
      guarantorName: u.guarantorName || '',
      guarantorRelationship: u.guarantorRelationship || '',
      guarantorPhone: u.guarantorPhone || '',
      guarantorAddress: u.guarantorAddress || '',
      securityType: u.securityType || '',
      securityValue: u.securityValue || '',
      securityVerificationStatus: u.securityVerificationStatus || 'Pending'
    });
    setIsEditUserOpen(true);
  };

  // Save Edit User Modal
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const targetId = userData?.user?._id || userData?.user?.id || userId;
      const res = await fetch(`${API_URL}/admin/users/${targetId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Member profile details updated successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
        setIsEditUserOpen(false);
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to update user details');
      }
    } catch (err) {
      console.error('Error updating member:', err);
      alert('Connection error saving member details');
    } finally {
      setEditSaving(false);
    }
  };

  // Handle Document Modal Upload (Aadhaar / PAN / Profile)
  const handleDocModalSubmit = async (e) => {
    e.preventDefault();
    if (!docFile) {
      alert('Please select an image or document file to upload.');
      return;
    }
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append(docTypeToUpload, docFile);

      const targetId = userData?.user?._id || userData?.user?.id || userId;
      const res = await fetch(`${API_URL}/admin/users/${targetId}/documents`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`${docTypeToUpload.toUpperCase()} document uploaded successfully!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        setIsDocModalOpen(false);
        setDocFile(null);
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to upload document');
      }
    } catch (err) {
      console.error('Document upload error:', err);
      alert('Connection error uploading document');
    } finally {
      setDocUploading(false);
    }
  };

  // Image compression for mark paid proof
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 800;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadLoading(true);

    try {
      let compressedFile = null;
      if (uploadData.file) {
        compressedFile = await compressImage(uploadData.file);
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('amount', uploadModal.amount);
      formData.append('monthNumber', uploadModal.monthNumber);
      formData.append('slotNumber', uploadModal.slotNumber || 1);
      if (uploadData.text) formData.append('transactionId', uploadData.text);
      if (compressedFile) formData.append('proof', compressedFile);

      const response = await fetch(`${API_URL}/admin/chits/${uploadModal.chitId}/mark-paid`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Month ${uploadModal.monthNumber} payment marked as paid successfully!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        setUploadModal({ isOpen: false, chitId: null, slotNumber: 1, chitName: '', amount: null, monthNumber: null });
        setUploadData({ file: null, text: '' });
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
      alert('Connection error marking payment');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleMarkAsUnpaid = async (paymentId, monthNumber) => {
    if (!window.confirm(`Reset Month ${monthNumber} payment to unpaid? It will re-enter the verification queue.`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/payments/${paymentId}/mark-unpaid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Month ${monthNumber} reset to unpaid.`);
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to reset payment');
      }
    } catch (err) {
      console.error('Error resetting payment:', err);
      alert('Connection error resetting payment');
    }
  };

  // Global calculations across all enrolled chits
  const user = userData?.user || {};
  const chits = userData?.chits || [];
  const payments = userData?.payments || [];

  const totalEnrolledChits = chits.length;

  let totalMonthsPaidAll = 0;
  let totalMonthsDueAll = 0;
  let totalAmountPaidAll = 0;
  let totalAmountDueAll = 0;
  let totalDividendSavedAll = 0;

  // Sort chits sequentially by name and ticket number
  const sortedRawChits = useMemo(() => {
    return [...chits].sort((a, b) => {
      const nameA = a.baseName || a.name || '';
      const nameB = b.baseName || b.name || '';
      const nameComp = nameA.localeCompare(nameB);
      if (nameComp !== 0) return nameComp;
      const numA = parseInt(String(a.ticketId || '').match(/\d+/)?.[0] || a.slotNumber || 0, 10);
      const numB = parseInt(String(b.ticketId || '').match(/\d+/)?.[0] || b.slotNumber || 0, 10);
      return numA - numB;
    });
  }, [chits]);

  // Per-chit enriched data
  const enrichedChits = useMemo(() => {
    return sortedRawChits.map(chit => {
      const rawChitId = chit.chitId || chit.id;
      const slotNum = chit.slotNumber || 1;
      const chitAuctions = (chit.auctions && chit.auctions.length > 0)
        ? chit.auctions
        : (allAuctions || []).filter(a => a.chitId === rawChitId);

      const chitPayments = payments.filter(p => {
        const pChitId = p.chitId?._id ? p.chitId._id.toString() : (p.chitId?.id || p.chitId?.toString() || '');
        return pChitId === rawChitId && (p.slotNumber || 1) === slotNum;
      });
      const approvedPayments = chitPayments.filter(p => p.status === 'approved');
      const pendingPayments = chitPayments.filter(p => p.status === 'pending');

      const paidMonthsCount = approvedPayments.length;
      const duration = chit.durationMonths || 20;
      const nominal = Number(chit.monthlyContribution || 0);

      const chitAuctionList = chitAuctions || [];
      const maxAuctionMonth = chitAuctionList.reduce((max, a) => Math.max(max, Number(a.monthNumber || 0)), 0);
      const auctionedMonthsSet = new Set(chitAuctionList.map(a => Number(a.monthNumber)));

      const fullMonthLedger = [];
      let totalDividendSaved = 0;

      for (let m = 1; m <= duration; m++) {
        const paymentRecord = approvedPayments.find(p => p.monthNumber === m)
          || pendingPayments.find(p => p.monthNumber === m)
          || null;

        const isPaid = !!(paymentRecord && paymentRecord.status === 'approved');
        const isPending = !!(paymentRecord && paymentRecord.status === 'pending');

        const isAuctionCompleted = m === 1 ? true : (auctionedMonthsSet.has(m - 1) || (m - 1) <= maxAuctionMonth);
        const isUnlocked = isAuctionCompleted || isPaid || isPending || chit.status === 'completed';

        const customDueEntry = (chit.monthlyDues || []).find(d => Number(d.monthNumber) === m);
        let expectedAmount = customDueEntry ? Number(customDueEntry.dueAmount) : nominal;
        let dividend = 0;

        if (!customDueEntry && m > 1) {
          const prevAuction = chitAuctionList.find(a => Number(a.monthNumber) === m - 1);
          if (prevAuction) {
            if (prevAuction.nextPayableAmount !== undefined && prevAuction.nextPayableAmount !== null) {
              expectedAmount = Number(prevAuction.nextPayableAmount);
            } else if (prevAuction.dividendPerMember !== undefined && prevAuction.dividendPerMember !== null && Number(prevAuction.dividendPerMember) > 0) {
              expectedAmount = Math.max(0, nominal - Number(prevAuction.dividendPerMember));
            }
            dividend = Math.max(0, nominal - expectedAmount);
          } else if (paymentRecord && isPaid && Number(paymentRecord.amount) > 0) {
            expectedAmount = Number(paymentRecord.amount);
            dividend = Math.max(0, nominal - expectedAmount);
          }
        } else if (!customDueEntry) {
          if (paymentRecord && isPaid && Number(paymentRecord.amount) > 0) {
            expectedAmount = Number(paymentRecord.amount);
          }
        }

        const paidAmount = isPaid ? (Number(paymentRecord?.amount) || expectedAmount) : 0;
        if (isPaid && paidAmount > 0) {
          totalDividendSaved += Math.max(0, nominal - paidAmount);
        }

        fullMonthLedger.push({
          monthNumber: m,
          expectedAmount,
          dividend,
          paidAmount,
          payment: paymentRecord,
          isPaid,
          isPending,
          isAuctionCompleted,
          isUnlocked
        });
      }

      const monthLedger = fullMonthLedger.filter(row => row.isUnlocked);
      const unlockedMonthsCount = monthLedger.length;
      const monthsDue = monthLedger.filter(row => !row.isPaid).length;
      const amountPaid = approvedPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const amountDue = monthLedger.reduce((acc, item) => acc + (item.isPaid ? 0 : item.expectedAmount), 0);

      const percentPaid = Math.min(100, Math.round((paidMonthsCount / duration) * 100));

      return {
        ...chit,
        paidMonthsCount,
        unlockedMonthsCount,
        maxAuctionMonth,
        monthsDue,
        amountPaid,
        amountDue,
        totalDividendSaved,
        percentPaid,
        monthLedger,
        fullMonthLedger,
        approvedPayments,
        pendingPayments
      };
    });
  }, [sortedRawChits, allAuctions, payments]);

  // Aggregate stats
  enrichedChits.forEach(c => {
    totalMonthsPaidAll += c.paidMonthsCount;
    totalMonthsDueAll += c.monthsDue;
    totalAmountPaidAll += c.amountPaid;
    totalAmountDueAll += c.amountDue;
    totalDividendSavedAll += c.totalDividendSaved;
  });

  const activeChitId = selectedChitId || (enrichedChits[0]?.id || null);
  const activeChit = enrichedChits.find(c => c.id === activeChitId) || enrichedChits[0] || null;

  // Filter & Paginate All Payments for Tab 1
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Chit Scheme Filter
      if (filterChitId !== 'all') {
        const pChitId = p.chitId?._id ? p.chitId._id.toString() : (p.chitId?.id || p.chitId?.toString() || '');
        if (pChitId !== filterChitId) return false;
      }

      // Mode Filter
      if (filterMode !== 'all') {
        const mode = (p.paymentMode || 'Cash').toLowerCase();
        if (filterMode === 'cash' && !mode.includes('cash')) return false;
        if (filterMode === 'upi' && !mode.includes('upi') && !mode.includes('online')) return false;
        if (filterMode === 'bank' && !mode.includes('bank') && !mode.includes('neft') && !mode.includes('rtgs')) return false;
      }

      // Status Filter
      if (filterStatus !== 'all') {
        if ((p.status || 'pending').toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const receiptNo = (p.receiptNo || '').toLowerCase();
        const txnId = (p.transactionId || '').toLowerCase();
        const remarks = (p.remarks || '').toLowerCase();
        const chitName = (p.chit?.name || p.chitId?.name || '').toLowerCase();
        const match = receiptNo.includes(q) || txnId.includes(q) || remarks.includes(q) || chitName.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [payments, filterChitId, filterMode, filterStatus, searchQuery]);

  // Helper to dynamically calculate excess amount for a payment if not explicitly stored
  const getPaymentExcess = (p) => {
    if (p.excessAmount !== undefined && p.excessAmount !== null && Number(p.excessAmount) > 0) {
      return Number(p.excessAmount);
    }
    const rawChitId = p.chitId?._id ? p.chitId._id.toString() : (p.chitId?.id || p.chitId?.toString() || '');
    const chit = enrichedChits.find(c => (c.chitId || c.id) === rawChitId);
    if (!chit) return 0;
    const monthLedgerItem = chit.monthLedger?.find(m => m.monthNumber === p.monthNumber)
      || chit.fullMonthLedger?.find(m => m.monthNumber === p.monthNumber);
    const expected = p.dueAmount || monthLedgerItem?.expectedAmount || chit.monthlyContribution || 0;
    if (expected > 0 && Number(p.amount) > expected) {
      return Number(p.amount) - expected;
    }
    return 0;
  };

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // ---------------------------------------------------------------------------
  // AUCTION HISTORY CALCULATIONS FOR THIS MEMBER
  // ---------------------------------------------------------------------------
  const currentUserId = (user?._id || user?.id || userId)?.toString();

  // Enrolled chit scheme IDs
  const userEnrolledChitIds = useMemo(() => {
    return new Set(enrichedChits.map(c => (c.chitId || c.id || c._id)?.toString()));
  }, [enrichedChits]);

  // Auctions won by this user
  const userWonAuctions = useMemo(() => {
    if (!allAuctions || !currentUserId) return [];
    return allAuctions.filter(a => {
      const winnerId = a.winningMemberId?._id 
        ? a.winningMemberId._id.toString() 
        : (a.winningMemberId?.id || a.winningMemberId?.toString() || a.winningMember?._id?.toString() || a.winningMember?.id?.toString() || '');
      return winnerId === currentUserId;
    });
  }, [allAuctions, currentUserId]);

  // Total prize money claimed by this user
  const totalWonPayout = useMemo(() => {
    return userWonAuctions.reduce((sum, a) => sum + Number(a.winnerPayout || a.auctionAmount || 0), 0);
  }, [userWonAuctions]);

  // All auctions associated with this member (either won by him or in his enrolled chits)
  const userRelevantAuctions = useMemo(() => {
    if (!allAuctions || !currentUserId) return [];
    return allAuctions.filter(a => {
      const aChitId = a.chitId?._id ? a.chitId._id.toString() : (a.chitId?.id || a.chitId?.toString() || a.chit?._id?.toString() || a.chit?.id?.toString() || '');
      const winnerId = a.winningMemberId?._id 
        ? a.winningMemberId._id.toString() 
        : (a.winningMemberId?.id || a.winningMemberId?.toString() || a.winningMember?._id?.toString() || a.winningMember?.id?.toString() || '');
      return winnerId === currentUserId || userEnrolledChitIds.has(aChitId);
    });
  }, [allAuctions, currentUserId, userEnrolledChitIds]);

  // Filtered auctions based on user filter controls
  const filteredAuctions = useMemo(() => {
    return userRelevantAuctions.filter(a => {
      const aChitId = a.chitId?._id ? a.chitId._id.toString() : (a.chitId?.id || a.chitId?.toString() || a.chit?._id?.toString() || a.chit?.id?.toString() || '');
      const winnerId = a.winningMemberId?._id 
        ? a.winningMemberId._id.toString() 
        : (a.winningMemberId?.id || a.winningMemberId?.toString() || a.winningMember?._id?.toString() || a.winningMember?.id?.toString() || '');
      const isWinner = winnerId === currentUserId;

      // Filter by Chit Scheme
      if (auctionFilterChitId !== 'all' && aChitId !== auctionFilterChitId) {
        return false;
      }

      // Filter by Role
      if (auctionFilterRole === 'won' && !isWinner) return false;
      if (auctionFilterRole === 'dividend' && isWinner) return false;

      // Search Query
      if (auctionSearch.trim()) {
        const q = auctionSearch.toLowerCase().trim();
        const chitName = (a.chit?.name || a.chitId?.name || '').toLowerCase();
        const winnerName = (a.winningMember?.name || a.winningMemberId?.name || '').toLowerCase();
        const utr = (a.bankUtr || '').toLowerCase();
        const ticket = (a.winningTicket || '').toLowerCase();
        const match = chitName.includes(q) || winnerName.includes(q) || utr.includes(q) || ticket.includes(q) || String(a.monthNumber).includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [userRelevantAuctions, auctionFilterChitId, auctionFilterRole, auctionSearch, currentUserId]);

  const totalAuctionPages = Math.ceil(filteredAuctions.length / auctionPageSize) || 1;
  const paginatedAuctions = useMemo(() => {
    const start = (auctionCurrentPage - 1) * auctionPageSize;
    return filteredAuctions.slice(start, start + auctionPageSize);
  }, [filteredAuctions, auctionCurrentPage, auctionPageSize]);

  // Export Member Statement to PDF
  const exportStatementPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('en-GB');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INAVOLU CHIT FUNDS — Member Ledger Statement', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Member: ${user.name} | ID: ${user.memberId || 'N/A'} | Phone: ${user.phone || 'N/A'} | Email: ${user.email || 'N/A'}`, 14, 25);
    doc.text(`Enrolled Chits: ${totalEnrolledChits} | Total Months Paid: ${totalMonthsPaidAll} | Amount Cleared: Rs.${totalAmountPaidAll.toLocaleString()} | Due: Rs.${totalAmountDueAll.toLocaleString()}`, 14, 30);
    doc.text(`Statement Generated on: ${today}`, 14, 35);

    let startY = 42;

    enrichedChits.forEach((chit, idx) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${chit.name} (Value: Rs.${chit.chitValue.toLocaleString()} | EMI: Rs.${chit.monthlyContribution.toLocaleString()})`, 14, startY);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${chit.status.toUpperCase()} | Paid: ${chit.paidMonthsCount}/${chit.durationMonths} Mos | Due: ${chit.monthsDue} Mos | Paid: Rs.${chit.amountPaid.toLocaleString()} | Due: Rs.${chit.amountDue.toLocaleString()}`, 14, startY + 5);

      const tableRows = chit.monthLedger.map(item => [
        `${formatChitMonthYear(chit, item.monthNumber)} (M${item.monthNumber})`,
        `Rs.${item.expectedAmount.toLocaleString()}`,
        item.isPaid ? 'PAID' : (item.isPending ? 'PENDING' : 'DUE'),
        item.payment?.receiptNo || '—',
        item.payment?.transactionId || (item.isPaid ? 'Cash/Verified' : '—'),
        item.payment?.paymentDate || item.payment?.createdAt ? new Date(item.payment.paymentDate || item.payment.createdAt).toLocaleDateString('en-GB') : '—'
      ]);

      autoTable(doc, {
        startY: startY + 8,
        head: [['Month & Year', 'Amount', 'Status', 'Receipt No', 'Transaction ID / Mode', 'Paid Date']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [10, 30, 59], textColor: 255 },
        margin: { left: 14, right: 14 }
      });

      startY = doc.lastAutoTable.finalY + 12;
    });

    doc.save(`${(user.name || 'Member').replace(/ /g, '_')}_Statement_${today.replace(/\//g, '-')}.pdf`);
  };

  // Export Member Statement to Excel
  const exportStatementExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryRow = [{
      'Member Name': user.name,
      'Member ID': user.memberId || '',
      'Phone': user.phone || '',
      'Email': user.email || '',
      'Enrolled Chits': totalEnrolledChits,
      'Total Months Paid': totalMonthsPaidAll,
      'Total Months Due': totalMonthsDueAll,
      'Total Amount Paid (Rs)': totalAmountPaidAll,
      'Total Amount Due (Rs)': totalAmountDueAll,
      'Total Dividend Saved (Rs)': totalDividendSavedAll
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRow), 'Member Summary');

    // All payments sheet
    const paymentRows = payments.map((p, idx) => ({
      'S.No': idx + 1,
      'Date': p.paymentDate || p.createdAt ? new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') : '',
      'Receipt No': p.receiptNo || '',
      'Chit Scheme': p.chit?.name || p.chitId?.name || '',
      'Month': `Month ${p.monthNumber}`,
      'Amount (Rs)': p.amount,
      'Excess With Us (Rs)': p.excessAmount || 0,
      'Payment Mode': p.paymentMode || 'Cash',
      'Transaction Ref ID': p.transactionId || '',
      'Status': (p.status || 'PENDING').toUpperCase(),
      'Digital Signature': p.digitalSignature?.hash || ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), 'All Transactions');

    // Per Chit Sheets
    enrichedChits.forEach(chit => {
      const rows = chit.monthLedger.map(item => ({
        'Month & Year': `${formatChitMonthYear(chit, item.monthNumber)} (Month ${item.monthNumber})`,
        'Installment (Rs)': item.expectedAmount,
        'Status': item.isPaid ? 'PAID' : (item.isPending ? 'PENDING' : 'DUE'),
        'Receipt No': item.payment?.receiptNo || '',
        'Transaction ID': item.payment?.transactionId || '',
        'Paid Date': item.payment?.createdAt ? new Date(item.payment.createdAt).toLocaleDateString('en-GB') : ''
      }));
      const sheetName = chit.name.substring(0, 28).replace(/[\\/?*[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });

    XLSX.writeFile(wb, `${(user.name || 'Member').replace(/ /g, '_')}_Chit_Ledger.xlsx`);
  };

  if (loading) {
    return (
      <div style={{ padding: '6rem 1rem', textAlign: 'center', color: '#0a1e3b' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '4px solid #e2e8f0',
          borderTopColor: '#0a1e3b',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1.25rem auto'
        }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0a1e3b', margin: 0 }}>
          Loading Member Records...
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Retrieving profile, enrolled chit pools, KYC documents, and payment receipts.
        </p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div style={{ padding: '4rem 1rem', maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
          <AlertCircle size={32} color="#dc2626" />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Member Record Not Found</h3>
        <p style={{ color: '#64748b', margin: '0.5rem 0 1.5rem 0', fontSize: '0.92rem' }}>
          {error || 'Unable to locate details for this member in the system records.'}
        </p>
        <button
          onClick={() => navigate('/admin/all-users')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#0a1e3b',
            color: '#fff',
            border: 'none',
            padding: '0.7rem 1.4rem',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to All Users</span>
        </button>
      </div>
    );
  }

  const profileImg = getFullImgUrl(user.profileImgUrl);
  const aadharImg = getFullImgUrl(user.aadharImgUrl);
  const panImg = getFullImgUrl(user.panImgUrl);

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1720px', margin: '0 auto', boxSizing: 'border-box', padding: '1.25rem 2rem' }}>
      <style>{`
        @media (max-width: 1024px) {
          .admin-page-container {
            padding: 1rem 1.25rem !important;
          }
        }
        @media (max-width: 768px) {
          .admin-page-container {
            padding: 0.65rem 0.5rem !important;
          }
          .desktop-ledger-table-wrap,
          .desktop-auction-table-wrap {
            display: none !important;
          }
          .mobile-ledger-cards-wrap,
          .mobile-auction-cards-wrap {
            display: flex !important;
            flex-direction: column;
            gap: 0.85rem;
            padding: 0.85rem;
          }
          .admin-tabs-row {
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch;
          }
        }
        @media (min-width: 769px) {
          .desktop-ledger-table-wrap,
          .desktop-auction-table-wrap {
            display: block !important;
          }
          .mobile-ledger-cards-wrap,
          .mobile-auction-cards-wrap {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden file input for quick profile picture update */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Top Header & Breadcrumbs / Navigation Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => navigate('/admin/all-users')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              padding: '0.55rem 1.05rem',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
          >
            <ArrowLeft size={16} />
            <span>Back to Users</span>
          </button>

          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            <span>Admin</span> / <span>Records</span> / <strong style={{ color: '#0a1e3b' }}>{user.name}</strong>
          </div>
        </div>

        {/* Top Report Export Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={exportStatementPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.55rem 1.05rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
            }}
          >
            <Download size={14} />
            <span>Export PDF Statement</span>
          </button>
          <button
            onClick={exportStatementExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              padding: '0.55rem 1.05rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: '#eff6ff',
          border: '1.5px solid #93c5fd',
          color: '#1d4ed8',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle size={18} color="#2563eb" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Executive Member Profile Card with Profile Picture */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          border: '1.5px solid #e2e8f0',
          padding: '1.85rem',
          marginBottom: '1.75rem',
          boxShadow: '0 8px 30px rgba(10, 30, 59, 0.05)',
          position: 'relative'
        }}>
          {/* Main Profile Info Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.35rem', flexWrap: 'wrap' }}>
              {/* Profile Picture with Change Photo badge */}
              <div style={{ position: 'relative' }}>
                {profileImg ? (
                  <div
                    onClick={() => setLightboxData({ url: profileImg, title: `${user.name} · Profile Photo` })}
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid #0a1e3b',
                      boxShadow: '0 6px 16px rgba(10, 30, 59, 0.15)',
                      cursor: 'pointer',
                      backgroundColor: '#f1f5f9'
                    }}
                    title="Click to view full photo"
                  >
                    <img
                      src={profileImg}
                      alt={user.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0a1e3b 0%, #1e3a8a 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.85rem',
                    fontWeight: 900,
                    boxShadow: '0 6px 16px rgba(10, 30, 59, 0.2)',
                    letterSpacing: '1px'
                  }}>
                    {(user.name || 'User').substring(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Camera Overlay Icon to Trigger Photo Update */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  title="Upload / Change Profile Picture"
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#0a1e3b',
                    color: '#fbbf24',
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Camera size={14} />
                </button>
              </div>

              {/* Name, Badges, and Contact Metadata */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0a1e3b', margin: 0, letterSpacing: '-0.02em' }}>
                    {user.name}
                  </h2>
                  <span style={{
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '2rem',
                    border: '1px solid #bfdbfe'
                  }}>
                    Verified Member
                  </span>
                  {user.memberId && (
                    <span style={{
                      backgroundColor: '#f1f5f9',
                      color: '#0a1e3b',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontFamily: 'monospace'
                    }}>
                      ID: {user.memberId}
                    </span>
                  )}
                  {userWonAuctions.length > 0 && (
                    <span
                      onClick={() => setActiveTab('auctions')}
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        border: '1.5px solid #fde68a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.15)'
                      }}
                      title="Click to view won auctions"
                    >
                      <Trophy size={13} color="#b45309" />
                      <span>{userWonAuctions.length} Auction{userWonAuctions.length > 1 ? 's' : ''} Won (₹{totalWonPayout.toLocaleString()})</span>
                    </span>
                  )}
                </div>

                {/* Contact Chips with Copy and Action Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.55rem', flexWrap: 'wrap', fontSize: '0.84rem', color: '#475569' }}>
                  {user.phone && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={13} color="#2563eb" />
                      <strong>{user.phone}</strong>
                      <button
                        onClick={() => copyToClipboard(user.phone, 'phone')}
                        title="Copy Phone Number"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 0.15rem' }}
                      >
                        {copiedField === 'phone' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      </button>
                    </span>
                  )}
                  {user.whatsappNumber && (
                    <a
                      href={`https://wa.me/91${user.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open WhatsApp Direct Chat"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#16a34a',
                        textDecoration: 'none',
                        fontWeight: 700
                      }}
                    >
                      <span>💬 {user.whatsappNumber}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {user.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Mail size={13} color="#64748b" />
                      <span>{user.email}</span>
                      <button
                        onClick={() => copyToClipboard(user.email, 'email')}
                        title="Copy Email"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 0.15rem' }}
                      >
                        {copiedField === 'email' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      </button>
                    </span>
                  )}
                  {user.createdAt && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8' }}>
                      <Calendar size={13} />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString('en-GB')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons on Top Right */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleOpenEditUser}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '10px',
                  backgroundColor: '#0a1e3b',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(10, 30, 59, 0.2)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Edit3 size={14} color="#fbbf24" />
                <span>Edit Member Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocTypeToUpload('profile');
                  setDocFile(null);
                  setIsDocModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Camera size={14} color="#0a1e3b" />
                <span>Upload Photo / Docs</span>
              </button>
            </div>
          </div>

          {/* Three Categorized Executive Information Panels */}
          <div style={{
            marginTop: '1.65rem',
            paddingTop: '1.45rem',
            borderTop: '1.5px solid #f1f5f9',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '1.25rem'
          }}>

            {/* Panel 1: Personal & Address */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1.15rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#0a1e3b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <User size={15} color="#0a1e3b" />
                <span>Personal & Residential Details</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Member ID:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#0a1e3b' }}>{user.memberId || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>WhatsApp:</span>
                  <strong>{user.whatsappNumber || user.phone || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Gender / Age:</span>
                  <span>{user.gender || 'N/A'}{user.age ? ` · Age: ${user.age} yrs` : (user.dob ? ` · DOB: ${user.dob}` : '')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Occupation:</span>
                  <span>{user.occupation || 'N/A'}</span>
                </div>
                <div style={{ marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Permanent Address:</span>
                  <span style={{ fontWeight: 600 }}>{[user.address, user.city, user.state, user.pincode].filter(Boolean).join(', ') || 'N/A'}</span>
                </div>
                {user.remarks && (
                  <div style={{ fontSize: '0.76rem', color: '#b45309', marginTop: '0.2rem' }}>
                    <strong>Note:</strong> {user.remarks}
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Nominee Details */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1.15rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#0a1e3b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Users size={15} color="#0a1e3b" />
                <span>Nominee Details</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Nominee Name:</span>
                  <strong>{user.nomineeName || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Relationship:</span>
                  <span>{user.nomineeRelationship || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Mobile Number:</span>
                  <strong>{user.nomineePhone || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Type / DOB:</span>
                  <span>{user.nomineeType || 'Primary'} {user.nomineeDob ? `(${user.nomineeDob})` : ''}</span>
                </div>
                <div style={{ marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Nominee Address:</span>
                  <span style={{ fontWeight: 600 }}>{user.nomineeAddress || 'Same as member address'}</span>
                </div>
              </div>
            </div>

            {/* Panel 3: KYC & Guarantor Details with Document Buttons */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1.15rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#0a1e3b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Shield size={15} color="#0a1e3b" />
                <span>KYC & Document Proofs</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Aadhaar Number:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{user.aadharNumber || 'N/A'}</strong>
                  </div>
                  {aadharImg ? (
                    <button
                      type="button"
                      onClick={() => setLightboxData({ url: aadharImg, title: `${user.name} · Aadhaar Card` })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#0a1e3b',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={12} color="#2563eb" />
                      <span>View Aadhaar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDocTypeToUpload('aadhar');
                        setDocFile(null);
                        setIsDocModalOpen(true);
                      }}
                      style={{ fontSize: '0.72rem', color: '#2563eb', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Upload
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>PAN Number:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{user.panNumber || 'N/A'}</strong>
                  </div>
                  {panImg ? (
                    <button
                      type="button"
                      onClick={() => setLightboxData({ url: panImg, title: `${user.name} · PAN Card` })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#0a1e3b',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={12} color="#2563eb" />
                      <span>View PAN</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDocTypeToUpload('pan');
                        setDocFile(null);
                        setIsDocModalOpen(true);
                      }}
                      style={{ fontSize: '0.72rem', color: '#2563eb', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Upload
                    </button>
                  )}
                </div>

                <div style={{ marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Guarantor Required:</span>
                    <strong>{user.guarantorRequired || 'No'}</strong>
                  </div>
                  {user.guarantorRequired === 'Yes' && (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.8rem' }}>
                      <div>Guarantor: <strong>{user.guarantorName || 'N/A'}</strong> ({user.guarantorRelationship || 'N/A'})</div>
                      <div>Phone: {user.guarantorPhone || 'N/A'}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Aggregate KPI Metric Summary Cards */}
      <ScrollAnimationWrapper>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          {/* Card 1: Enrolled Chits */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(10, 30, 59, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Enrolled Chits
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a1e3b' }}>
                <Briefcase size={16} />
              </div>
            </div>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0a1e3b' }}>
              {totalEnrolledChits}
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
              Across {new Set(chits.map(c => c.chitId || c.id)).size} unique schemes
            </span>
          </div>

          {/* Card 2: Total Amount Paid */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(10, 30, 59, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Paid Amount
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <IndianRupee size={16} />
              </div>
            </div>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d' }}>
              ₹{totalAmountPaidAll.toLocaleString()}
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#15803d', display: 'block', marginTop: '0.2rem', fontWeight: 700 }}>
              {totalMonthsPaidAll} installments cleared
            </span>
          </div>

          {/* Card 3: Total Outstanding Due */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(10, 30, 59, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Outstanding Dues
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <Clock size={16} />
              </div>
            </div>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: totalAmountDueAll > 0 ? '#dc2626' : '#15803d' }}>
              ₹{totalAmountDueAll.toLocaleString()}
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#b45309', display: 'block', marginTop: '0.2rem', fontWeight: 700 }}>
              {totalMonthsDueAll} installments pending
            </span>
          </div>

          {/* Card 4: Dividend Savings via Auctions */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(10, 30, 59, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dividend Savings
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <Sparkles size={16} />
              </div>
            </div>
            <strong style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1d4ed8' }}>
              ₹{totalDividendSavedAll.toLocaleString()}
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#2563eb', display: 'block', marginTop: '0.2rem', fontWeight: 700 }}>
              Saved through auctions
            </span>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Main Tab Navigation: All Payments History vs Chit Schemes Breakdown */}
      <div className="admin-tabs-row" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.35rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'payments' ? '3px solid #0a1e3b' : '3px solid transparent',
            color: activeTab === 'payments' ? '#0a1e3b' : '#64748b',
            fontSize: '0.94rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <CreditCard size={17} color={activeTab === 'payments' ? '#0a1e3b' : '#64748b'} />
          <span>Payment History & Digital Receipts ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chits')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.35rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chits' ? '3px solid #0a1e3b' : '3px solid transparent',
            color: activeTab === 'chits' ? '#0a1e3b' : '#64748b',
            fontSize: '0.94rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Briefcase size={17} color={activeTab === 'chits' ? '#0a1e3b' : '#64748b'} />
          <span>Enrolled Chits & Monthly Schedule ({enrichedChits.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auctions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.35rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'auctions' ? '3px solid #0a1e3b' : '3px solid transparent',
            color: activeTab === 'auctions' ? '#0a1e3b' : '#64748b',
            fontSize: '0.94rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Gavel size={17} color={activeTab === 'auctions' ? '#0a1e3b' : '#64748b'} />
          <span>Auction History & Winnings ({userRelevantAuctions.length})</span>
          {userWonAuctions.length > 0 && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              border: '1px solid #fde68a'
            }}>
              🏆 {userWonAuctions.length} Won
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL PAYMENTS HISTORY & DIGITAL RECEIPTS LEDGER                      */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <ScrollAnimationWrapper>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(10, 30, 59, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Table Filter Controls Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0a1e3b', margin: 0 }}>
                    Official Payment & Digital Receipt Records
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                    Installment transaction ledger for {user.name}, with official PDF receipts, excess credit tracking, and uploaded proofs.
                  </p>
                </div>
                
                {/* Summary Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '2rem',
                    border: '1px solid #bfdbfe'
                  }}>
                    {filteredPayments.length} Transactions
                  </span>
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '2rem',
                    border: '1px solid #bbf7d0'
                  }}>
                    Total Paid: ₹{filteredPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Filters Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                {/* Search query */}
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search receipt no, txn ref, note..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter by Scheme */}
                <div>
                  <select
                    value={filterChitId}
                    onChange={(e) => { setFilterChitId(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Chit Schemes</option>
                    {chits.map(c => (
                      <option key={c.id} value={c.chitId || c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter by Payment Mode */}
                <div>
                  <select
                    value={filterMode}
                    onChange={(e) => { setFilterMode(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Payment Modes</option>
                    <option value="cash">💵 Cash (In-Hand)</option>
                    <option value="upi">📱 UPI / Online</option>
                    <option value="bank">🏦 Bank Transfer</option>
                  </select>
                </div>

                {/* Filter by Status */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">✅ Paid (Approved)</option>
                    <option value="pending">⏳ Pending Verification</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {filteredPayments.length === 0 ? (
              <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                <CreditCard size={40} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155' }}>No Payment Records Found</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {searchQuery || filterChitId !== 'all' || filterMode !== 'all' || filterStatus !== 'all'
                    ? 'No payments match your selected search filters.'
                    : 'This member has not made any installment payments yet.'}
                </p>
                {(searchQuery || filterChitId !== 'all' || filterMode !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilterChitId('all'); setFilterMode('all'); setFilterStatus('all'); }}
                    style={{
                      marginTop: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.45rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#0a1e3b',
                      cursor: 'pointer'
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View (> 768px) */}
                <div className="desktop-ledger-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0a1e3b', color: '#ffffff' }}>
                      <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '14%' }}>
                        # & Date
                      </th>
                      <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '21%' }}>
                        Chit Scheme & Installment
                      </th>
                      <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '22%' }}>
                        Amount & Excess with Us
                      </th>
                      <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '17%' }}>
                        Txn Ref / Mode
                      </th>
                      <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '15%' }}>
                        Receipt & Proof
                      </th>
                      <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', width: '11%' }}>
                        Status / Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((p, idx) => {
                      const serial = (currentPage - 1) * pageSize + idx + 1;
                      const dateVal = p.paymentDate || p.createdAt;
                      const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                      const formattedTime = dateVal ? new Date(dateVal).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                      const chitName = p.chit?.name || p.chitId?.name || 'Chit Scheme';
                      const proofUrl = getFullImgUrl(p.proofImgUrl);
                      const hasUploadedProof = Boolean(proofUrl && p.proofImgUrl !== 'MANUAL_ENTRY' && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY');
                      const hasReceipt = Boolean(p.receiptNo);
                      const isOnline = String(p.paymentMode || '').toLowerCase().includes('online') || String(p.paymentMode || '').toLowerCase().includes('upi');
                      const excessVal = getPaymentExcess(p);

                      return (
                        <tr
                          key={p.id || p._id || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {/* Column 1: # & Date */}
                          <td style={{ padding: '0.95rem 1rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem', minWidth: '20px' }}>
                                #{serial}
                              </span>
                              <div>
                                <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
                                  {formattedDate}
                                </strong>
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                  {formattedTime}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Chit Scheme & Installment */}
                          <td style={{ padding: '0.95rem 1rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                              <strong style={{ color: '#0a1e3b', fontSize: '0.9rem' }}>
                                {chitName}
                              </strong>
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#475569',
                                backgroundColor: '#f1f5f9',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}>
                                Slot {p.slotNumber || 1}
                              </span>
                            </div>
                            <div>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '6px',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                border: '1px solid #bfdbfe'
                              }}>
                                Month {p.monthNumber} Installment
                              </span>
                            </div>
                          </td>

                          {/* Column 3: Amount Paid & Excess with Us */}
                          <td style={{ padding: '0.95rem 1rem', verticalAlign: 'middle' }}>
                            <div>
                              <span style={{ fontSize: '1.02rem', fontWeight: 900, color: '#15803d', display: 'block', letterSpacing: '-0.01em' }}>
                                ₹{Number(p.amount || 0).toLocaleString()}
                              </span>
                              {excessVal > 0 ? (
                                <div style={{ marginTop: '0.2rem' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '4px',
                                    backgroundColor: '#dcfce7',
                                    color: '#15803d',
                                    fontWeight: 900,
                                    fontSize: '0.76rem',
                                    border: '1px solid #86efac'
                                  }}>
                                    +₹{excessVal.toLocaleString()} Excess with Us
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Exact Due Cleared
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Column 4: Txn Ref / Mode */}
                          <td style={{ padding: '0.95rem 1rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: isOnline ? '#eff6ff' : '#f1f5f9',
                                color: isOnline ? '#1d4ed8' : '#334155',
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}>
                                {p.paymentMode || 'Cash'}
                              </span>
                              {p.transactionId && p.transactionId !== 'OFFLINE' && (
                                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                                  {p.transactionId}
                                </span>
                              )}
                            </div>
                            {p.remarks && (
                              <div style={{ fontSize: '0.7rem', color: '#d97706', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.remarks}>
                                💬 {p.remarks}
                              </div>
                            )}
                          </td>

                          {/* Column 5: Official Receipt & Proof */}
                          <td style={{ padding: '0.95rem 1rem', verticalAlign: 'middle' }}>
                            {hasReceipt ? (
                              <div style={{ marginBottom: '0.3rem' }}>
                                <Link
                                  to={`/receipt/${p.receiptNo}`}
                                  target="_blank"
                                  title="Open Official Branded Digital Receipt"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    backgroundColor: '#0a1e3b',
                                    color: '#ffffff',
                                    padding: '0.22rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                    textDecoration: 'none'
                                  }}
                                >
                                  <Receipt size={12} color="#fbbf24" />
                                  <span>{p.receiptNo}</span>
                                  <ExternalLink size={10} />
                                </Link>
                                {p.digitalSignature?.hash && (
                                  <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <ShieldCheck size={11} />
                                    <span>Verified & Signed</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.2rem' }}>
                                Pending Receipt
                              </div>
                            )}

                            {/* Uploaded proof badge */}
                            {hasUploadedProof ? (
                              <button
                                type="button"
                                onClick={() => setLightboxData({ url: proofUrl, title: `${user.name} · Uploaded Proof (Month ${p.monthNumber})` })}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '5px',
                                  border: '1px solid #bfdbfe',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={11} />
                                <span>Uploaded Proof</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                No uploaded slip
                              </span>
                            )}
                          </td>

                          {/* Column 6: Status & Actions */}
                          <td style={{ padding: '0.95rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '2rem',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                backgroundColor: p.status === 'approved' ? '#dcfce7' : p.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                color: p.status === 'approved' ? '#15803d' : p.status === 'rejected' ? '#b91c1c' : '#b45309',
                                border: `1px solid ${p.status === 'approved' ? '#86efac' : p.status === 'rejected' ? '#fca5a5' : '#fde68a'}`
                              }}>
                                {p.status === 'approved' ? '✅ Paid' : p.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                              </span>

                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                {hasReceipt && (
                                  <button
                                    type="button"
                                    onClick={() => setViewReceiptData({
                                      payment: p,
                                      chit: p.chit || p.chitId,
                                      user: user,
                                      extraData: {
                                        chitName: chitName,
                                        monthNumber: p.monthNumber,
                                        ticketId: `MEMBER-${p.slotNumber || 1}`
                                      }
                                    })}
                                    title="View & Print Official Digital Receipt"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '8px',
                                      border: '1.5px solid #cbd5e1',
                                      backgroundColor: '#ffffff',
                                      color: '#0a1e3b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Receipt size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsUnpaid(p.id || p._id, p.monthNumber)}
                                  title="Reset / Delete Payment"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #fecaca',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (<= 768px) */}
              <div className="mobile-ledger-cards-wrap">
                {paginatedPayments.map((p, idx) => {
                  const serial = (currentPage - 1) * pageSize + idx + 1;
                  const dateVal = p.paymentDate || p.createdAt;
                  const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                  const formattedTime = dateVal ? new Date(dateVal).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                  const chitName = p.chit?.name || p.chitId?.name || 'Chit Scheme';
                  const proofUrl = getFullImgUrl(p.proofImgUrl);
                  const hasUploadedProof = Boolean(proofUrl && p.proofImgUrl !== 'MANUAL_ENTRY' && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY');
                  const hasReceipt = Boolean(p.receiptNo);
                  const isOnline = String(p.paymentMode || '').toLowerCase().includes('online') || String(p.paymentMode || '').toLowerCase().includes('upi');
                  const excessVal = getPaymentExcess(p);

                  return (
                    <div
                      key={p.id || p._id || idx}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        padding: '1rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Top row: Serial + Date & Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>#{serial}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0a1e3b' }}>{formattedDate}</span>
                          {formattedTime && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formattedTime}</span>}
                        </div>
                        <div>
                          {p.status === 'approved' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                              <Check size={11} /> Paid
                            </span>
                          )}
                          {p.status === 'pending' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                              <Clock size={11} /> Pending
                            </span>
                          )}
                          {p.status === 'rejected' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                              <X size={11} /> Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Scheme & Installment */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0a1e3b' }}>
                          {chitName} {p.slotNumber ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>(Slot {p.slotNumber})</span> : ''}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                          Month {p.monthNumber} Installment
                        </span>
                      </div>

                      {/* Amount & Excess */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Amount Paid</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>
                            ₹{Number(p.amount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {excessVal > 0 ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              +₹{excessVal.toLocaleString()} Excess with Us
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                              Exact Due Cleared
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Txn Details & Receipt */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: isOnline ? '#eff6ff' : '#f1f5f9', color: isOnline ? '#1d4ed8' : '#334155' }}>
                            {p.paymentMode || 'Cash'}
                          </span>
                          <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                            {p.transactionId ? (p.transactionId.length > 16 ? `${p.transactionId.substring(0, 14)}...` : p.transactionId) : 'N/A'}
                          </span>
                        </div>

                        {hasReceipt ? (
                          <button
                            type="button"
                            onClick={() => setViewReceiptData({
                              receiptNo: p.receiptNo,
                              chitName,
                              monthNumber: p.monthNumber,
                              amount: p.amount,
                              paymentMode: p.paymentMode,
                              transactionId: p.transactionId,
                              paymentDate: dateVal,
                              userName: user.name,
                              userPhone: user.phone,
                              userAddress: user.address,
                              chitId: p.chitId?._id || p.chitId?.id || p.chitId,
                              userId: user._id || user.id
                            })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#0a1e3b', color: '#fbbf24', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                          >
                            <Receipt size={12} /> {p.receiptNo} <ExternalLink size={10} />
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>Pending Receipt</span>
                        )}
                      </div>

                      {/* Proof & Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
                        <div>
                          {hasUploadedProof ? (
                            <button
                              type="button"
                              onClick={() => setLightboxData({ url: proofUrl, title: `Payment Proof · ${chitName} · Month ${p.monthNumber}` })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', color: '#0a1e3b', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              <Eye size={12} /> View Slip
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No uploaded slip</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {hasReceipt && (
                            <button
                              type="button"
                              onClick={() => setViewReceiptData({
                                receiptNo: p.receiptNo,
                                chitName,
                                monthNumber: p.monthNumber,
                                amount: p.amount,
                                paymentMode: p.paymentMode,
                                transactionId: p.transactionId,
                                paymentDate: dateVal,
                                userName: user.name,
                                userPhone: user.phone,
                                userAddress: user.address,
                                chitId: p.chitId?._id || p.chitId?.id || p.chitId,
                                userId: user._id || user.id
                              })}
                              title="Print Receipt"
                              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0a1e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Receipt size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMarkAsUnpaid(p.id || p._id, p.monthNumber)}
                            title="Delete Payment"
                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination Bar - Always visible when records exist */}
          {filteredPayments.length > 0 && (
            <div style={{
              padding: '0.9rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderTop: '1.5px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Left Side: Summary text & Page Size Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                  Showing <strong style={{ color: '#0a1e3b' }}>{Math.min((currentPage - 1) * pageSize + 1, filteredPayments.length)}</strong> to <strong style={{ color: '#0a1e3b' }}>{Math.min(currentPage * pageSize, filteredPayments.length)}</strong> of <strong style={{ color: '#0a1e3b' }}>{filteredPayments.length}</strong> records
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: '#0a1e3b',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Right Side: Pagination Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage === 1 ? '#94a3b8' : '#0a1e3b',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0 0.65rem',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage === 1 ? '#94a3b8' : '#0a1e3b',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {/* Numbered Page Buttons with Ellipsis */}
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(pNum => {
                      if (totalPages <= 7) return true;
                      if (pNum === 1 || pNum === totalPages) return true;
                      if (Math.abs(pNum - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce((acc, pNum, index, arr) => {
                      if (index > 0 && pNum - arr[index - 1] > 1) {
                        acc.push(`ellipsis-${pNum}`);
                      }
                      acc.push(pNum);
                      return acc;
                    }, [])
                    .map((item) => {
                      if (typeof item === 'string') {
                        return <span key={item} style={{ padding: '0 0.3rem', color: '#94a3b8', fontWeight: 700 }}>...</span>;
                      }
                      const isCurrent = item === currentPage;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            padding: '0 0.45rem',
                            borderRadius: '8px',
                            border: isCurrent ? '2px solid #0a1e3b' : '1.5px solid #cbd5e1',
                            backgroundColor: isCurrent ? '#0a1e3b' : '#ffffff',
                            color: isCurrent ? '#ffffff' : '#334155',
                            fontWeight: isCurrent ? 800 : 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: isCurrent ? '0 2px 6px rgba(10,30,59,0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0 0.65rem',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    color: currentPage === totalPages ? '#94a3b8' : '#0a1e3b',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                  title="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    color: currentPage === totalPages ? '#94a3b8' : '#0a1e3b',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
          </div>
        </ScrollAnimationWrapper>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ENROLLED CHIT SCHEMES & MONTHLY INSTALLMENT SCHEDULE               */}
      {/* ========================================================================= */}
      {activeTab === 'chits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {enrichedChits.length === 0 ? (
            <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '4rem 1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
              <Briefcase size={40} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#374151' }}>No Enrolled Chits Found</h4>
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>This member is not enrolled in any chit schemes.</p>
            </div>
          ) : (
            <>
              {/* Chit Scheme Selector Cards */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0a1e3b' }}>
                    Select Chit Pool Scheme:
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Viewing: <strong style={{ color: '#0a1e3b' }}>{activeChit?.name}</strong>
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {enrichedChits.map((c) => {
                    const isSelected = c.id === activeChit?.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedChitId(c.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          textAlign: 'left',
                          padding: '1.15rem 1.25rem',
                          borderRadius: '14px',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '2.5px solid #0a1e3b' : '1.5px solid #e2e8f0',
                          boxShadow: isSelected ? '0 6px 20px rgba(10, 30, 59, 0.1)' : '0 2px 6px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.4rem' }}>
                          <span style={{
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: isSelected ? '#0a1e3b' : '#0f172a'
                          }}>
                            {c.name}
                          </span>
                          {isSelected ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: '#0a1e3b',
                              color: '#fff',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px'
                            }}>
                              <Check size={12} />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px'
                            }}>
                              Click to View
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem' }}>
                          <span>Pool: <strong style={{ color: '#0a1e3b' }}>₹{Number(c.chitValue || 0).toLocaleString()}</strong></span>
                          <span>EMI: <strong style={{ color: '#0a1e3b' }}>₹{Number(c.monthlyContribution || 0).toLocaleString()}/mo</strong></span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px'
                          }}>
                            {c.paidMonthsCount}/{c.durationMonths} Mos Paid
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: c.monthsDue > 0 ? '#fef3c7' : '#f1f5f9',
                            color: c.monthsDue > 0 ? '#b45309' : '#64748b',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px'
                          }}>
                            {c.monthsDue} Mos Due
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Chit Scheme Details & Monthly Installment Table */}
              {activeChit && (
                <ScrollAnimationWrapper key={activeChit.id}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1.25rem',
                    border: '1.5px solid #e2e8f0',
                    padding: '1.75rem',
                    boxShadow: '0 8px 30px rgba(10, 30, 59, 0.04)'
                  }}>
                    {/* Chit Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0a1e3b', margin: 0 }}>
                            {activeChit.name}
                          </h4>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '2rem',
                            border: '1px solid #bfdbfe'
                          }}>
                            {activeChit.status === 'active' ? `Active (Month ${activeChit.currentMonth || 1}/${activeChit.durationMonths})` : activeChit.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                          {activeChit.termsAndConditions || 'Standard InaVolu Chit Pool Scheme'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ backgroundColor: '#f0fdf4', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>
                          Cleared: <strong>{activeChit.paidMonthsCount} of {activeChit.durationMonths} Mos</strong>
                        </div>
                        <div style={{ backgroundColor: '#fffbeb', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#b45309', fontWeight: 700 }}>
                          Due: <strong>{activeChit.monthsDue} Mos</strong>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginBottom: '0.4rem' }}>
                        <span>Scheme Progress ({activeChit.paidMonthsCount}/{activeChit.durationMonths} Months)</span>
                        <strong style={{ color: activeChit.percentPaid === 100 ? '#16a34a' : '#0a1e3b' }}>
                          {activeChit.percentPaid}% Cleared
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${activeChit.percentPaid}%`,
                          height: '100%',
                          backgroundColor: activeChit.percentPaid === 100 ? '#16a34a' : '#0a1e3b',
                          borderRadius: '9999px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    {/* Installments Table */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.85rem' }}>
                        <h5 style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0a1e3b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={16} color="#0a1e3b" />
                          <span>Monthly Payment Schedule & Status ({activeChit.name})</span>
                        </h5>

                        <button
                          type="button"
                          onClick={() => setShowAllMonths(prev => !prev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            backgroundColor: showAllMonths ? '#eff6ff' : '#ffffff',
                            color: showAllMonths ? '#1d4ed8' : '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          {showAllMonths ? `Showing All ${activeChit.durationMonths} Mos` : `Preview All ${activeChit.durationMonths} Months`}
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                        <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                              <th style={{ padding: '0.75rem 1rem' }}>Month</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Expected EMI</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Payment Status</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Receipt No</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Txn Ref / Proof</th>
                              <th style={{ padding: '0.75rem 1rem' }}>Date Paid</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Admin Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rowsToDisplay = showAllMonths ? activeChit.fullMonthLedger : activeChit.monthLedger;

                              if (rowsToDisplay.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                                      <Clock size={28} color="#d97706" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                                      <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>No Auctions Conducted Yet</strong>
                                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                        Monthly payment installments will appear after the Month 1 auction is completed.
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }

                              return rowsToDisplay.map((row) => {
                                const isRowLocked = !row.isUnlocked;
                                const payment = row.payment;
                                const proofUrl = payment?.proofImgUrl ? getFullImgUrl(payment.proofImgUrl) : null;
                                const hasProof = Boolean(proofUrl && payment?.proofImgUrl !== 'MANUAL_ENTRY' && payment?.proofImgUrl !== 'MANUAL_ADMIN_ENTRY');

                                return (
                                  <tr
                                    key={row.monthNumber}
                                    style={{
                                      borderBottom: '1px solid #f1f5f9',
                                      backgroundColor: isRowLocked
                                        ? '#fbfbfb'
                                        : (row.isPaid ? '#ffffff' : (row.isPending ? '#fffbeb' : '#fafafa')),
                                      opacity: isRowLocked ? 0.65 : 1
                                    }}
                                  >
                                    {/* Month */}
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isRowLocked ? '#64748b' : '#0a1e3b' }}>
                                        {formatChitMonthYear(activeChit, row.monthNumber)}
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                        Month {row.monthNumber}
                                      </div>
                                    </td>

                                    {/* Expected Amount & Dividend */}
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      <strong style={{ color: '#0a1e3b' }}>
                                        ₹{row.expectedAmount.toLocaleString()}
                                      </strong>
                                      {row.dividend > 0 && (
                                        <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>
                                          (₹{row.dividend.toLocaleString()} dividend saved)
                                        </div>
                                      )}
                                    </td>

                                    {/* Payment Status */}
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      {row.isPaid ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          padding: '0.2rem 0.55rem',
                                          borderRadius: '2rem',
                                          backgroundColor: '#dcfce7',
                                          color: '#15803d',
                                          fontSize: '0.74rem',
                                          fontWeight: 800
                                        }}>
                                          <CheckCircle size={11} /> Paid
                                        </span>
                                      ) : row.isPending ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          padding: '0.2rem 0.55rem',
                                          borderRadius: '2rem',
                                          backgroundColor: '#fef3c7',
                                          color: '#b45309',
                                          fontSize: '0.74rem',
                                          fontWeight: 800
                                        }}>
                                          <Clock size={11} /> Pending
                                        </span>
                                      ) : (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          padding: '0.2rem 0.55rem',
                                          borderRadius: '2rem',
                                          backgroundColor: '#fee2e2',
                                          color: '#dc2626',
                                          fontSize: '0.74rem',
                                          fontWeight: 800
                                        }}>
                                          Due
                                        </span>
                                      )}
                                    </td>

                                    {/* Receipt No */}
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      {payment?.receiptNo ? (
                                        <Link
                                          to={`/receipt/${payment.receiptNo}`}
                                          target="_blank"
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            backgroundColor: '#0a1e3b',
                                            color: '#ffffff',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '6px',
                                            fontSize: '0.72rem',
                                            fontFamily: 'monospace',
                                            fontWeight: 800,
                                            textDecoration: 'none'
                                          }}
                                        >
                                          <Receipt size={11} color="#fbbf24" />
                                          <span>{payment.receiptNo}</span>
                                        </Link>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                      )}
                                    </td>

                                    {/* Txn Ref & Proof */}
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
                                          {payment?.transactionId || (row.isPaid ? 'Cash' : '—')}
                                        </span>
                                        {hasProof && (
                                          <button
                                            type="button"
                                            onClick={() => setLightboxData({ url: proofUrl, title: `${user.name} · Month ${row.monthNumber} Proof` })}
                                            style={{
                                              padding: '0.2rem 0.4rem',
                                              borderRadius: '4px',
                                              backgroundColor: '#0a1e3b',
                                              color: '#fff',
                                              border: 'none',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center'
                                            }}
                                            title="View Uploaded Payment Proof"
                                          >
                                            <Eye size={10} color="#fbbf24" />
                                          </button>
                                        )}
                                      </div>
                                    </td>

                                    {/* Paid Date */}
                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#64748b' }}>
                                      {payment?.paymentDate || payment?.createdAt
                                        ? new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('en-GB')
                                        : '—'}
                                    </td>

                                    {/* Admin Action */}
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                      {row.isPaid ? (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkAsUnpaid(payment?.id || payment?._id, row.monthNumber)}
                                          style={{
                                            fontSize: '0.72rem',
                                            color: '#dc2626',
                                            backgroundColor: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            padding: '0.25rem 0.6rem',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Reset Unpaid
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setUploadModal({
                                              isOpen: true,
                                              chitId: activeChit.chitId || activeChit.id,
                                              slotNumber: activeChit.slotNumber || 1,
                                              chitName: activeChit.name,
                                              amount: row.expectedAmount,
                                              monthNumber: row.monthNumber
                                            });
                                          }}
                                          style={{
                                            fontSize: '0.72rem',
                                            color: '#ffffff',
                                            backgroundColor: '#0a1e3b',
                                            border: 'none',
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '6px',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Mark Paid
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </ScrollAnimationWrapper>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEMBER AUCTION HISTORY & BIDDING RECORDS                          */}
      {/* ========================================================================= */}
      {activeTab === 'auctions' && (
        <ScrollAnimationWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* KPI Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem'
            }}>
              {/* Card 1: Auctions Won */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1.25rem',
                border: '1.5px solid #fde68a',
                padding: '1.35rem 1.5rem',
                boxShadow: '0 4px 20px rgba(217, 119, 6, 0.08)',
                background: 'linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  backgroundColor: '#fef3c7',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Trophy size={26} color="#b45309" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Auctions Won (Prize Claimed)
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0a1e3b', margin: '0.2rem 0' }}>
                    ₹{totalWonPayout.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {userWonAuctions.length} Auction{userWonAuctions.length === 1 ? '' : 's'} won by {user.name}
                  </span>
                </div>
              </div>

              {/* Card 2: Dividends Benefited */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1.25rem',
                border: '1.5px solid #bbf7d0',
                padding: '1.35rem 1.5rem',
                boxShadow: '0 4px 20px rgba(22, 163, 74, 0.08)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  backgroundColor: '#dcfce7',
                  border: '1.5px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Sparkles size={26} color="#15803d" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Total Dividends Benefited
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0a1e3b', margin: '0.2rem 0' }}>
                    ₹{totalDividendSavedAll.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Savings earned across monthly auctions
                  </span>
                </div>
              </div>

              {/* Card 3: Total Enrolled Auctions */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1.25rem',
                border: '1.5px solid #cbd5e1',
                padding: '1.35rem 1.5rem',
                boxShadow: '0 4px 20px rgba(10, 30, 59, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.2rem'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Gavel size={26} color="#1d4ed8" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Enrolled Scheme Auctions
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0a1e3b', margin: '0.2rem 0' }}>
                    {userRelevantAuctions.length} Auctions
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Recorded across member's chit pools
                  </span>
                </div>
              </div>
            </div>

            {/* Auction Records Table Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 8px 30px rgba(10, 30, 59, 0.04)',
              overflow: 'hidden'
            }}>
              {/* Header & Filters */}
              <div style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1.5px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0a1e3b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Gavel size={20} color="#0a1e3b" />
                      <span>Official Auction History & Prize Distribution Records</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                      Monthly auction bidding records, prize payouts claimed by {user.name}, and dividend distributions across enrolled chit pools.
                    </p>
                  </div>

                  {/* Summary Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '2rem',
                      border: '1px solid #bfdbfe'
                    }}>
                      {filteredAuctions.length} Auctions Recorded
                    </span>
                    {userWonAuctions.length > 0 && (
                      <span style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '2rem',
                        border: '1px solid #fde68a'
                      }}>
                        🏆 {userWonAuctions.length} Won by {user.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}>
                  {/* Search query */}
                  <div style={{ position: 'relative' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search scheme, winner, UTR, month..."
                      value={auctionSearch}
                      onChange={(e) => { setAuctionSearch(e.target.value); setAuctionCurrentPage(1); }}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                    {auctionSearch && (
                      <button
                        onClick={() => setAuctionSearch('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter by Role */}
                  <div>
                    <select
                      value={auctionFilterRole}
                      onChange={(e) => { setAuctionFilterRole(e.target.value); setAuctionCurrentPage(1); }}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Auctions ({userRelevantAuctions.length})</option>
                      <option value="won">🏆 Only Won by {user.name} ({userWonAuctions.length})</option>
                      <option value="dividend">💰 Dividend Beneficiary ({userRelevantAuctions.length - userWonAuctions.length})</option>
                    </select>
                  </div>

                  {/* Filter by Scheme */}
                  <div>
                    <select
                      value={auctionFilterChitId}
                      onChange={(e) => { setAuctionFilterChitId(e.target.value); setAuctionCurrentPage(1); }}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Chit Schemes</option>
                      {enrichedChits.map(c => (
                        <option key={c.id || c.chitId} value={c.id || c.chitId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Body */}
              {filteredAuctions.length === 0 ? (
                <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                  <Gavel size={40} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155' }}>No Auction Records Found</h4>
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {auctionSearch || auctionFilterRole !== 'all' || auctionFilterChitId !== 'all'
                      ? 'No auctions match your selected search filters.'
                      : 'No auctions have been recorded for this member’s chit schemes yet.'}
                  </p>
                  {(auctionSearch || auctionFilterRole !== 'all' || auctionFilterChitId !== 'all') && (
                    <button
                      onClick={() => { setAuctionSearch(''); setAuctionFilterRole('all'); setAuctionFilterChitId('all'); }}
                      style={{
                        marginTop: '0.75rem',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.45rem 1rem',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: '#0a1e3b',
                        cursor: 'pointer'
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table View (> 768px) */}
                  <div className="desktop-auction-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0a1e3b', color: '#ffffff' }}>
                          <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '13%' }}>
                            # & Date
                          </th>
                          <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '20%' }}>
                            Chit Scheme
                          </th>
                          <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '22%' }}>
                            Month & Winner Status
                          </th>
                          <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '19%' }}>
                            Prize Payout / Discount
                          </th>
                          <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '14%' }}>
                            Dividend & Next Due
                          </th>
                          <th style={{ padding: '0.9rem 1rem', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', width: '12%' }}>
                            Payout & Proof
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAuctions.map((a, idx) => {
                          const serial = (auctionCurrentPage - 1) * auctionPageSize + idx + 1;
                          const dateVal = a.auctionDate || a.createdAt;
                          const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                          const chitName = a.chit?.name || a.chitId?.name || 'Chit Scheme';
                          const chitPoolVal = Number(a.chit?.chitValue || a.chitId?.chitValue || 0);
                          const winnerId = a.winningMemberId?._id 
                            ? a.winningMemberId._id.toString() 
                            : (a.winningMemberId?.id || a.winningMemberId?.toString() || a.winningMember?._id?.toString() || a.winningMember?.id?.toString() || '');
                          const isWinner = winnerId === currentUserId;
                          const winnerObj = a.winningMember || a.winningMemberId || {};
                          const payoutAmt = Number(a.winnerPayout || a.auctionAmount || 0);
                          const discountAmt = Number(a.winningBidDiscount || 0);
                          const dividendAmt = Number(a.dividendPerMember || 0);
                          const nextPayable = Number(a.nextPayableAmount || 0);
                          const proofUrl = getFullImgUrl(a.receiptUrl);

                          return (
                            <tr
                              key={a.id || a._id || idx}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isWinner ? '#fffbeb' : '#ffffff',
                                borderLeft: isWinner ? '4px solid #f59e0b' : '4px solid transparent',
                                transition: 'background-color 0.15s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isWinner ? '#fef3c7' : '#f8fafc'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isWinner ? '#fffbeb' : '#ffffff'; }}
                            >
                              {/* # & Date */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>#{serial}</span>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0a1e3b' }}>{formattedDate}</div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Month {a.monthNumber}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Chit Scheme */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 800, color: '#0a1e3b', fontSize: '0.88rem' }}>{chitName}</div>
                                {chitPoolVal > 0 && (
                                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                    Pool: <strong>₹{chitPoolVal.toLocaleString()}</strong>
                                  </span>
                                )}
                              </td>

                              {/* Month & Winner Status */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                {isWinner ? (
                                  <div>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      backgroundColor: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      padding: '0.25rem 0.65rem',
                                      borderRadius: '6px',
                                      fontSize: '0.76rem',
                                      fontWeight: 800
                                    }}>
                                      <Trophy size={13} color="#b45309" />
                                      <span>WINNER (Claimed Prize)</span>
                                    </span>
                                    {a.winningTicket && (
                                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                                        Ticket: {a.winningTicket}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      backgroundColor: '#f0fdf4',
                                      color: '#166534',
                                      border: '1px solid #bbf7d0',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700
                                    }}>
                                      <span>💰 Dividend Beneficiary</span>
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                                      Winner: <strong>{winnerObj.name || 'Member'}</strong> {winnerObj.memberId ? `(${winnerObj.memberId})` : ''}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Prize Payout / Discount */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isWinner ? '#b45309' : '#0a1e3b' }}>
                                  ₹{payoutAmt.toLocaleString()}
                                </div>
                                {discountAmt > 0 && (
                                  <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 600 }}>
                                    ₹{discountAmt.toLocaleString()} bid discount
                                  </span>
                                )}
                              </td>

                              {/* Dividend & Next Due */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                {dividendAmt > 0 ? (
                                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#16a34a' }}>
                                    +₹{dividendAmt.toLocaleString()}/mbr
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No dividend</div>
                                )}
                                {nextPayable > 0 && (
                                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                    Next: ₹{nextPayable.toLocaleString()}
                                  </span>
                                )}
                              </td>

                              {/* Payout & Proof */}
                              <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                  {a.payoutMethod || 'Bank Transfer'}
                                </div>
                                {a.bankUtr && (
                                  <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b' }}>
                                    UTR: {a.bankUtr}
                                  </div>
                                )}
                                {proofUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxData({ url: proofUrl, title: `Auction Receipt · ${chitName} · Month ${a.monthNumber}` })}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      marginTop: '0.25rem',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      backgroundColor: '#ffffff',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: '#0a1e3b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Eye size={11} /> Proof
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (<= 768px) */}
                  <div className="mobile-auction-cards-wrap">
                    {paginatedAuctions.map((a, idx) => {
                      const serial = (auctionCurrentPage - 1) * auctionPageSize + idx + 1;
                      const dateVal = a.auctionDate || a.createdAt;
                      const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                      const chitName = a.chit?.name || a.chitId?.name || 'Chit Scheme';
                      const winnerId = a.winningMemberId?._id 
                        ? a.winningMemberId._id.toString() 
                        : (a.winningMemberId?.id || a.winningMemberId?.toString() || a.winningMember?._id?.toString() || a.winningMember?.id?.toString() || '');
                      const isWinner = winnerId === currentUserId;
                      const winnerObj = a.winningMember || a.winningMemberId || {};
                      const payoutAmt = Number(a.winnerPayout || a.auctionAmount || 0);
                      const discountAmt = Number(a.winningBidDiscount || 0);
                      const dividendAmt = Number(a.dividendPerMember || 0);
                      const proofUrl = getFullImgUrl(a.receiptUrl);

                      return (
                        <div
                          key={a.id || a._id || idx}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: isWinner ? '1.5px solid #fde68a' : '1.5px solid #e2e8f0',
                            padding: '1rem',
                            boxShadow: isWinner ? '0 4px 14px rgba(217, 119, 6, 0.1)' : '0 2px 8px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>#{serial}</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0a1e3b' }}>{formattedDate}</span>
                              <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 800 }}>Month {a.monthNumber}</span>
                            </div>
                            <div>
                              {isWinner ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                                  <Trophy size={11} color="#b45309" /> WINNER
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f0fdf4', color: '#166534', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                                  💰 Beneficiary
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0a1e3b' }}>{chitName}</span>
                            {!isWinner && (
                              <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                                Winner: <strong>{winnerObj.name || 'Member'}</strong>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Prize Payout</span>
                              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: isWinner ? '#b45309' : '#0a1e3b' }}>
                                ₹{payoutAmt.toLocaleString()}
                              </span>
                              {discountAmt > 0 && (
                                <span style={{ fontSize: '0.72rem', color: '#d97706', display: 'block' }}>
                                  ₹{discountAmt.toLocaleString()} bid discount
                                </span>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Dividend Per Member</span>
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>
                                +₹{dividendAmt.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
                            <div>
                              <span>{a.payoutMethod || 'Bank Transfer'}</span>
                              {a.bankUtr && <span style={{ fontFamily: 'monospace', color: '#64748b', marginLeft: '0.4rem' }}>UTR: {a.bankUtr}</span>}
                            </div>
                            {proofUrl && (
                              <button
                                type="button"
                                onClick={() => setLightboxData({ url: proofUrl, title: `Auction Receipt · ${chitName} · Month ${a.monthNumber}` })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                <Eye size={12} /> View Slip
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Pagination Bar - Always visible when auctions exist */}
              {filteredAuctions.length > 0 && (
                <div style={{
                  padding: '0.9rem 1.5rem',
                  backgroundColor: '#f8fafc',
                  borderTop: '1.5px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                      Showing <strong style={{ color: '#0a1e3b' }}>{Math.min((auctionCurrentPage - 1) * auctionPageSize + 1, filteredAuctions.length)}</strong> to <strong style={{ color: '#0a1e3b' }}>{Math.min(auctionCurrentPage * auctionPageSize, filteredAuctions.length)}</strong> of <strong style={{ color: '#0a1e3b' }}>{filteredAuctions.length}</strong> records
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      <span>Per page:</span>
                      <select
                        value={auctionPageSize}
                        onChange={(e) => { setAuctionPageSize(Number(e.target.value)); setAuctionCurrentPage(1); }}
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: '#ffffff',
                          color: '#0a1e3b',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {/* Pagination Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setAuctionCurrentPage(1)}
                      disabled={auctionCurrentPage === 1}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: auctionCurrentPage === 1 ? '#f1f5f9' : '#ffffff',
                        color: auctionCurrentPage === 1 ? '#94a3b8' : '#0a1e3b',
                        cursor: auctionCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="First Page"
                    >
                      <ChevronsLeft size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuctionCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={auctionCurrentPage === 1}
                      style={{
                        padding: '0 0.65rem',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: auctionCurrentPage === 1 ? '#f1f5f9' : '#ffffff',
                        color: auctionCurrentPage === 1 ? '#94a3b8' : '#0a1e3b',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: auctionCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      {Array.from({ length: totalAuctionPages }, (_, i) => i + 1)
                        .filter(pNum => {
                          if (totalAuctionPages <= 7) return true;
                          if (pNum === 1 || pNum === totalAuctionPages) return true;
                          if (Math.abs(pNum - auctionCurrentPage) <= 1) return true;
                          return false;
                        })
                        .reduce((acc, pNum, index, arr) => {
                          if (index > 0 && pNum - arr[index - 1] > 1) {
                            acc.push(`ellipsis-${pNum}`);
                          }
                          acc.push(pNum);
                          return acc;
                        }, [])
                        .map((item) => {
                          if (typeof item === 'string') {
                            return <span key={item} style={{ padding: '0 0.3rem', color: '#94a3b8', fontWeight: 700 }}>...</span>;
                          }
                          const isCurrent = item === auctionCurrentPage;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setAuctionCurrentPage(item)}
                              style={{
                                minWidth: '32px',
                                height: '32px',
                                padding: '0 0.45rem',
                                borderRadius: '8px',
                                border: isCurrent ? '2px solid #0a1e3b' : '1.5px solid #cbd5e1',
                                backgroundColor: isCurrent ? '#0a1e3b' : '#ffffff',
                                color: isCurrent ? '#ffffff' : '#334155',
                                fontWeight: isCurrent ? 800 : 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                boxShadow: isCurrent ? '0 2px 6px rgba(10,30,59,0.2)' : 'none'
                              }}
                            >
                              {item}
                            </button>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAuctionCurrentPage(prev => Math.min(prev + 1, totalAuctionPages))}
                      disabled={auctionCurrentPage === totalAuctionPages}
                      style={{
                        padding: '0 0.65rem',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: auctionCurrentPage === totalAuctionPages ? '#f1f5f9' : '#ffffff',
                        color: auctionCurrentPage === totalPages ? '#94a3b8' : '#0a1e3b',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: auctionCurrentPage === totalAuctionPages ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuctionCurrentPage(totalAuctionPages)}
                      disabled={auctionCurrentPage === totalAuctionPages}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: auctionCurrentPage === totalAuctionPages ? '#f1f5f9' : '#ffffff',
                        color: auctionCurrentPage === totalAuctionPages ? '#94a3b8' : '#0a1e3b',
                        cursor: auctionCurrentPage === totalAuctionPages ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Last Page"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </ScrollAnimationWrapper>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT MEMBER DETAILS MODAL                                        */}
      {/* ========================================================================= */}
      {isEditUserOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 30, 59, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditUserOpen(false); }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1.5px solid #e2e8f0' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0a1e3b', margin: 0 }}>
                  Edit Member Details
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Update identity, contact info, nominee, and KYC specifications for {user.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUserOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Personal Details Section */}
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0a1e3b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.65rem' }}>
                  1. Personal & Contact Information
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Member ID</label>
                    <input
                      type="text"
                      value={editFormData.memberId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, memberId: e.target.value })}
                      placeholder="e.g. INA107"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>WhatsApp Number</label>
                    <input
                      type="text"
                      value={editFormData.whatsappNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Gender</label>
                    <select
                      value={editFormData.gender || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', backgroundColor: '#fff' }}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Age (Years)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      placeholder="e.g. 35"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Address</label>
                  <input
                    type="text"
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="Street, Landmark, Village / Town"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Nominee Details Section */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0a1e3b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.65rem' }}>
                  2. Nominee Details
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Nominee Name</label>
                    <input
                      type="text"
                      value={editFormData.nomineeName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nomineeName: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Relationship</label>
                    <input
                      type="text"
                      value={editFormData.nomineeRelationship || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nomineeRelationship: e.target.value })}
                      placeholder="e.g. Spouse, Son, Father"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Nominee Mobile</label>
                    <input
                      type="text"
                      value={editFormData.nomineePhone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nomineePhone: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* KYC & Document Numbers */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0a1e3b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.65rem' }}>
                  3. KYC Identification & Documents
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Aadhaar Number</label>
                    <input
                      type="text"
                      value={editFormData.aadharNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, aadharNumber: e.target.value })}
                      placeholder="12 digit Aadhaar"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>PAN Card Number</label>
                    <input
                      type="text"
                      value={editFormData.panNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, panNumber: e.target.value })}
                      placeholder="10 character PAN"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>Guarantor Required</label>
                    <select
                      value={editFormData.guarantorRequired || 'No'}
                      onChange={(e) => setEditFormData({ ...editFormData, guarantorRequired: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', backgroundColor: '#fff' }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    padding: '0.65rem 1.45rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0a1e3b',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(10, 30, 59, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {editSaving ? 'Saving Changes...' : (<><Check size={16} color="#fbbf24" /> Save Profile Details</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD DOCUMENT / PHOTO MODAL                                    */}
      {/* ========================================================================= */}
      {isDocModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 30, 59, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsDocModalOpen(false); }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0a1e3b', margin: 0 }}>
                  Upload Document or Photo
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Member: {user.name} ({user.memberId || 'ID Pending'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDocModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Select Document Category:
                </label>
                <select
                  value={docTypeToUpload}
                  onChange={(e) => setDocTypeToUpload(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    color: '#0a1e3b'
                  }}
                >
                  <option value="profile">👤 Member Profile Photo</option>
                  <option value="aadhar">📄 Aadhaar Card Document</option>
                  <option value="pan">💳 PAN Card Document</option>
                </select>
              </div>

              <div>
                <ProofUploader
                  label={`Select or Snap ${docTypeToUpload.toUpperCase()}`}
                  description="Upload image file or take snapshot with camera"
                  required={true}
                  onFileSelected={(file) => setDocFile(file)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docUploading || !docFile}
                  style={{
                    flex: 2,
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0a1e3b',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: docUploading || !docFile ? 'not-allowed' : 'pointer',
                    opacity: docUploading || !docFile ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {docUploading ? 'Uploading...' : (<><Check size={16} color="#fbbf24" /> Confirm Upload</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MARK MONTH PAID MODAL                                            */}
      {/* ========================================================================= */}
      {uploadModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 30, 59, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setUploadModal({ isOpen: false, chitId: null, chitName: '', amount: null, monthNumber: null }); }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '460px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0a1e3b', margin: 0 }}>
                  Mark Month {uploadModal.monthNumber} Paid
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  {uploadModal.chitName} — Member: {user.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModal({ isOpen: false, chitId: null, slotNumber: 1, chitName: '', amount: null, monthNumber: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>Amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={uploadModal.amount ?? ''}
                  onChange={(e) => setUploadModal({ ...uploadModal, amount: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 800, color: '#0a1e3b' }}
                />
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>Transaction ID / Ref (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Cash collected / UPI Ref ID"
                  value={uploadData.text}
                  onChange={(e) => setUploadData({ ...uploadData, text: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <ProofUploader
                  label="Receipt Proof / Screenshot"
                  description="Upload transaction proof or snap live photo"
                  required={false}
                  onFileSelected={(file) => setUploadData({ ...uploadData, file })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadModal({ isOpen: false, chitId: null, slotNumber: 1, chitName: '', amount: null, monthNumber: null })}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', border: 'none', backgroundColor: '#0a1e3b', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {uploadLoading ? 'Recording...' : (<><Check size={16} color="#fbbf24" /> Confirm Paid</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LIGHTBOX PREVIEW MODAL                                           */}
      {/* ========================================================================= */}
      {lightboxData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 30, 59, 0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem'
        }}
          onClick={() => setLightboxData(null)}
        >
          <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '88vh', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', color: '#ffffff' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{lightboxData.title || 'Document Preview'}</span>
              <button
                onClick={() => setLightboxData(null)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={lightboxData.url}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: OFFICIAL DIGITAL RECEIPT PREVIEW                                  */}
      {/* ========================================================================= */}
      {viewReceiptData && (
        <OfficialReceipt
          payment={viewReceiptData.payment}
          chit={viewReceiptData.chit}
          user={viewReceiptData.user}
          extraData={viewReceiptData.extraData}
          onClose={() => setViewReceiptData(null)}
        />
      )}

    </div>
  );
};

export default UserDetailedRecords;
