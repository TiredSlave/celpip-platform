"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import SiteFooter from "./SiteFooter";
import CustomerSupportChat from "./CustomerSupportChat";

// Task pages that use full-screen layout — no navbar
const HIDE_NAVBAR = [
  "/practice/writing/task",
  "/practice/reading/task",
  "/practice/speaking/task",
  "/practice/listening/task",
  "/admin",
];

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar =
    HIDE_NAVBAR.some(p => pathname?.startsWith(p)) ||
    Boolean(pathname?.match(/\/mock-test\/[^/]+\/(take|review)/));

  return (
    <div className="flex min-h-screen flex-col">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideNavbar && <SiteFooter />}
      <CustomerSupportChat />
    </div>
  );
}
