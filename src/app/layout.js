import './globals.css'
import MemberCheckScanner from './MemberCheckScanner'
export const metadata = {
  title: 'نظام إدارة الجيم',
  description: 'نظام متكامل لإدارة الجيم والأعضاء',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="flex h-screen bg-gray-900">
          <aside className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                  🏋️
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">نظام الجيم</h1>
                  <p className="text-gray-400 text-xs">Gym Management</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                <NavLink href="/" icon="🏠" label="الرئيسية" />
                <NavLink href="/add-member" icon="➕" label="إضافة عضو جديد" />
                <NavLink href="/members" icon="👥" label="إدارة المشتركين" />
                <NavLink href="/visitors" icon="👥" label="الزائرين" />
              </ul>
            </nav>

            <div className="p-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs text-center">
                © 2025 Gym System v1.0
              </p>
            </div>
          </aside>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
                    <MemberCheckScanner />
        </div>
      </body>
    </html>
  )
}

function NavLink({ href, icon, label }) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition"
      >
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </a>
    </li>
  );
}