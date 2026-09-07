import { redirect } from 'next/navigation';

// Public self-registration never existed here in any real sense - the
// backing endpoint always required an authenticated admin session
// (withAdmin), so this page's Admin/Manager/Cashier role dropdown could
// never actually be used by an anonymous visitor. Rather than leave a
// second, confusing "registration" surface next to the real admin-only
// Create User flow at /dashboard/users, this now sends everyone to login.
export default function RegisterRedirect() {
  redirect('/login');
}
