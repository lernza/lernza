"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  CalendarIcon,
  HomeIcon,
  LibraryIcon,
  LogOutIcon,
  MessageSquareIcon,
  NotebookIcon,
  PieChartIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  MenuIcon,
  XIcon,
} from "lucide-react"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: HomeIcon,
    },
    {
      name: "Teachers",
      href: "/teachers",
      icon: UserIcon,
    },
    {
      name: "Students",
      href: "/students",
      icon: UsersIcon,
    },
    {
      name: "Attendance",
      href: "/attendance",
      icon: NotebookIcon,
    },
    {
      name: "Finance",
      href: "/finance",
      icon: PieChartIcon,
    },
    {
      name: "Notice",
      href: "/notice",
      icon: MessageSquareIcon,
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: CalendarIcon,
    },
    {
      name: "Library",
      href: "/library",
      icon: LibraryIcon,
    },
    {
      name: "Message",
      href: "/message",
      icon: MessageSquareIcon,
    },
    {
      name: "Setting",
      href: "/setting",
      icon: SettingsIcon,
    },
    {
      name: "Log out",
      href: "/logout",
      icon: LogOutIcon,
    },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <MenuIcon className="h-6 w-6" />
      </Button>

      {/* Sidebar for mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
        <nav className={cn("relative h-full w-64 max-w-[80%] bg-white shadow-xl", className)}>
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal bg-opacity-20">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 1.5C7.4087 1.5 5.88258 2.13214 4.75736 3.25736C3.63214 4.38258 3 5.9087 3 7.5C3 9.0913 3.63214 10.6174 4.75736 11.7426C5.88258 12.8679 7.4087 13.5 9 13.5C10.5913 13.5 12.1174 12.8679 13.2426 11.7426C14.3679 10.6174 15 9.0913 15 7.5C15 5.9087 14.3679 4.38258 13.2426 3.25736C12.1174 2.13214 10.5913 1.5 9 1.5ZM5.25 7.5C5.25 6.50544 5.64509 5.55161 6.34835 4.84835C7.05161 4.14509 8.00544 3.75 9 3.75C9.99456 3.75 10.9484 4.14509 11.6517 4.84835C12.3549 5.55161 12.75 6.50544 12.75 7.5C12.75 8.49456 12.3549 9.44839 11.6517 10.1517C10.9484 10.8549 9.99456 11.25 9 11.25C8.00544 11.25 7.05161 10.8549 6.34835 10.1517C5.64509 9.44839 5.25 8.49456 5.25 7.5Z"
                    fill="#4ABDE8"
                  />
                  <path
                    d="M9 13.5C6.0975 13.5 3.75 15.8475 3.75 18.75V19.5H14.25V18.75C14.25 15.8475 11.9025 13.5 9 13.5ZM6 18V17.25C6 16.0074 7.00736 15 8.25 15H9.75C10.9926 15 12 16.0074 12 17.25V18H6Z"
                    fill="#4ABDE8"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-darkGray">SchoolHub</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
              <XIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="space-y-1 px-3 py-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === item.href ? "bg-lightBlue text-darkGray" : "text-gray hover:bg-gray-100",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Sidebar for desktop */}
      <div className={cn("fixed hidden h-full w-[200px] flex-col bg-white md:flex", className)}>
        <div className="flex items-center space-x-2 px-6 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal bg-opacity-20">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 1.5C7.4087 1.5 5.88258 2.13214 4.75736 3.25736C3.63214 4.38258 3 5.9087 3 7.5C3 9.0913 3.63214 10.6174 4.75736 11.7426C5.88258 12.8679 7.4087 13.5 9 13.5C10.5913 13.5 12.1174 12.8679 13.2426 11.7426C14.3679 10.6174 15 9.0913 15 7.5C15 5.9087 14.3679 4.38258 13.2426 3.25736C12.1174 2.13214 10.5913 1.5 9 1.5ZM5.25 7.5C5.25 6.50544 5.64509 5.55161 6.34835 4.84835C7.05161 4.14509 8.00544 3.75 9 3.75C9.99456 3.75 10.9484 4.14509 11.6517 4.84835C12.3549 5.55161 12.75 6.50544 12.75 7.5C12.75 8.49456 12.3549 9.44839 11.6517 10.1517C10.9484 10.8549 9.99456 11.25 9 11.25C8.00544 11.25 7.05161 10.8549 6.34835 10.1517C5.64509 9.44839 5.25 8.49456 5.25 7.5Z"
                fill="#4ABDE8"
              />
              <path
                d="M9 13.5C6.0975 13.5 3.75 15.8475 3.75 18.75V19.5H14.25V18.75C14.25 15.8475 11.9025 13.5 9 13.5ZM6 18V17.25C6 16.0074 7.00736 15 8.25 15H9.75C10.9926 15 12 16.0074 12 17.25V18H6Z"
                fill="#4ABDE8"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-darkGray">SchoolHub</span>
        </div>

        <div className="mt-6 space-y-[22px] px-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href ? "bg-lightBlue text-darkGray" : "text-gray hover:bg-gray-100",
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

