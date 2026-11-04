import React, { useState } from 'react';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { Mail, Phone, MessageSquare, Clock, Send, CheckCircle, Globe } from 'lucide-react';

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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Help & Support</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Phone size={22} color="var(--accent-yellow-dark)" />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Helpline</h4>
                    <p style={{ margin: 0 }}>
                      <a href="tel:+919948074173" style={{ color: 'var(--color-primary-green)', fontWeight: 700, textDecoration: 'none', fontSize: '1.05rem' }}>
                        +91 99480 74173
                      </a>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <MessageSquare size={22} color="#25D366" />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>WhatsApp Support</h4>
                    <p style={{ margin: 0 }}>
                      <a 
                        href="https://wa.me/919948074173?text=Hello%20InaVolu%20Chits%2C%20I%20have%20an%20inquiry%20regarding%20chit%20schemes." 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}
                      >
                        Chat on +91 99480 74173
                      </a>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Globe size={22} color="var(--accent-yellow-dark)" />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Official Website</h4>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem', margin: 0 }}>inavolu.in</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Clock size={22} color="var(--accent-yellow-dark)" />
                  <div>
                    <h4 style={{ fontWeight: 600 }}>Working Hours</h4>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '0.95rem', margin: 0 }}>Mon - Sat: 9:30 AM - 6:30 PM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium" style={{ backgroundColor: 'var(--accent-yellow-light)', border: '1px solid var(--accent-yellow)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Member Notice</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-secondary)', lineHeight: '1.5' }}>
                For profile verification, chit slot inquiries, or payment approvals, please call or WhatsApp our helpline at <strong>+91 99480 74173</strong>.
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
                color: '#1e3a8a'
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
