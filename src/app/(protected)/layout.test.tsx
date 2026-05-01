import { render, waitFor } from "@testing-library/react";
import ProtectedLayout from "@/app/(protected)/layout";
import { setAuthSession } from "@/lib/auth-session";
import { normalizePermissionMatrix } from "@/lib/permissions";

const replaceSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceSpy,
  }),
  usePathname: () => "/users",
}));

vi.mock("@/lib/auth-api", () => ({
  getMe: vi.fn().mockResolvedValue({
    id: 1,
    name: "Reader",
    email: "reader@rpg.com",
    role: "staff",
    permissions: {
      dashboard: ["read"],
      sales: [],
      maintenance: [],
      inventory: [],
      brands: [],
      products: [],
      bikes: [],
      "spare-parts": [],
      "maintenance-services": [],
      users: [],
      "import-export": [],
      "payment-methods": [],
      "product-categories": [],
      "spare-part-categories": [],
      "bike-blueprints": [],
      sellers: [],
    },
  }),
  logout: vi.fn(),
}));

describe("ProtectedLayout", () => {
  beforeEach(() => {
    replaceSpy.mockClear();
    window.localStorage.clear();
  });

  it("redirects to the first allowed route when the current page is unreadable", async () => {
    setAuthSession("token-123", {
      id: 1,
      name: "Reader",
      email: "reader@rpg.com",
      role: "staff",
      permissions: normalizePermissionMatrix({
        dashboard: ["read"],
      }),
    });

    render(
      <ProtectedLayout>
        <div>Protected content</div>
      </ProtectedLayout>,
    );

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/");
    });
  });
});
