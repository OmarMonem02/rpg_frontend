import type { ImportResult } from "@/types/import-export";
import { InlineMessage } from "@/components/ops-ui";
import { ImportIssueActionButton } from "./ImportIssueAction";

type Props = {
  result: ImportResult | null;
  httpError?: string | null;
  onIssueResolved?: () => Promise<void>;
};

export function ImportResultAlert({ result, httpError, onIssueResolved }: Props) {
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
        <ul className="mt-3 space-y-3 pl-0 text-sm">
          {issueRows.map((row) => (
            <li key={row.row_number} className="list-none rounded-xl border border-outline-variant/15 bg-surface p-3">
              <p className="font-medium text-on-surface">
                Row {row.row_number}
              </p>
              <ul className="mt-2 space-y-2 text-on-surface-variant">
                {row.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>
                    <span>{issue.message}</span>
                    {issue.action && onIssueResolved ? (
                      <ImportIssueActionButton
                        action={issue.action}
                        onResolved={onIssueResolved}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </InlineMessage>
  );
}
