/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 3.2.1263 on 2025-08-07 20:48:28.

export interface AccountSummaryDTO {
    topHoldings: HoldingDTO[];
    topCoins: TopCoinDTO[];
}

export interface BinanceAccountDTO {
    balances: BalanceDTO[];
}

export interface BinanceCredentialDTO {
    apiKey: string;
    secretKey: string;
}

export interface BinanceTokenDTO {
    id: number;
    apiKey: string;
    secretKey: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CoinInfoDTO {
    symbol: string;
    free: number;
    locked: number;
    trades: TradeDTO[];
}

export interface CoinPortfolioEntryDTO {
    symbol: string;
    free: number;
    locked: number;
    eurValue: number;
    trades: TradeDTO[];
}

export interface FullPortfolioDTO {
    topMarketCoins: TopCoinDTO[];
    myCoins: CoinPortfolioEntryDTO[];
    totalEurValue: number;
}

export interface HoldingDTO {
    asset: string;
    free: number;
    locked: number;
    totalValue: number;
}

export interface PortfolioSummaryDTO {
    topCoins: TopCoinDTO[];
    holdings: CoinInfoDTO[];
    totalEurValue: number;
}

export interface RevolutTransactionDTO {
    date: Date;
    description: string;
    sentAmount: number;
    receivedAmount: number;
}

export interface TickerPriceDTO {
    symbol: string;
    lastPrice: number;
    volume: number;
    priceChangePercent: number;
    quoteVolume: number;
    highPrice: number;
    lowPrice: number;
    openPrice: number;
}

export interface TopCoinDTO {
    symbol: string;
    lastPrice: number;
    priceChangePercent: number;
    volume: number;
    quoteVolume: number;
    highPrice: number;
    lowPrice: number;
}

export interface TradeDTO {
    symbol: string;
    id: number;
    price: string;
    qty: string;
    time: number;
    isBuyer: boolean;
    isMaker: boolean;
}

export interface PagedResponseDTO<T> {
    items: T[];
    page: number;
    size: number;
    total: number;
}

export interface BudgetRequestDTO {
    categoryId: number;
    amount: number;
}

export interface BudgetResponseDTO {
    categoryId: number;
    amount: number;
}

export interface CategoryResponseDTO {
    id: number;
    name: string;
}

export interface ChartResponseDTO {
    labels: string[];
    values: number[];
}

export interface DashboardSummaryResponseDTO {
    balance: number;
    budgetUsagePercent: number;
    scheduledCount: number;
}

export interface FullTxRequestDTO {
    type: string;
    amount: number;
    categoryId: number;
    txTime: Date;
    note: string;
    latitude?: number;
    longitude?: number;
}

export interface PlanRequestDTO {
    title: string;
    amount: number;
    dueDate: Date;
}

export interface PlanResponseDTO {
    id: number;
    title: string;
    amount: number;
    dueDate: Date;
}

export interface QuickTxRequestDTO {
    type: string;
    amount: number;
    categoryId?: number;
    txTime: Date;
}

export interface TxResponseDTO {
    id: number;
    type: string;
    amount: number;
    categoryId: number;
    txTime: Date;
    locationName: string;
    note: string;
}

export interface RegisterPushDTO {
    playerId: string;
}

export interface ServiceResponseDTO<T> {
    success: boolean;
    message: string;
    statusCode: number;
    data: T;
}

export interface SavingsGoalRequestDTO {
    targetAmt: number;
    targetDate: Date;
}

export interface SavingsGoalResponseDTO {
    userSub: string;
    targetAmt: number;
    targetDate: Date;
}

export interface CategoryBreakdownDTO {
    category: string;
    amount: number;
}

export interface DashboardSummaryDTO {
    totalExpenses: number;
    totalIncome: number;
    budgetRemaining: number;
}

export interface LocationDTO {
    latitude: number;
    longitude: number;
    label: string;
    amount: number;
}

export interface SpendingVsIncomeDTO {
    month: string;
    expenses: number;
    income: number;
}

export interface PlannedTxRequestDTO {
    type: string;
    categoryId: number;
    title: string;
    amount: number;
    dueDate: Date;
    autoBook: boolean;
}

export interface PlannedTxResponseDTO {
    id: number;
    type: string;
    categoryId: number;
    title: string;
    amount: number;
    dueDate: Date;
    autoBook: boolean;
}

export interface BalanceDTO {
    asset: string;
    free: string;
    locked: string;
}
