import Link from 'next/link';

export default function Home() {
  return (
    <div className="app-surface welcome-page">
      <p className="dashboard-eyebrow">The sponsorship marketplace</p>
      <h1>Welcome to Anvara</h1>
      <p className="dashboard-muted mx-auto mt-4 mb-8 max-w-md">
        The sponsorship marketplace connecting sponsors with publishers.
      </p>

      <div>
        <Link href="/login" className="dashboard-button dashboard-button-primary">
          Get Started
        </Link>
      </div>

      <div className="welcome-roles">
        <div className="dashboard-card">
          <h2>For sponsors</h2>
          <p className="dashboard-card-description">
            Create campaigns, set budgets, and reach your target audience through premium
            publishers.
          </p>
        </div>
        <div className="dashboard-card">
          <h2>For publishers</h2>
          <p className="dashboard-card-description">
            List your ad slots, set your rates, and connect with sponsors looking for your audience.
          </p>
        </div>
      </div>
    </div>
  );
}
