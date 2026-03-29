/** Demo-only statuses for mocked application lookups. */
export type ApplicationDemoStatus =
  | "pending_review"
  | "approved"
  | "action_required"
  | "declined";

/** Demo-only statuses for mocked transaction lookups. */
export type TransactionDemoStatus =
  | "completed"
  | "processing"
  | "failed"
  | "refunded"
  | "pending";

const APPLICATION_MESSAGES: Record<ApplicationDemoStatus, string> = {
  pending_review:
    "Your application is with our team for review. We’ll notify you when there’s an update.",
  approved:
    "Your application is approved. You can start using your account as shown in the app.",
  action_required:
    "We need a bit more information before we can continue. Open the app to finish the remaining steps.",
  declined:
    "This application wasn’t approved. Check your email for details or contact support if you have questions.",
};

const TRANSACTION_MESSAGES: Record<TransactionDemoStatus, string> = {
  completed: "This payment went through successfully.",
  processing: "This payment is still processing. Try again in a few minutes.",
  failed: "This payment didn’t complete. You weren’t charged; try again or use another method.",
  refunded: "This charge was refunded to your original payment method.",
  pending: "We’re waiting on the bank to confirm this payment.",
};

function pickByLength<T>(str: string, options: readonly T[]): T {
  const len = str.length;
  return options[len % options.length]!;
}

/**
 * Mock application status — deterministic from applicationId or email string length.
 */
export function getApplicationStatus(params: {
  applicationId?: string;
  email?: string;
}): {
  status: ApplicationDemoStatus;
  message: string;
  applicationId?: string;
  email?: string;
} {
  const key = params.applicationId ?? params.email ?? "";
  const status = pickByLength(key, [
    "pending_review",
    "approved",
    "action_required",
    "declined",
  ] as const);

  return {
    status,
    message: APPLICATION_MESSAGES[status],
    ...(params.applicationId !== undefined && {
      applicationId: params.applicationId,
    }),
    ...(params.email !== undefined && { email: params.email }),
  };
}

/**
 * Mock transaction status — deterministic from transactionId length.
 */
export function getTransactionStatus(params: {
  transactionId: string;
}): {
  status: TransactionDemoStatus;
  message: string;
  transactionId: string;
} {
  const status = pickByLength(params.transactionId, [
    "completed",
    "processing",
    "failed",
    "refunded",
    "pending",
  ] as const);

  return {
    status,
    message: TRANSACTION_MESSAGES[status],
    transactionId: params.transactionId,
  };
}

/** OpenAI-compatible tool schemas for future function-calling. */
export const customerToolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "report_mistake",
      description:
        "Record when the user reports a factual mistake or bad answer.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "What went wrong" },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_application_status",
      description:
        "Look up demo application status by application ID or email (mock data).",
      parameters: {
        type: "object",
        properties: {
          applicationId: { type: "string" },
          email: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_transaction_status",
      description:
        "Look up demo transaction status by transaction ID (mock data).",
      parameters: {
        type: "object",
        properties: {
          transactionId: { type: "string" },
        },
        required: ["transactionId"],
      },
    },
  },
];
