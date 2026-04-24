import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";
import { PermissionProvider } from "@/components/permission-provider";
import { setAuthSession } from "@/lib/auth-session";
import { normalizePermissionMatrix } from "@/lib/permissions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppSidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides navigation items when read permission is missing", () => {
    setAuthSession("token-123", {
      id: 1,
      name: "Reader",
      email: "reader@rpg.com",
      role: "staff",
      permissions: normalizePermissionMatrix({
        dashboard: ["read"],
        sales: ["read"],
      }),
    });

    render(
      <PermissionProvider>
        <AppSidebar
          isCollapsed={false}
          isMobileOpen={false}
          onToggleCollapse={vi.fn()}
          onCloseMobile={vi.fn()}
          onLogout={vi.fn()}
        />
      </PermissionProvider>,
    );

    expect(screen.getByText("All Sales")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Sellers")).not.toBeInTheDocument();
    expect(screen.queryByText("Payments")).not.toBeInTheDocument();
  });
});
