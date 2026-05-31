import Link from "next/link";
import { SITE_DISCLAIMER, SITE_DOMAIN, SITE_NAME } from "../lib/brand";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="font-bold text-gray-900">{SITE_NAME}</p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{SITE_DISCLAIMER}</p>
            <p className="mt-2 text-xs text-gray-500">{SITE_DOMAIN}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-600">
            <Link href="/practice" className="hover:text-blue-600">Practice</Link>
            <Link href="/templates" className="hover:text-blue-600">Templates</Link>
            <Link href="/mock-test" className="hover:text-blue-600">Mock tests</Link>
            <Link href="/signup" className="hover:text-blue-600">Sign up</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
