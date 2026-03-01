import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 760, margin: "64px auto", padding: "0 20px" }}>
      <h1>Silk Worm Cultivator Manager</h1>
      <p className="muted">
        Manage weekly egg slots, farmer bookings, worm inventory, and billing from one system.
        Each breeder account gets an isolated workspace after phone OTP login.
      </p>
      <div className="card">
        <h2>Next steps</h2>
        <ol>
          <li>Sign in with phone OTP.</li>
          <li>Create slot schedule and egg capacity.</li>
          <li>Accept farmer bookings per slot and generate invoices.</li>
        </ol>
        <Link href="/login">Go to Login</Link>
      </div>
    </main>
  );
}
