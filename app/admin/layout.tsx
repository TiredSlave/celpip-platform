"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();
      if (!profile?.is_admin) {
        router.push("/");
        return;
      }
      setChecking(false);
    }
    checkAdmin();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Checking permissions...</p>
      </div>
    );
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/tasks", label: "Tasks", icon: "📝" },
    { href: "/admin/vocabulary-speaking", label: "Speaking vocab", icon: "💬" },
    { href: "/admin/mock-tests", label: "Mock Tests", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 bg-gray-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">CELPIP Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Management Panel</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={"flex items-center gap-3 px-4 py-3 rounded-lg transition " + (pathname === item.href ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800")}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition">
            <span>🏠</span>
            <span>Back to Site</span>
          </a>
        </div>
      </div>
      <div className="ml-64 flex-1 p-8">
        {children}
      </div>
    </div>
  );
}
