"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

// Task pages that use full-screen layout — no navbar
const HIDE_NAVBAR = ["/writing", "/reading", "/speaking", "/listening", "/admin"];

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = HIDE_NAVBAR.some(p => pathname?.startsWith(p));

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </>
  );
}
