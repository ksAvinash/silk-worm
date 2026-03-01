import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 760, margin: "64px auto", padding: "0 20px" }}>
      <h1>Silk Worm Cultivator Manager</h1>
      <p className="muted">
        Plan your weekly batches, take farmer bookings, track stock, and manage payments in one place.
      </p>
      <div className="card">
        <h2>Get Started</h2>
        <ol>
          <li>Sign in with your phone number.</li>
          <li>Create your next batch and set quantity.</li>
          <li>Add farmer bookings and track billing.</li>
        </ol>
        <Link href="/login">Go to Login</Link>
      </div>
    </main>
  );
}
