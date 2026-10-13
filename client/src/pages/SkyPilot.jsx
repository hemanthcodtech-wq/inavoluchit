import React, { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────
   SKYPILOT PAGE – Cinematic Drone Brand Page
───────────────────────────────────────────── */

const SERVICES = [
  { icon: '🎬', title: 'Aerial Cinematography', desc: 'Films, commercials & music videos captured with precision from above.' },
  { icon: '💍', title: 'Weddings & Events', desc: 'Stunning drone coverage for your most memorable live experiences.' },
  { icon: '🏛️', title: 'Real Estate & Architecture', desc: 'Showcase properties with jaw-dropping aerial perspectives.' },
  { icon: '🌴', title: 'Tourism & Hospitality', desc: 'Destination visuals that make viewers want to book the next flight.' },
  { icon: '📱', title: 'Brand Films & Social Media', desc: 'Scroll-stopping content crafted for modern digital platforms.' },
  { icon: '🎥', title: 'Production Support', desc: 'Expert drone operation support integrated into your creative crew.' },
];

const STATS = [
  { value: '8+', label: 'Years of Experience' },
  { value: '200+', label: 'Projects Completed' },
  { value: '50+', label: 'Happy Clients' },
  { value: '100%', label: 'Safety Record' },
];

const WHY_ITEMS = [
  { icon: '🛡️', title: 'Safety First', desc: 'Every flight is rigorously planned with DGCA compliance and risk assessment.' },
  { icon: '🎯', title: 'Precision Execution', desc: 'Technical expertise ensures every shot is captured exactly as envisioned.' },
  { icon: '🎞️', title: "Filmmaker's Eye", desc: 'Cinematic perspective meets drone mastery for truly spectacular results.' },
  { icon: '⚡', title: 'Creative Ambition', desc: 'We push creative boundaries while maintaining professional standards.' },
];

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1500, trigger) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const num = parseInt(target.replace(/[^0-9]/g, ''));
    let start = 0;
    const step = Math.ceil(num / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setCount(num); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, target, duration]);
  return target.replace(/[0-9]+/, count);
}

function StatCard({ value, label, trigger }) {
  const displayed = useCountUp(value, 1200, trigger);
  return (
    <div className="sp-stat-card">
      <span className="sp-stat-value">{displayed}</span>
      <span className="sp-stat-label">{label}</span>
    </div>
  );
}

/* ── Intersection observer reveal ── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`sp-reveal ${visible ? 'sp-reveal-active' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Particle canvas background ── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,179,237,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,179,237,${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="sp-particles" aria-hidden="true" />;
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function SkyPilot() {
  const [statsRef, statsVisible] = useReveal();

  return (
    <>
      <style>{`
        .sp-root {
          background: #080c14;
          color: #e2e8f0;
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
        }

        /* Hero */
        .sp-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 6rem 1.5rem 4rem;
          overflow: hidden;
          background: radial-gradient(ellipse 80% 60% at 50% 20%, rgba(14,165,233,0.12) 0%, transparent 70%),
                      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.08) 0%, transparent 60%),
                      #080c14;
        }
        .sp-particles {
          position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
        }
        .sp-hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.3);
          color: #38bdf8; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em;
          padding: 0.4rem 1.1rem; border-radius: 999px; margin-bottom: 2rem;
          text-transform: uppercase;
          animation: sp-badge-glow 3s ease-in-out infinite;
        }
        @keyframes sp-badge-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.2); }
          50%      { box-shadow: 0 0 18px 4px rgba(14,165,233,0.35); }
        }
        .sp-hero-title {
          font-size: clamp(2.8rem, 7vw, 6rem);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sp-hero-title .sp-amber {
          background: linear-gradient(90deg, #f59e0b, #fb923c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sp-hero-sub {
          font-size: clamp(1rem, 2.5vw, 1.25rem);
          color: #94a3b8;
          max-width: 680px; margin: 0 auto 2.5rem;
          line-height: 1.7;
        }
        .sp-hero-cta {
          display: inline-flex; align-items: center; gap: 0.6rem;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          color: #fff; font-weight: 700; font-size: 1rem;
          padding: 0.85rem 2rem; border-radius: 999px;
          border: none; cursor: pointer;
          box-shadow: 0 0 30px rgba(14,165,233,0.35);
          transition: all 0.3s ease;
          text-decoration: none;
        }
        .sp-hero-cta:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 50px rgba(14,165,233,0.55);
        }
        .sp-drone-icon {
          font-size: 3.5rem;
          display: block;
          animation: sp-float 5s ease-in-out infinite;
          margin-bottom: 1.5rem;
          filter: drop-shadow(0 0 20px rgba(14,165,233,0.5));
        }
        @keyframes sp-float {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-18px) rotate(3deg); }
        }

        /* Section commons */
        .sp-section {
          padding: 6rem 1.5rem;
          max-width: 1200px; margin: 0 auto;
        }
        .sp-section-center { text-align: center; }
        .sp-eyebrow {
          display: inline-block;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: #38bdf8;
          background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.2);
          padding: 0.3rem 0.9rem; border-radius: 999px; margin-bottom: 1.25rem;
        }
        .sp-section-title {
          font-size: clamp(2rem, 4.5vw, 3rem);
          font-weight: 800; letter-spacing: -0.02em; line-height: 1.1;
          margin-bottom: 1.25rem;
          color: #f1f5f9;
        }
        .sp-section-title .sp-accent { color: #f59e0b; }
        .sp-section-desc {
          color: #94a3b8; font-size: 1.05rem; line-height: 1.75;
          max-width: 640px; margin: 0 auto;
        }

        /* Divider */
        .sp-divider {
          width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,179,237,0.2), transparent);
          margin: 0 auto;
        }

        /* Stats band */
        .sp-stats-band {
          background: linear-gradient(135deg, rgba(14,165,233,0.07) 0%, rgba(59,130,246,0.07) 100%);
          border-top: 1px solid rgba(99,179,237,0.1);
          border-bottom: 1px solid rgba(99,179,237,0.1);
          padding: 4rem 1.5rem;
        }
        .sp-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 2rem; max-width: 900px; margin: 0 auto;
          text-align: center;
        }
        .sp-stat-card { padding: 1rem; }
        .sp-stat-value {
          display: block; font-size: 3rem; font-weight: 900;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1;
          margin-bottom: 0.5rem;
        }
        .sp-stat-label { color: #94a3b8; font-size: 0.9rem; font-weight: 500; }

        /* Reveal animation */
        .sp-reveal {
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .sp-reveal-active { opacity: 1; transform: translateY(0); }

        /* Services grid */
        .sp-services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem; margin-top: 3.5rem;
        }
        .sp-service-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 2rem;
          transition: all 0.35s ease;
          position: relative; overflow: hidden;
        }
        .sp-service-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(14,165,233,0.06), rgba(59,130,246,0.06));
          opacity: 0; transition: opacity 0.35s;
        }
        .sp-service-card:hover { transform: translateY(-6px); border-color: rgba(14,165,233,0.3); }
        .sp-service-card:hover::before { opacity: 1; }
        .sp-service-icon {
          font-size: 2.2rem; margin-bottom: 1rem; display: block;
          filter: drop-shadow(0 0 8px rgba(14,165,233,0.3));
        }
        .sp-service-title { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.6rem; }
        .sp-service-desc { color: #64748b; font-size: 0.93rem; line-height: 1.65; }

        /* Why SkyPilot */
        .sp-why-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem; margin-top: 3.5rem;
        }
        .sp-why-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 1.75rem;
          transition: all 0.3s ease;
        }
        .sp-why-card:hover { border-color: rgba(245,158,11,0.3); transform: translateY(-4px); background: rgba(245,158,11,0.03); }
        .sp-why-icon { font-size: 2rem; margin-bottom: 0.75rem; display: block; }
        .sp-why-title { font-size: 1rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.5rem; }
        .sp-why-desc { color: #64748b; font-size: 0.9rem; line-height: 1.6; }

        /* Founder section */
        .sp-founder-section {
          padding: 6rem 1.5rem;
          background: linear-gradient(135deg, rgba(14,165,233,0.04) 0%, rgba(59,130,246,0.04) 100%);
          border-top: 1px solid rgba(99,179,237,0.08);
          border-bottom: 1px solid rgba(99,179,237,0.08);
        }
        .sp-founder-inner {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1.5fr;
          gap: 4rem; align-items: center;
        }
        .sp-founder-avatar-wrap {
          position: relative; display: flex; justify-content: center;
        }
        .sp-founder-avatar {
          width: 280px; height: 280px; border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6, #f59e0b);
          padding: 4px;
          display: flex; align-items: center; justify-content: center;
          animation: sp-avatar-glow 4s ease-in-out infinite;
        }
        @keyframes sp-avatar-glow {
          0%,100% { box-shadow: 0 0 40px rgba(14,165,233,0.2); }
          50%      { box-shadow: 0 0 80px rgba(14,165,233,0.45); }
        }
        .sp-founder-avatar-inner {
          width: 100%; height: 100%; border-radius: 50%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 6rem;
        }
        .sp-founder-tag {
          position: absolute; bottom: 10px; right: calc(50% - 130px);
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          color: #fff; font-size: 0.75rem; font-weight: 700;
          padding: 0.35rem 0.9rem; border-radius: 999px;
          box-shadow: 0 4px 16px rgba(14,165,233,0.4);
          letter-spacing: 0.05em; white-space: nowrap;
        }
        .sp-founder-name {
          font-size: 2rem; font-weight: 900; color: #f1f5f9;
          letter-spacing: -0.02em; margin-bottom: 0.4rem;
        }
        .sp-founder-role {
          font-size: 0.9rem; font-weight: 600; color: #38bdf8;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }
        .sp-founder-exp {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25);
          color: #f59e0b; font-size: 0.82rem; font-weight: 700;
          padding: 0.35rem 0.9rem; border-radius: 999px; margin-bottom: 1.5rem;
        }
        .sp-founder-bio { color: #94a3b8; font-size: 1rem; line-height: 1.8; margin-bottom: 1.5rem; }
        .sp-founder-quote {
          background: rgba(255,255,255,0.03);
          border-left: 3px solid #38bdf8;
          border-radius: 0 12px 12px 0;
          padding: 1.25rem 1.5rem;
          color: #cbd5e1; font-style: italic; font-size: 0.97rem; line-height: 1.7;
          position: relative;
        }
        .sp-founder-quote::before {
          content: '"'; position: absolute; top: -0.5rem; left: 1rem;
          font-size: 4rem; color: rgba(56,189,248,0.15); font-style: normal;
          line-height: 1; pointer-events: none;
        }

        /* Vision card */
        .sp-vision-card {
          background: linear-gradient(135deg, rgba(14,165,233,0.08), rgba(59,130,246,0.08));
          border: 1px solid rgba(14,165,233,0.2);
          border-radius: 24px; padding: 3rem;
          text-align: center; position: relative; overflow: hidden;
          margin-top: 4rem;
        }
        .sp-vision-card::before {
          content: '🌐'; font-size: 8rem; position: absolute;
          right: -1rem; bottom: -1.5rem; opacity: 0.05;
          pointer-events: none;
        }
        .sp-vision-title {
          font-size: 1.6rem; font-weight: 800; color: #f1f5f9;
          margin-bottom: 1rem;
        }
        .sp-vision-text {
          color: #94a3b8; font-size: 1.05rem; line-height: 1.8;
          max-width: 700px; margin: 0 auto;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .sp-founder-inner { grid-template-columns: 1fr !important; text-align: center; }
          .sp-founder-tag { right: calc(50% - 100px); }
          .sp-services-grid { grid-template-columns: 1fr !important; }
          .sp-why-grid { grid-template-columns: 1fr !important; }
          .sp-founder-avatar { width: 200px; height: 200px; }
          .sp-founder-avatar-inner { font-size: 4rem; }
        }
      `}</style>

      <div className="sp-root">

        {/* HERO */}
        <section className="sp-hero">
          <ParticleCanvas />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="sp-drone-icon">🚁</span>
            <div className="sp-hero-badge">
              <span>✦</span> Aerial Cinematography
            </div>
            <h1 className="sp-hero-title">
              Stories Told<br />From <span className="sp-amber">The Sky</span>
            </h1>
            <p className="sp-hero-sub">
              SkyPilot captures the world from above — with precision, creativity, and a filmmaker's heart. Every frame tells a story. Every flight is an art.
            </p>
            <a href="#capabilities" className="sp-hero-cta">
              Explore Our Capabilities <span>↓</span>
            </a>
          </div>
        </section>

        {/* STATS BAND */}
        <div className="sp-stats-band">
          <div ref={statsRef} className="sp-stats-grid">
            {STATS.map((s, i) => (
              <StatCard key={i} value={s.value} label={s.label} trigger={statsVisible} />
            ))}
          </div>
        </div>

        {/* EXPLORE CAPABILITIES */}
        <section id="capabilities" className="sp-section sp-section-center">
          <Reveal>
            <span className="sp-eyebrow">✦ Explore Our Capabilities</span>
            <h2 className="sp-section-title">What We <span className="sp-accent">Create</span></h2>
            <p className="sp-section-desc">
              From cinematic film productions to social-media-ready reels — SkyPilot delivers aerial visuals that captivate, inspire, and set your brand apart.
            </p>
          </Reveal>

          <div className="sp-services-grid">
            {SERVICES.map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="sp-service-card">
                  <span className="sp-service-icon">{s.icon}</span>
                  <div className="sp-service-title">{s.title}</div>
                  <p className="sp-service-desc">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="sp-divider" />

        {/* FOUNDER */}
        <section className="sp-founder-section" id="founder">
          <div className="sp-founder-inner">
            <Reveal>
              <div className="sp-founder-avatar-wrap">
                <div className="sp-founder-avatar">
                  <div className="sp-founder-avatar-inner">👨‍✈️</div>
                </div>
                <span className="sp-founder-tag">Founder & Director</span>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div>
                <span className="sp-eyebrow">✦ Meet the Founder</span>
                <h2 className="sp-founder-name">Emidi Vinay Kanth</h2>
                <div className="sp-founder-role">Drone Operations Professional</div>
                <span className="sp-founder-exp">🏆 8+ Years of Experience</span>
                <p className="sp-founder-bio">
                  SkyPilot was founded by <strong style={{ color: '#f1f5f9' }}>Emidi Vinay Kanth</strong>, a seasoned drone operations professional with over 8 years of hands-on experience in aerial filming and drone operations. With deep technical expertise and a passion for visual storytelling, Vinay leads SkyPilot with a focus on <em>safety</em>, <em>creativity</em>, and <em>precision</em>. His experience enables the team to plan and execute cinematic aerial shots that meet both creative expectations and operational standards.
                </p>
                <blockquote className="sp-founder-quote">
                  SkyPilot was created to show stories from a new perspective — capturing moments, places, and ideas from the sky with creativity and purpose.
                </blockquote>
              </div>
            </Reveal>
          </div>
        </section>

        {/* THE SKYPILOT DIFFERENCE */}
        <section className="sp-section sp-section-center" id="difference">
          <Reveal>
            <span className="sp-eyebrow">✦ The SkyPilot Difference</span>
            <h2 className="sp-section-title">Why Choose <span className="sp-accent">SkyPilot</span></h2>
            <p className="sp-section-desc">
              At SkyPilot, every flight is carefully planned to balance creative ambition with professional drone operations. We bring experience, technical skill, and a filmmaker's perspective to every project.
            </p>
          </Reveal>

          <div className="sp-why-grid">
            {WHY_ITEMS.map((w, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="sp-why-card">
                  <span className="sp-why-icon">{w.icon}</span>
                  <div className="sp-why-title">{w.title}</div>
                  <p className="sp-why-desc">{w.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Vision card */}
          <Reveal delay={200}>
            <div className="sp-vision-card">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌟</div>
              <h3 className="sp-vision-title">Our Vision</h3>
              <p className="sp-vision-text">
                To be a trusted name in drone cinematography — known for cinematic quality, safe operations, and memorable visual storytelling that connects audiences to the world from above.
              </p>
            </div>
          </Reveal>
        </section>

      </div>
    </>
  );
}
