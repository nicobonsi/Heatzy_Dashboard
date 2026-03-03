import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Connexion — Heatzy' };

export default function LoginPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${basePath}/heatzy-logo.png`}
            alt="Heatzy"
            className="h-10 w-auto mx-auto mb-4"
          />
          <p className="text-gray-500 text-sm">
            Connectez-vous avec vos identifiants Heatzy
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
