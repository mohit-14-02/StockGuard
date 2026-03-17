import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#FAFAF7]">
      {/* Sidebar — hidden on small screens, handled by hamburger */}
      <div className="hidden md:block w-64 shrink-0">
        <Sidebar />
      </div>
      {/* Mobile sidebar (rendered inside Sidebar component) */}
      <div className="md:hidden">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 w-full min-w-0">
        {children}
      </div>
    </div>
  )
}
