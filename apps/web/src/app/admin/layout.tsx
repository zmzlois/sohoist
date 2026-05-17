import { ReactNode } from "react";

// admin routes are protected by NextAuth proxy and a page-level email check.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
