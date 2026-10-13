import React from 'react';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import TypewriterEffect from '../components/TypewriterEffect';
import { ShieldCheck, HelpCircle, Shield, Award, Users } from 'lucide-react';

const About = () => {
  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <ScrollAnimationWrapper>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            About <span style={{ color: 'var(--accent-yellow-dark)' }}>Chit Fund</span>
          </h1>
          <p style={{ color: 'var(--color-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            <TypewriterEffect text="A secure, digital-first chit fund platform designed to help communities save and borrow together efficiently." speed={50} />
          </p>
        </div>
      </ScrollAnimationWrapper>

      {/* Grid of details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        <ScrollAnimationWrapper>
          <div className="card-premium" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <ShieldCheck size={28} color="var(--color-success)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fully Secure</h3>
            </div>
            <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              We mandate physical document verification (Aadhar and PAN Card approvals) by our Superadmin before letting any user login, preventing fraud and fake profiles.
            </p>
          </div>
        </ScrollAnimationWrapper>

        <ScrollAnimationWrapper>
          <div className="card-premium" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Award size={28} color="var(--accent-yellow-dark)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Transparent Cycle</h3>
            </div>
            <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Every month, payments are sent to the Superadmin who checks and marks them, storing transaction references. All results are fully visible inside the user dashboard.
            </p>
          </div>
        </ScrollAnimationWrapper>

        <ScrollAnimationWrapper>
          <div className="card-premium" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Users size={28} color="var(--color-info)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Community Trusted</h3>
            </div>
            <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Our platform coordinates upcoming chits. Once the total required membership is met and approved, the savings cycle begins dynamically.
            </p>
          </div>
        </ScrollAnimationWrapper>
      </div>

      <ScrollAnimationWrapper>
        <div className="glass-panel card-premium" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <HelpCircle size={32} color="var(--accent-yellow-dark)" />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>How Does A Chit Fund Work?</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-secondary)', fontSize: '1rem', lineHeight: '1.7' }}>
            <p>
              1. <strong>Chit Formation:</strong> The Superadmin creates a chit pool with a fixed monthly subscription amount, a specific duration (in months), and a maximum number of members.
            </p>
            <p>
              2. <strong>Joining a Scheme:</strong> Approved users request to join upcoming chits. When the enrollment matches the total required limit, the chit changes status from <em>Upcoming</em> to <em>Active</em>.
            </p>
            <p>
              3. <strong>Monthly Contributions:</strong> Every month, each member contributes their monthly installment. Users upload their receipts and input transaction IDs, which the Superadmin validates.
            </p>
            <p>
              4. <strong>Collection & Payout:</strong> The verified collections are managed under strict company terms to guarantee financial security for all participants throughout the cycle.
            </p>
          </div>
        </div>
      </ScrollAnimationWrapper>
    </div>
  );
};

export default About;
