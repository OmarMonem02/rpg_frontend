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
    if (result.errors.length === 0) {
      return <InlineMessage tone="success">✅ {result.message}</InlineMessage>;
    }

    const displayedErrors = showAllErrors ? result.errors : result.errors.slice(0, 5);

    return (
      <InlineMessage tone="warning">
        <div className="font-semibold mb-2">⚠️ {result.message}</div>
        <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
          {displayedErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
        {result.errors.length > 5 && (
          <button
            className="mt-3 text-xs font-semibold underline hover:no-underline"
            onClick={() => setShowAllErrors(!showAllErrors)}
          >
            {showAllErrors ? "Show less" : `Show ${result.errors.length - 5} more`}
          </button>
        )}
      </InlineMessage>
    );
  }

  return null;
}
