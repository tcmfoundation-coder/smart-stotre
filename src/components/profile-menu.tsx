'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  User as UserIcon,
  Settings,
  KeyRound,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';

interface ProfileMenuProps {
  role: UserRole;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ProfileMenu({ role }: ProfileMenuProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // manage_settings (admin only) gates the broader System Settings page;
  // everyone else can still reach Security (password/2FA) directly - see
  // src/app/dashboard/settings/page.tsx.
  const canAccessFullSettings = hasPermission(role, 'manage_settings');

  const handleLogout = async () => {
    try {
      await fetch('/api/user-activity/end-session', { method: 'POST' });
    } catch (error) {
      console.error('Failed to end activity session:', error);
    }
    await signOut({ callbackUrl: '/login' });
  };

  const name = session?.user?.name || 'User';
  const email = session?.user?.email || '';
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring group"
          aria-label="Account menu"
        >
          <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20">
            {initial}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-foreground leading-none max-w-[9rem] truncate">{name}</p>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">{role}</p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2.5">
          <p className="text-sm font-bold text-foreground truncate">{name}</p>
          {email && <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>}
          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
            {role}
          </span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Profile</span>
        </DropdownMenuItem>

        {canAccessFullSettings && (
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => router.push('/dashboard/settings?tab=security')}>
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span>Change Password</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {mounted && theme === 'dark' ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : mounted && theme === 'light' ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Monitor className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
              {THEME_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <option.icon className="h-4 w-4 text-muted-foreground mr-1" />
                  <span>{option.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
