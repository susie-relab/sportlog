export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <a href="/" className="text-blue-400 text-sm hover:text-blue-300">Go home</a>
      </div>
    </div>
  );
}
