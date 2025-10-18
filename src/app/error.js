'use client';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center border border-gray-700 shadow-2xl">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-4">حدث خطأ!</h2>
        <p className="text-gray-400 mb-6">
          {error?.message || 'حدث خطأ غير متوقع'}
        </p>
        <button
          onClick={() => reset()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition"
        >
          🔄 حاول مرة أخرى
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="block w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition"
        >
          🏠 العودة للرئيسية
        </button>
      </div>
    </div>
  );
}