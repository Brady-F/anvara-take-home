'use client';

import { PendingLabel } from '@/app/components/skeleton';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/auth-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'sponsor' | 'publisher'>('sponsor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-fill credentials based on selected role
  const email = role === 'sponsor' ? 'sponsor@example.com' : 'publisher@example.com';
  const password = 'password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Use Better Auth signIn.email with proper callbacks
    const { error: signInError } = await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: () => {
          setLoading(true);
        },
        onSuccess: async (ctx) => {
          // Fetch user role to determine redirect
          try {
            const userId = ctx.data?.user?.id;
            if (userId) {
              const roleRes = await fetch(`${API_URL}/api/auth/role/${userId}`, {
                credentials: 'include',
              });
              const roleData = await roleRes.json();
              if (roleData.role === 'sponsor') {
                router.push('/dashboard/sponsor');
              } else if (roleData.role === 'publisher') {
                router.push('/dashboard/publisher');
              } else {
                router.push('/');
              }
            } else {
              router.push('/');
            }
          } catch {
            router.push('/');
          }
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Login failed');
          setLoading(false);
        },
      }
    );

    // Handle any errors not caught by onError callback
    if (signInError) {
      setError(signInError.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="app-surface account-page">
      <div className="account-panel">
        <p className="dashboard-eyebrow">Welcome back</p>
        <h1>Login to Anvara</h1>
        <p className="dashboard-muted mt-3 mb-8">
          Choose a demo account to explore your workspace.
        </p>

        {error && (
          <div role="alert" className="dashboard-form-error mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-role" className="block text-sm font-medium">
              Account type
            </label>
            <select
              id="login-role"
              value={role}
              disabled={loading}
              onChange={(e) => setRole(e.target.value as 'sponsor' | 'publisher')}
              className="dashboard-input"
            >
              <option value="sponsor">Sponsor</option>
              <option value="publisher">Publisher</option>
            </select>
            <p className="dashboard-muted mt-2 text-sm">{email}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="dashboard-button dashboard-button-primary w-full"
          >
            <PendingLabel
              pending={loading}
              label="Logging in..."
            >{`Login as ${role === 'sponsor' ? 'Sponsor' : 'Publisher'}`}</PendingLabel>
          </button>
        </form>
      </div>
    </div>
  );
}
