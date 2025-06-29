import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-6xl font-bold text-white/20 mb-4">404</h2>
        <h3 className="text-2xl font-semibold text-white mb-2">Page Not Found</h3>
        <p className="text-white/60 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="bg-green-500/20 text-green-400 px-6 py-3 rounded-lg hover:bg-green-500/30 transition-colors inline-block"
        >
          Return to ParkSphere
        </Link>
      </div>
    </div>
  );
}