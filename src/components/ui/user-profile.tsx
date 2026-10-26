
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User,
  Settings,
  ChevronUp,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { portalForRole } from "@/lib/portals";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfileProps {
  isCollapsed: boolean;
}

export default function UserProfile({ isCollapsed }: UserProfileProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = session?.user;
  const name = user?.name || "User";
  const email = user?.email || "";

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleSignOut = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    const home = `/auth/${portalForRole(
      (user as { role?: string } | undefined)?.role
    ).slug}/sign-in`;

    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.replace(home);
          },
        },
      });
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="w-full border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`flex w-full items-center rounded-lg text-left transition-colors ${
                isCollapsed
                  ? "justify-center p-0 hover:opacity-80"
                  : "gap-3 p-1.5 text-foreground hover:bg-accent"
              }`}
            >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                isCollapsed
                  ? "bg-emerald-500 text-zinc-950"
                  : "bg-emerald-600 tracking-wider text-white"
              }`}
            >
              {initials}
            </div>

            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold leading-tight">
                    {name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {email}
                  </p>
                </div>

                <ChevronUp className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
              </>
            )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side={isCollapsed ? "right" : "top"}
            sideOffset={8}
            className="w-56"
          >
            <div className="mb-1 flex items-center gap-2.5 border-b border-border px-2.5 py-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {email}
                </p>
              </div>
            </div>

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/dashboard/account")}
            >
              <User className="mr-2 size-4" />
              Account
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/dashboard/settings")}
            >
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={logoutOpen}
        onOpenChange={(open) => {
          if (!isLoggingOut) {
            setLogoutOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to log out?
            </AlertDialogTitle>

            <AlertDialogDescription>
              You will need to sign in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={isLoggingOut}
              onClick={(event) => {
                event.preventDefault();
                handleSignOut();
              }}
              className="!bg-emerald-500 !text-zinc-950 font-semibold hover:!bg-emerald-400"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
