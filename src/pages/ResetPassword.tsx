import { useState, FormEvent } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { auth } from '../lib/mockAuth';

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await auth.resetPassword(email);

    if (result.success) {
      setIsSuccess(true);
    } else {
      setError(result.error || 'Failed to send reset email');
    }

    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg">
          <div className="space-y-6 text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-success" aria-hidden="true" />
            </div>

            {/* Success Message */}
            <div>
              <h2 className="text-2xl font-medium text-neutral-900 mb-2">Check Your Email</h2>
              <p className="text-neutral-600">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            {/* Instructions */}
            <div className="text-sm text-neutral-600 space-y-2">
              <p>Click the link in the email to reset your password.</p>
              <p>If you don't see the email, check your spam folder.</p>
            </div>

            {/* Back to Login */}
            <a
              href="/login"
              className="inline-flex items-center gap-2 text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to sign in
            </a>

            {/* Resend Link */}
            <div className="pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-600">
                Didn't receive the email?{' '}
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-lg">
        <div className="space-y-6">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                BS
              </div>
            </div>
            <h2 className="text-2xl font-medium text-neutral-900 mb-2">Reset Password</h2>
            <p className="text-neutral-600">Enter your email to receive a reset link</p>
          </div>

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="p-3 rounded bg-error/5 border border-error/20 text-error text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-neutral-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-primary text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <a
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
