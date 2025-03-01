import { AttendanceChart } from "@/components/attendance-chart"
import { Calendar } from "@/components/calendar"
import { DashboardMetrics } from "@/components/dashboard-metrics"
import { EarningsChart } from "@/components/earnings-chart"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Messages } from "@/components/messages"
import { NoticeBoard } from "@/components/notice-board"
import { RecentActivity } from "@/components/recent-activity"
import { Sidebar } from "@/components/sidebar"
import { StudentActivity } from "@/components/student-activity"
import { StudentsChart } from "@/components/students-chart"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-[200px]">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <div className="grid grid-cols-1 gap-6">
            <DashboardMetrics />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <StudentsChart />
                  <AttendanceChart />
                </div>
              </div>
              <div className="lg:col-span-1">
                <Calendar />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <EarningsChart />
              </div>
              <div className="lg:col-span-1">
                <Messages />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <StudentActivity />
              </div>
              <div className="lg:col-span-1">
                <NoticeBoard />
              </div>
              <div className="lg:col-span-1">
                <RecentActivity />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}

