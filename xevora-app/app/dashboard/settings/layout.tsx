"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Company", href: "/dashboard/settings" },
  { label: "Clients", href: "/dashboard/settings/clients" },
  { label: "Pay Rules", href: "/dashboard/settings/pay-rules" },
  { label: "GPS", href: "/dashboard/settings/gps" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard/settings") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-56 lg:border-r lg:border-[rgba(37,99,235,0.12)] lg:bg-[#060B14]">
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg border-l-2 px-4 py-2.5 text-sm font-medium transition-all ${
                isActive(item.href)
                  ? "border-[#3B82F6] bg-[rgba(37,99,235,0.08)] text-[#3B82F6]"
                  : "border-transparent text-[#4E6D92] hover:bg-[rgba(37,99,235,0.04)] hover:text-[#F1F5FF]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Tab Bar */}
      <div className="flex overflow-x-auto border-b border-[rgba(37,99,235,0.12)] bg-[#060B14] lg:hidden">
        <nav className="flex gap-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive(item.href)
                  ? "bg-[rgba(37,99,235,0.12)] text-[#3B82F6]"
                  : "text-[#4E6D92] hover:bg-[rgba(37,99,235,0.04)] hover:text-[#F1F5FF]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
