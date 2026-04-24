import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PermissionsEditor } from "@/components/permissions-editor";
import { ALL_PAGE_PATHS, normalizePermissionMatrix } from "@/lib/permissions";

describe("PermissionsEditor", () => {
  it("renders all 16 permission rows", () => {
    render(
      <PermissionsEditor
        userId={7}
        userName="Mona"
        currentRole="staff"
        initialPermissions={normalizePermissionMatrix({})}
        onSave={vi.fn()}
      />,
    );

    for (const page of ALL_PAGE_PATHS) {
      expect(screen.getByText(page)).toBeInTheDocument();
    }
  });

  it("submits the full normalized matrix after toggling actions", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PermissionsEditor
        userId={7}
        userName="Mona"
        currentRole="staff"
        initialPermissions={normalizePermissionMatrix({
          dashboard: ["read"],
        })}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText("Sales read"));
    await user.click(screen.getByLabelText("Users update"));
    await user.click(screen.getByRole("button", { name: "Save Permissions" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const submittedMatrix = onSave.mock.calls[0][0];

    expect(submittedMatrix.dashboard).toEqual(["read"]);
    expect(submittedMatrix.sales).toEqual(["read"]);
    expect(submittedMatrix.users).toEqual(["update"]);
    expect(Object.keys(submittedMatrix)).toHaveLength(ALL_PAGE_PATHS.length);
    expect(submittedMatrix["payment-methods"]).toEqual([]);
  });
});
