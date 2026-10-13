import React, { useState } from 'react';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <ScrollAnimationWrapper>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Contact <span style={{ color: 'var(--accent-yellow-dark)' }}>Us</span>
          </h1>
          <p style={{ color: 'var(--color-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Have questions about our chit schemes or registration process? Reach out to our support team.
          </p>
        </div>
      </ScrollAnimationWrapper>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
        {/* Contact Info */}
        <ScrollAnimationWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card-premium">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Office Address</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <MapPin size={22} color="var(--accent-yellow-dark)" style={{ marginTop: '3px' }} />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Head Office</h4>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem' }}>
                      104 Financial Towers, 2nd Cross Street,<br />
                      Tech City, Bengaluru, KA - 560001
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Phone size={22} color="var(--accent-yellow-dark)" />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Call Support</h4>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem' }}>+91 80 4912 3456</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Mail size={22} color="var(--accent-yellow-dark)" />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Email Inquiries</h4>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem' }}>support@chitfund.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium" style={{ backgroundColor: 'var(--accent-yellow-light)', border: '1px solid var(--accent-yellow)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Verification Notice</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-secondary)', lineHeight: '1.5' }}>
                For urgent profile or registration approvals, please call support with your registered email and Aadhar ID details.
              </p>
            </div>
          </div>
        </ScrollAnimationWrapper>

        {/* Contact Form */}
        <ScrollAnimationWrapper>
          <div className="glass-panel card-premium" style={{ border: '1px solid rgba(255, 255, 255, 0.6)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Send Inquiry</h2>

            {submitted ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                color: '#065f46'
              }}>
                <CheckCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Message Sent!</h3>
                <p style={{ fontSize: '0.9rem' }}>We have received your message and will respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="name">Your Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    placeholder="Tell us what you need help with..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input-field"
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem'
                  }}
                >
                  <Send size={16} />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </ScrollAnimationWrapper>
      </div>
    </div>
  );
};

export default Contact;
