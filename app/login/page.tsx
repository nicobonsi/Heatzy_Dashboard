import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Connexion — Heatzy Dashboard' };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌡</div>
          <h1 className="text-2xl font-bold text-gray-900">Heatzy Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Connectez-vous avec vos identifiants Heatzy
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
