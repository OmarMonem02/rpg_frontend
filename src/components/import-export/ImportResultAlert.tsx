import type { ImportResult } from "@/types/import-export";
import { InlineMessage } from "@/components/ops-ui";

type Props = {
  result: ImportResult | null;
  httpError?: string | null;
};

export function ImportResultAlert({ result, httpError }: Props) {
  if (!result && !httpError) return null;

  if (httpError) {
    return <InlineMessage tone="danger">{httpError}</InlineMessage>;
  }

  if (!result) return null;

  const summary = result.summary;
  const issueRows = result.rows.filter((row) => row.issues.length > 0).slice(0, 6);

  return (
    <InlineMessage tone={summary.skipped_count > 0 ? "warning" : "success"}>
      <div className="font-semibold">{result.message}</div>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-4">
        <span>Created: {summary.created_count}</span>
        <span>Restored: {summary.restored_count}</span>
        <span>Skipped: {summary.skipped_count}</span>
        <span>Total: {summary.total_rows}</span>
      </div>
      {issueRows.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {issueRows.map((row) => (
            <li key={row.row_number}>
              Row {row.row_number}: {row.issues.map((issue) => issue.message).join(" ")}
            </li>
          ))}
        </ul>
      ) : null}
    </InlineMessage>
  );
}
