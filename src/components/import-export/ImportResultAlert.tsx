import { ImportResult } from "@/types/import-export";
import { InlineMessage } from "@/components/ops-ui";
import { useState } from "react";

type Props = {
  result: ImportResult | null;
  httpError?: string | null;
};

export function ImportResultAlert({ result, httpError }: Props) {
  const [showAllErrors, setShowAllErrors] = useState(false);

  if (!result && !httpError) return null;

  if (httpError) {
    return <InlineMessage tone="danger">{httpError}</InlineMessage>;
  }

  if (result) {
    const createdCount = result.created_count ?? 0;
    const restoredCount = result.restored_count ?? 0;
    const skippedCount = result.skipped_count ?? 0;
    const skippedDuplicates = result.skipped_duplicates ?? [];
    const restoredRecords = result.restored_records ?? [];
    const allMessages = [...result.errors, ...restoredRecords, ...skippedDuplicates];

    if (allMessages.length === 0 && skippedCount === 0 && restoredCount === 0) {
      return (
        <InlineMessage tone="success">
          <div className="font-semibold mb-1">{result.message}</div>
          <div className="text-sm opacity-90">Created: {createdCount}</div>
        </InlineMessage>
      );
    }

    const displayedMessages = showAllErrors ? allMessages : allMessages.slice(0, 5);

    return (
      <InlineMessage tone="warning">
        <div className="font-semibold mb-2">{result.message}</div>
        <div className="mb-3 text-sm opacity-90">
          Created: {createdCount} | Restored: {restoredCount} | Skipped: {skippedCount}
        </div>
        <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
          {displayedMessages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
        {allMessages.length > 5 && (
          <button
            className="mt-3 text-xs font-semibold underline hover:no-underline"
            onClick={() => setShowAllErrors(!showAllErrors)}
          >
            {showAllErrors ? "Show less" : `Show ${allMessages.length - 5} more`}
          </button>
        )}
      </InlineMessage>
    );
  }

  return null;
}
