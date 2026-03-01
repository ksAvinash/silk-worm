"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-glow" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />

      <nav className="landing-nav">
        <p className="landing-brand">Silk Worm Ops</p>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#start">Start</a>
        </div>
        <Link className="landing-nav-cta" href="/login">
          Login
        </Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">For cultivators and farmers</p>
          <h1>Plan each batch, sell with confidence, and track every payment.</h1>
          <p>
            Keep your weekly silkworm cycle organized from egg planning to farmer booking and final collection.
          </p>
          <div className="landing-actions">
            <Link href="/login" className="primary-cta">
              Open Dashboard
            </Link>
            <a href="#features" className="secondary-cta">
              See Features
            </a>
          </div>
        </div>

        <aside className="landing-panel">
          <p className="panel-label">This Week</p>
          <h2>Batch Summary</h2>
          <div className="panel-row">
            <span>Planned slots</span>
            <strong>3</strong>
          </div>
          <div className="panel-row">
            <span>Farmer bookings</span>
            <strong>24</strong>
          </div>
          <div className="panel-row">
            <span>Ready to deliver</span>
            <strong>2,400</strong>
          </div>
          <div className="panel-row">
            <span>Pending amount</span>
            <strong>Rs 1,82,000</strong>
          </div>
        </aside>
      </section>

      <section id="features" className="landing-section">
        <p className="eyebrow">Features</p>
        <h2>Everything needed for daily farm operations</h2>
        <div className="landing-cards">
          <article className="landing-card">
            <h3>Slots</h3>
            <p>Create weekly or custom batch slots with quantity limits.</p>
          </article>
          <article className="landing-card">
            <h3>Bookings</h3>
            <p>Book farmer quantities and always know your balance stock.</p>
          </article>
          <article className="landing-card">
            <h3>Inventory</h3>
            <p>Track eggs, hatched worms, dispatches, and wastage.</p>
          </article>
          <article className="landing-card">
            <h3>Billing</h3>
            <p>Generate bills, record collections, and monitor dues.</p>
          </article>
        </div>
      </section>

      <section id="workflow" className="landing-section">
        <p className="eyebrow">Workflow</p>
        <h2>Simple process from start to sale</h2>
        <div className="landing-steps">
          <div>
            <span>01</span>
            <h3>Plan batch</h3>
            <p>Set dates and total quantity for each slot.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Take bookings</h3>
            <p>Assign farmer quantities for each slot.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Collect payments</h3>
            <p>Bill farmers and follow up pending payments.</p>
          </div>
        </div>
      </section>

      <section id="start" className="landing-section">
        <div className="landing-start">
          <h2>Ready to use</h2>
          <p>Login with phone number and start managing your next batch today.</p>
          <Link href="/login" className="primary-cta">
            Go to Login
          </Link>
        </div>
      </section>
    </main>
  );
}
