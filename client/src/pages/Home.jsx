import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Award, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Coins, 
  HelpCircle, 
  PhoneCall, 
  Lock, 
  Sparkles,
  Calculator,
  FileCheck,
  Building,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';
import heroImg from '../assets/hero-illustration.png';

const FAQ_ITEMS = [
  {
    question: "How does a chit fund scheme work?",
    answer: "A chit fund is a community savings and borrowing system. A fixed number of members contribute an agreed installment each month to create a common fund. Each month, an open auction is conducted where members in need of capital bid an auction discount. The lowest bidder receives the prize amount, and the remaining discount (after company commission) is distributed equally among all non-winning members as dividend earnings."
  },
  {
    question: "What are the benefits of saving with InaVolu Chit Funds?",
    answer: "InaVolu Chit Funds serves as a unique dual-purpose financial tool combining recurring savings with easy borrowing without bank collateral or complex paperwork. Non-winning members enjoy high effective annual returns through monthly dividend distributions, while members needing liquidity can access substantial funds during emergencies or milestone life events."
  },
  {
    question: "Is InaVolu Chit Funds safe and legally compliant?",
    answer: "Yes, 100%. InaVolu Chit Funds Private Limited operates strictly under The Chit Funds Act, 1982 and state chit fund regulatory frameworks. Every chit scheme has a dedicated separate bank account, rigorous physical KYC verification, and full legal documentation for maximum transparency."
  },
  {
    question: "How do monthly dividends reduce my payments?",
    answer: "When a winner bids at the monthly auction, the auction discount (minus the 5% company commission) is distributed equally across all other members. This dividend is credited directly against next month's installment, which means your actual out-of-pocket payment is lower than the face value of the monthly contribution."
  },
  {
    question: "What documents are required for member KYC verification?",
    answer: "To ensure community fund security, our Superadmin team verifies clear physical proofs of Aadhaar Card, PAN Card, and Address Verification. Once verified, members receive an official Member ID (e.g. MEMBER-1, MEMBER-2) and access to official digital receipts."
  },
  {
    question: "How and when is the prize money disbursed?",
    answer: "Once a member successfully wins a monthly auction and submits the required standard guarantor documentation per regulatory guidelines, the prize money is transferred directly into their verified bank account via RTGS/NEFT/IMPS."
  }
];

const Home = () => {
  const { user, API_URL } = useAuth();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  // Calculator state
  const [calcAmount, setCalcAmount] = useState(250000);
  const [calcTenure, setCalcTenure] = useState(25);

  // Auto-scroll to section if hash is present in URL
  useEffect(() => {
    if (window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      const targetElement = document.getElementById(hashId);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  // Fetch live admin-created chit schemes from database
  useEffect(() => {
    let isMounted = true;
    const fetchPublicSchemes = async () => {
      try {
        setLoadingSchemes(true);
        // Fetch published admin chit schemes from public endpoint
        const res = await fetch(`${API_URL}/chits/public`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.data)) {
            setSchemes(data.data);
            return;
          }
        }

        // Secondary attempt for logged in users
        const token = localStorage.getItem('token');
        if (token) {
          const authRes = await fetch(`${API_URL}/chits`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null);
          if (authRes && authRes.ok) {
            const authData = await authRes.json();
            if (isMounted && authData.success && Array.isArray(authData.data)) {
              setSchemes(authData.data);
              return;
            }
          }
        }

        if (isMounted) setSchemes([]);
      } catch (err) {
        console.error('Error fetching chit plans:', err);
        if (isMounted) setSchemes([]);
      } finally {
        if (isMounted) setLoadingSchemes(false);
      }
    };

    fetchPublicSchemes();
    return () => { isMounted = false; };
  }, [API_URL]);

  // Handle "Know More" button click on Chit Schemes
  // As requested: "if we click chit schemes it should show no more option if we click that no more option it should redirect into signin page"
  const handleKnowMore = (scheme) => {
    if (user) {
      // If already logged in, go to chit details / browse chits
      navigate('/chits');
    } else {
      // If guest/visitor, redirect directly to sign in / login page
      navigate('/login', { 
        state: { 
          fromScheme: scheme.name,
          notice: `Please sign in to view complete details, monthly schedules, and enroll in ${scheme.name}.` 
        } 
      });
    }
  };

  const calculatedMonthly = Math.round(calcAmount / calcTenure);
  const estimatedDividends = Math.round(calcAmount * 0.12);

  return (
    <div className="landing-page-root" style={{ width: '100%', overflowX: 'hidden' }}>
      
      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(ellipse at 30% 0%, rgba(59, 91, 219, 0.12) 0%, rgba(79, 70, 229, 0.06) 40%, rgba(245, 158, 11, 0.05) 70%, rgba(245, 246, 250, 0.95) 100%)',
        padding: '4rem 1.5rem 5rem 1.5rem',
        borderBottom: '1px solid rgba(59, 91, 219, 0.12)',
        borderRadius: '0 0 2.5rem 2.5rem',
        boxShadow: '0 20px 40px -15px rgba(59, 91, 219, 0.10)'
      }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          
          <ScrollAnimationWrapper>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#1e3a8a',
                padding: '0.5rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                fontWeight: 700,
                width: 'fit-content',
                border: '1.5px solid rgba(59, 91, 219, 0.28)',
                boxShadow: '0 4px 16px rgba(59, 91, 219, 0.16), 0 0 12px rgba(245, 158, 11, 0.1)'
              }}>
                <ShieldCheck size={18} color="#3b5bdb" />
                <span>100% Registered & Regulated Chit Fund</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#0d1b3e',
                letterSpacing: '-0.025em',
                margin: 0
              }}>
                Grow Your Wealth with <br />
                <span style={{ display: 'inline-block', position: 'relative' }}>
                  <span style={{ 
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 40%, #4f46e5 70%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                    display: 'inline-block',
                  }}>
                    InaVolu Chit Funds
                  </span>
                </span>
              </h1>

              <p style={{
                fontSize: '1.15rem',
                color: '#475569',
                lineHeight: 1.6,
                maxWidth: '640px',
                margin: '0 auto'
              }}>
                Empowering individuals, families, and businesses with transparent, community-backed savings and instant borrowing without hefty bank interest.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <a 
                  href="#chit-plans"
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.9rem 2rem',
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    borderRadius: '14px',
                    boxShadow: '0 8px 24px rgba(59, 91, 219, 0.38), 0 0 20px rgba(59, 91, 219, 0.28)',
                    textDecoration: 'none'
                  }}
                >
                  <span>Explore Chit Plans</span>
                  <ArrowRight size={18} />
                </a>

                <Link
                  to="/login"
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.9rem 2rem',
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    borderRadius: '14px',
                    textDecoration: 'none'
                  }}
                >
                  <Lock size={16} color="#3b5bdb" />
                  <span>Sign In to Portal</span>
                </Link>
              </div>

              {/* Trust Badges Bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '2rem',
                paddingTop: '1.75rem',
                borderTop: '1px solid rgba(59, 91, 219, 0.16)',
                marginTop: '1.25rem',
                width: '100%',
                maxWidth: '700px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#3b5bdb" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Govt. Registered</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#3b5bdb" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Physical Document KYC</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#3b5bdb" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Official Digital Receipts</span>
                </div>
              </div>

            </div>
          </ScrollAnimationWrapper>

        </div>
      </section>

      {/* STATS HIGHLIGHT BAR */}
      <section style={{ 
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', 
        padding: '2.8rem 1.5rem', 
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <h3 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#3b5bdb', margin: 0, textShadow: '0 2px 8px rgba(59, 91, 219, 0.16)' }}>₹10+ Crores</h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '0.35rem', fontWeight: 500 }}>Auction Payouts Disbursed</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#3b5bdb', margin: 0, textShadow: '0 2px 8px rgba(59, 91, 219, 0.16)' }}>100% Legal</h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '0.35rem', fontWeight: 500 }}>Chit Funds Act Compliant</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#3b5bdb', margin: 0, textShadow: '0 2px 8px rgba(59, 91, 219, 0.16)' }}>2,500+</h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '0.35rem', fontWeight: 500 }}>Verified Chit Members</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#3b5bdb', margin: 0, textShadow: '0 2px 8px rgba(59, 91, 219, 0.16)' }}>Zero</h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '0.35rem', fontWeight: 500 }}>Hidden Charges or Surprises</p>
          </div>
        </div>
      </section>

      {/* CHIT PLANS / CHIT SCHEMES SECTION (Target of "Chit Plans" in header) */}
      <section id="chit-plans" style={{
        padding: '5rem 1.5rem',
        maxWidth: '1240px',
        margin: '0 auto'
      }}>
        <ScrollAnimationWrapper>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#eef2ff',
              color: '#1e3a8a',
              padding: '0.45rem 1.2rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: '0.85rem',
              border: '1px solid rgba(59, 91, 219, 0.28)',
              boxShadow: '0 2px 10px rgba(59, 91, 219, 0.1)'
            }}>
              <Coins size={16} color="#3b5bdb" />
              <span>TRANSPARENT SAVINGS & BORROWING</span>
            </div>

            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Available <span style={{ 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 50%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Chit Schemes & Plans</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '620px', margin: '0.75rem auto 0 auto' }}>
              Explore our verified monthly chit plans. Click <strong>Know More</strong> on any scheme to sign in and view complete auction schedules and enrollment criteria.
            </p>
          </div>
        </ScrollAnimationWrapper>

        {/* Schemes Grid */}
        {loadingSchemes ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1.5rem',
            gap: '1rem'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              border: '3px solid #c7d2fe',
              borderTopColor: '#3b5bdb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b', margin: 0 }}>
              Loading active chit schemes...
            </p>
          </div>
        ) : schemes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1.5px dashed #cbd5e1',
            maxWidth: '580px',
            margin: '0 auto',
            boxShadow: '0 8px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#eef2ff',
              color: '#3b5bdb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <Coins size={32} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              No Chit Plans Currently Published
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Active chit plans created by our administration will appear here. Please check back soon or reach out to our team directly.
            </p>
            <a
              href="#contact-us"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.4rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                textDecoration: 'none'
              }}
            >
              <PhoneCall size={16} />
              <span>Contact Us For Inquiries</span>
            </a>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '2rem'
          }}>
            {schemes.map((scheme, idx) => (
              <ScrollAnimationWrapper key={scheme.id || idx}>
                <div 
                  className="card-premium card-glow-emerald"
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '2.2rem 1.85rem',
                    borderRadius: '22px',
                    border: '1.5px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.08), 0 0 16px rgba(59, 91, 219, 0.06)',
                    background: '#ffffff',
                    position: 'relative',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '24px',
                    backgroundColor: scheme.status === 'active' ? '#3b5bdb' : '#d97706',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.3rem 0.95rem',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                    boxShadow: scheme.status === 'active' ? '0 4px 14px rgba(59, 91, 219, 0.42)' : '0 4px 14px rgba(217, 119, 6, 0.4)',
                    textTransform: 'capitalize'
                  }}>
                    {scheme.status === 'upcoming' ? 'Enrolling Now' : (scheme.status || 'Active')}
                  </span>

                  <div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#3b5bdb',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em'
                      }}>
                        Bid Auction Scheme
                      </span>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0 0' }}>
                        {scheme.name}
                      </h3>
                    </div>

                    {/* Value & Contribution Block */}
                    <div style={{
                      background: 'linear-gradient(145deg, #f8fafc 0%, #f0f0ff 100%)',
                      border: '1px solid rgba(59, 91, 219, 0.16)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Chit Value</span>
                        <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a' }}>
                          ₹{(Number(scheme.chitValue) || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Monthly Sub.</span>
                        <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706' }}>
                          ₹{(Number(scheme.monthlyContribution) || Math.round(Number(scheme.chitValue) / (Number(scheme.totalMembers) || Number(scheme.durationMonths) || 20))).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Duration</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                          {scheme.durationMonths} Months
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'block' }}>Total Slots</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                          {scheme.totalMembers || scheme.durationMonths} Members
                        </span>
                      </div>
                    </div>

                    {scheme.termsAndConditions && (
                      <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                        {scheme.termsAndConditions}
                      </p>
                    )}

                    {/* Key Highlights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                        <CheckCircle2 size={16} color="#3b5bdb" />
                        <span>Regular monthly dividend payouts</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                        <CheckCircle2 size={16} color="#3b5bdb" />
                        <span>Superadmin verified KYC & payments</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                        <CheckCircle2 size={16} color="#3b5bdb" />
                        <span>Govt. Chit Act registered documentation</span>
                      </div>
                    </div>
                  </div>

                  {/* THE "KNOW MORE" BUTTON — REDIRECTS TO SIGNIN PAGE */}
                  <button
                    onClick={() => handleKnowMore(scheme)}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      padding: '0.85rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Know More</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </ScrollAnimationWrapper>
            ))}
          </div>
        )}

        {/* Informative notice below chit schemes */}
        <div style={{
          marginTop: '3rem',
          background: 'linear-gradient(135deg, #eef2ff 0%, #f0f0ff 100%)',
          border: '1.5px dashed rgba(59, 91, 219, 0.38)',
          borderRadius: '18px',
          padding: '1.6rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 4px 16px rgba(59, 91, 219, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '260px', flex: 1 }}>
            <div style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 100%)', color: '#ffffff', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(59, 91, 219, 0.32)' }}>
              <Lock size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e3a8a' }}>
                Looking to Enroll or Bid in Upcoming Auctions?
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.86rem', color: '#4b5563' }}>
                Sign in with your registered account or create a new account to submit KYC documents and participate.
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="btn-primary"
            style={{
              padding: '0.75rem 1.6rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              borderRadius: '12px',
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Sign In Now
          </Link>
        </div>
      </section>

      {/* HOW CHIT FUNDS WORK SECTION */}
      <section id="how-it-works" style={{ backgroundColor: '#f8fafc', padding: '5rem 1.5rem', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <ScrollAnimationWrapper>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                padding: '0.45rem 1.2rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 800,
                marginBottom: '0.75rem',
                border: '1px solid rgba(245, 158, 11, 0.25)'
              }}>
                <Sparkles size={16} color="#d97706" />
                <span>SIMPLE, SMART & BENEFICIAL</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                How Does a Chit Fund Work?
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '600px', margin: '0.75rem auto 0 auto' }}>
                A time-tested indigenous Indian financial vehicle combining disciplined monthly savings with flexible borrowing.
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            
            <div className="card-premium" style={{ background: '#ffffff', borderRadius: '18px', padding: '2rem 1.5rem', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(59, 91, 219, 0.22)' }}>
                1
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>Join a Group</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Choose a scheme matching your monthly budget. For example, 25 members contribute ₹10,000 monthly for 25 months to create a ₹2,50,000 pool.
              </p>
            </div>

            <div className="card-premium" style={{ background: '#ffffff', borderRadius: '18px', padding: '2rem 1.5rem', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(59, 91, 219, 0.22)' }}>
                2
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>Monthly Auction</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Each month, an open auction is conducted. Members in urgent need of capital bid an auction discount to take home the prize money.
              </p>
            </div>

            <div className="card-premium" style={{ background: '#ffffff', borderRadius: '18px', padding: '2rem 1.5rem', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(59, 91, 219, 0.22)' }}>
                3
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>Earn Dividends</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                The auction discount (after company commission) is distributed equally among all non-winning members as dividend, reducing next month's payment!
              </p>
            </div>

            <div className="card-premium" style={{ background: '#ffffff', borderRadius: '18px', padding: '2rem 1.5rem', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(59, 91, 219, 0.22)' }}>
                4
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>Full Payout</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Members who do not bid throughout the cycle receive the full chit value at the final month, enjoying higher effective returns than standard savings.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* INTERACTIVE CHIT ESTIMATOR CALCULATOR */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <ScrollAnimationWrapper>
          <div className="card-premium card-glow-emerald" style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f0f0ff 40%, #fffbeb 100%)',
            border: '2px solid rgba(59, 91, 219, 0.28)',
            borderRadius: '28px',
            padding: '2.8rem 2.2rem',
            boxShadow: '0 24px 50px -10px rgba(59, 91, 219, 0.16), 0 10px 20px -5px rgba(245, 158, 11, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.75rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 100%)', 
                color: '#ffffff', 
                padding: '0.75rem', 
                borderRadius: '14px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(59, 91, 219, 0.38)'
              }}>
                <Calculator size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Chit Growth Estimator
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                  Select your preferred chit pool value and tenure to see savings estimates.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Desired Chit Value</label>
                    <span style={{ fontWeight: 800, color: '#3b5bdb', fontSize: '1.1rem' }}>₹{calcAmount.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range"
                    min="50000"
                    max="1000000"
                    step="50000"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b5bdb', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    <span>₹50,000</span>
                    <span>₹5,00,000</span>
                    <span>₹10,00,000</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Scheme Tenure</label>
                    <span style={{ fontWeight: 800, color: '#3b5bdb', fontSize: '1.1rem' }}>{calcTenure} Months</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {[20, 25, 40, 50].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCalcTenure(m)}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '10px',
                          border: calcTenure === m ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: calcTenure === m ? '#eef2ff' : '#ffffff',
                          color: calcTenure === m ? '#2563eb' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        {m} Mo
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result Summary Box */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '1.75rem',
                boxShadow: '0 8px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Monthly Gross Installment</span>
                  <strong style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ca8a04' }}>
                    ₹{calculatedMonthly.toLocaleString()} / mo
                  </strong>
                </div>

                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Estimated Dividend Rebates</span>
                  <strong style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b5bdb' }}>
                    ~ ₹{estimatedDividends.toLocaleString()}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Reduces net payments over the tenure</span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Lump Sum Payout (Final Month)</span>
                  <strong style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b5bdb' }}>
                    ₹{calcAmount.toLocaleString()}
                  </strong>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textAlign: 'center'
                  }}
                >
                  Sign In to Join Scheme
                </button>
              </div>
            </div>
          </div>
        </ScrollAnimationWrapper>
      </section>

      {/* WHY CHOOSE INAVOLU CHIT FUNDS / BENEFITS SECTION */}
      <section id="benefits" style={{ backgroundColor: '#ffffff', padding: '5rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <ScrollAnimationWrapper>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#eef2ff',
                color: '#1e3a8a',
                padding: '0.45rem 1.2rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 800,
                marginBottom: '0.85rem',
                border: '1px solid rgba(59, 91, 219, 0.28)',
                boxShadow: '0 2px 10px rgba(59, 91, 219, 0.1)'
              }}>
                <Award size={16} color="#3b5bdb" />
                <span>UNMATCHED SECURITY & TRUST</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Why InaVolu Chit Funds is Your <span style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>Best Partner</span>
              </h2>
            </div>
          </ScrollAnimationWrapper>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            <div className="card-premium" style={{ padding: '2.2rem 2rem', borderRadius: '20px', boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid rgba(59, 91, 219, 0.28)', boxShadow: '0 4px 12px rgba(59, 91, 219, 0.16)' }}>
                <ShieldCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Strict KYC Approval</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Every applicant undergoes physical Aadhaar and PAN verification by our Superadmin before being admitted to any chit pool, safeguarding every member’s capital.
              </p>
            </div>

            <div className="card-premium" style={{ padding: '2.2rem 2rem', borderRadius: '20px', boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)' }}>
                <FileCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Official Digital Receipts</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Instant downloadable, government-compliant official receipts with transaction references for every installment payment made.
              </p>
            </div>

            <div className="card-premium" style={{ padding: '2.2rem 2rem', borderRadius: '20px', boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #eef2ff 0%, #d1fae5 100%)', color: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid rgba(59, 91, 219, 0.28)', boxShadow: '0 4px 12px rgba(59, 91, 219, 0.16)' }}>
                <TrendingUp size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Transparent Auction Ledger</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Every monthly auction winning bid, foreman commission, and member dividend share is permanently recorded and visible directly inside your dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) SECTION */}
      <section id="faq" style={{ backgroundColor: '#f8fafc', padding: '5rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <ScrollAnimationWrapper>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#eef2ff',
                color: '#1e3a8a',
                padding: '0.45rem 1.2rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 800,
                marginBottom: '0.85rem',
                border: '1px solid rgba(59, 91, 219, 0.28)'
              }}>
                <HelpCircle size={16} color="#3b5bdb" />
                <span>FREQUENTLY ASKED QUESTIONS</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Got Questions? <span style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 50%, #d97706 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>We Have Answers</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '600px', margin: '0.75rem auto 0 auto' }}>
                Everything you need to know about our government-registered chit fund cycles, monthly auctions, and dividend distributions.
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <ScrollAnimationWrapper key={idx}>
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: isOpen ? '1.5px solid #3b5bdb' : '1px solid #e2e8f0',
                      boxShadow: isOpen ? '0 12px 28px rgba(59, 91, 219, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.25s ease',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      style={{
                        width: '100%',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: '1rem'
                      }}
                    >
                      <span style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: isOpen ? '#3b5bdb' : '#1e293b'
                      }}>
                        {faq.question}
                      </span>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isOpen ? '#eef2ff' : '#f1f5f9',
                        color: isOpen ? '#3b5bdb' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div style={{
                        padding: '0 1.5rem 1.35rem 1.5rem',
                        color: '#64748b',
                        fontSize: '0.94rem',
                        lineHeight: 1.65,
                        borderTop: '1px dashed #f1f5f9',
                        paddingTop: '0.85rem'
                      }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                </ScrollAnimationWrapper>
              );
            })}
          </div>

          {/* Need More Assistance Banner */}
          <div style={{
            marginTop: '3rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #eef2ff 0%, #f0f0ff 100%)',
            border: '1.5px solid rgba(59, 91, 219, 0.28)',
            borderRadius: '18px',
            padding: '1.6rem 2rem',
            boxShadow: '0 4px 16px rgba(59, 91, 219, 0.06)'
          }}>
            <p style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#1e3a8a' }}>
              Still have questions about a specific scheme or enrollment criteria?
            </p>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                to="/contact"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  textDecoration: 'none'
                }}
              >
                <PhoneCall size={15} />
                <span>Contact Our Helpdesk</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <footer style={{
        background: 'radial-gradient(ellipse at 50% -20%, rgba(59, 91, 219, 0.28) 0%, transparent 60%), linear-gradient(180deg, #172554 0%, #022c22 40%, #0f172a 100%)',
        color: '#ffffff',
        padding: '5rem 1.5rem 2.5rem 1.5rem',
        borderTop: '1px solid rgba(245, 158, 11, 0.35)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(59, 91, 219, 0.12) 50%, transparent 80%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3.5rem', marginBottom: '3.5rem', position: 'relative' }}>
          
          {/* Brand Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '6px 12px', display: 'inline-flex', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                <img 
                  src={logoImg} 
                  alt="InaVolu Chit Funds" 
                  style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>
              InaVolu Chit Funds Private Limited is a registered, government-regulated financial services platform delivering high-yield collective savings and zero-collateral auction credit with cutting-edge digital management.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.4rem 0.85rem', borderRadius: '9999px', width: 'fit-content' }}>
              <ShieldCheck size={16} color="#f59e0b" />
              <span style={{ fontSize: '0.78rem', color: '#fef08a', fontWeight: 700 }}>Government Registered & Regulated</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.25rem', borderBottom: '2px solid #3b5bdb', paddingBottom: '0.5rem', display: 'inline-block' }}>
              Quick Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.92rem', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ChevronRight size={14} color="#4f6ee8" /> Home
              </a>
              <Link to="/about" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.92rem', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ChevronRight size={14} color="#4f6ee8" /> About InaVolu
              </Link>
              <a href="#chit-plans" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.92rem', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ChevronRight size={14} color="#4f6ee8" /> Schemes & Plans
              </a>
              <Link to="/contact" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.92rem', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ChevronRight size={14} color="#4f6ee8" /> Contact Helpdesk
              </Link>
              <Link to="/login" style={{ color: '#f59e0b', textDecoration: 'none', fontSize: '0.92rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <ChevronRight size={14} color="#f59e0b" /> Member Portal Login
              </Link>
            </div>
          </div>

          {/* Registered Office & Contact Column */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.25rem', borderBottom: '2px solid #3b5bdb', paddingBottom: '0.5rem', display: 'inline-block' }}>
              Registered Office
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.55 }}>
              <p style={{ margin: 0 }}>
                ABR Building, 1st Floor, Door No. 9S-1271,<br />
                Kadapa - Bengaluru Hwy, Opp: Viswam Engineering College,<br />
                Angallu, Madanapalle, Andhra Pradesh – 517326.
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>Phone:</span> +91 85003 19890
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>Website:</span> www.inavolu.com
              </p>
              <p style={{ margin: 0, color: '#6ee7b7', fontWeight: 600, fontSize: '0.82rem' }}>
                Working Hours: Mon - Sat (9:30 AM - 6:30 PM)
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Legal Copyright Bar */}
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.84rem',
          color: '#94a3b8'
        }}>
          <div>
            © {new Date().getFullYear()} <strong style={{ color: '#f8fafc' }}>InaVolu Chit Funds Private Limited</strong>. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ color: '#cbd5e1' }}>Regulated under The Chit Funds Act, 1982.</span>
            <Link to="/admin/login" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem', padding: '0.3rem 0.65rem', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
