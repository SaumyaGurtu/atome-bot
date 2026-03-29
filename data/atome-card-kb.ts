export const ATOME_CARD_KB_FALLBACK = [
  {
    title: "Atome Card Overview",
    url: "https://help.atome.ph/hc/en-gb/categories/4439682039065-Atome-Card",
    text: `
Atome Card is a card product offered through Atome support channels.
Customers may have questions about card usage, repayments, eligibility, activation,
application review, failed transactions, and support processes.
`,
  },
  {
    title: "Card Application Status",
    url: "https://help.atome.ph/hc/en-gb/categories/4439682039065-Atome-Card",
    text: `
Application status questions should be handled through a function.
The bot should not guess application status.
Possible statuses include: under review, approved, rejected, requires more information.
`,
  },
  {
    title: "Failed Transactions",
    url: "https://help.atome.ph/hc/en-gb/categories/4439682039065-Atome-Card",
    text: `
If a transaction fails, the bot should ask for transaction ID.
After that, it should check status using a function.
Possible statuses include insufficient funds, timeout, reversal, or success.
`,
  },
];