import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#FAFAF7] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar — hidden on small screens, handled by hamburger */}
      <div className="hidden md:block w-64 shrink-0">
        <Sidebar />
      </div>
      {/* Mobile sidebar (rendered inside Sidebar component) */}
      <div className="md:hidden">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 w-full min-w-0 flex flex-col">
        <TopHeader />
        <div className="flex-1 p-2 md:p-6 lg:p-10 w-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
