export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center border border-gray-700 shadow-2xl">
        <div className="text-8xl mb-4">404</div>
        <h2 className="text-2xl font-bold text-white mb-4">الصفحة غير موجودة</h2>
        <p className="text-gray-400 mb-6">
          عذراً، الصفحة التي تبحث عنها غير موجودة
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition"
        >
          🏠 العودة للرئيسية
        </a>
      </div>
    </div>
  );
}