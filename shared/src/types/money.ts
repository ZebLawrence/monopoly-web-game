export type MoneyDenomination = 1 | 5 | 10 | 20 | 50 | 100 | 500;

export interface CashBreakdown {
  denomination: MoneyDenomination;
  count: number;
}

export const MONEY_DENOMINATIONS: MoneyDenomination[] = [1, 5, 10, 20, 50, 100, 500];

export const STARTING_CASH_BREAKDOWN: CashBreakdown[] = [
  { denomination: 500, count: 2 },
  { denomination: 100, count: 4 },
  { denomination: 50, count: 1 },
  { denomination: 20, count: 1 },
  { denomination: 10, count: 2 },
  { denomination: 5, count: 1 },
  { denomination: 1, count: 5 },
];

export const STARTING_CASH = 1500;
