import { prisma } from "./prisma";
import { fetchStockQuote } from "./yahoo-finance";

export interface StockHolding {
  ticker: string;
  name: string;
  sector: string;
  currentLots: number;
  currentShares: number;
  avgPrice: number;
  currentPrice: number;
  changePercent: number;
  costBasis: number; // total capital in remaining shares
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalDividends: number;
  totalLotsBought: number;
  totalLotsSold: number;
  allocationPercent: number; // % of total stock portfolio
  yieldOnCost: number; // (totalDividends / costBasis) * 100
  lastUpdated?: Date | null;
}

export interface PortfolioSummary {
  totalNetWorth: number; // Stock Market Value + Cash Balance
  totalStockValue: number; // Total Market Value of Stocks
  totalCostBasis: number; // Total Invested Capital currently in stocks
  cashBalance: number; // RDN Available Cash
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  totalRealizedPnL: number;
  totalDividends: number;
  holdings: StockHolding[];
  sectorAllocations: { sector: string; value: number; percent: number }[];
  monthlySavings: {
    yearMonth: string;
    targetAmount: number;
    actualSaved: number;
    progressPercent: number;
  };
}

export async function calculatePortfolio(): Promise<PortfolioSummary> {
  const stocks = await prisma.stock.findMany({
    include: {
      transactions: {
        orderBy: { date: "asc" },
      },
      dividends: true,
    },
  });

  const cashTransactions = await prisma.cashTransaction.findMany({
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const savingsGoal = await prisma.savingsGoal.findUnique({
    where: { yearMonth: currentYearMonth },
  });

  const targetSavingsAmount = savingsGoal?.targetAmount ?? 2000000; // Default Rp 2.000.000

  // Calculate Cash Balance:
  // Starts with manual cash transactions
  let cashBalance = 0;
  let monthlyDeposit = 0;

  for (const ct of cashTransactions) {
    if (ct.type === "DEPOSIT") {
      cashBalance += ct.amount;
      const ctYearMonth = `${ct.date.getFullYear()}-${String(ct.date.getMonth() + 1).padStart(2, "0")}`;
      if (ctYearMonth === currentYearMonth) {
        monthlyDeposit += ct.amount;
      }
    } else if (ct.type === "WITHDRAW") {
      cashBalance -= ct.amount;
    } else if (ct.type === "INTEREST") {
      cashBalance += ct.amount;
    } else if (ct.type === "TAX_FEE") {
      cashBalance -= ct.amount;
    } else if (ct.type === "DIVIDEND") {
      cashBalance += ct.amount;
    }
  }

  const holdings: StockHolding[] = [];
  let totalStockValue = 0;
  let totalCostBasis = 0;
  let totalRealizedPnL = 0;
  let totalDividends = 0;
  let monthlyStockBuy = 0;

  for (const stock of stocks) {
    let currentShares = 0;
    let costBasis = 0; // Total net cost of currently held shares
    let realizedPnL = 0;
    let totalLotsBought = 0;
    let totalLotsSold = 0;

    for (const tx of stock.transactions) {
      const txYearMonth = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;

      if (tx.type === "BUY") {
        totalLotsBought += tx.lots;
        currentShares += tx.shares;
        costBasis += tx.totalAmount;
        cashBalance -= tx.totalAmount; // Buying reduces cash in RDN

        if (txYearMonth === currentYearMonth) {
          monthlyStockBuy += tx.totalAmount;
        }
      } else if (tx.type === "SELL") {
        totalLotsSold += tx.lots;
        const avgPriceBeforeSell = currentShares > 0 ? costBasis / currentShares : 0;
        const costOfSoldShares = tx.shares * avgPriceBeforeSell;
        const txRealizedPnL = tx.totalAmount - costOfSoldShares;

        realizedPnL += txRealizedPnL;
        currentShares = Math.max(0, currentShares - tx.shares);
        costBasis = Math.max(0, costBasis - costOfSoldShares);
        cashBalance += tx.totalAmount; // Selling adds cash to RDN
      }
    }

    // Dividends
    let stockDividends = 0;
    for (const div of stock.dividends) {
      stockDividends += div.netAmount;
      totalDividends += div.netAmount;
      cashBalance += div.netAmount; // Dividends received add to RDN
    }

    totalRealizedPnL += realizedPnL;

    if (currentShares > 0) {
      const currentLots = Math.round(currentShares / 100);
      const avgPrice = costBasis / currentShares;
      const marketPrice = stock.currentPrice > 0 ? stock.currentPrice : avgPrice;
      const marketValue = currentShares * marketPrice;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
      const yieldOnCost = costBasis > 0 ? (stockDividends / costBasis) * 100 : 0;

      totalStockValue += marketValue;
      totalCostBasis += costBasis;

      holdings.push({
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector || "Other",
        currentLots,
        currentShares,
        avgPrice: Math.round(avgPrice),
        currentPrice: marketPrice,
        changePercent: stock.changePercent,
        costBasis,
        marketValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        realizedPnL,
        totalDividends: stockDividends,
        totalLotsBought,
        totalLotsSold,
        allocationPercent: 0, // Calculated after totalStockValue is known
        yieldOnCost,
        lastUpdated: stock.lastUpdated,
      });
    }
  }

  // Calculate allocation percentages
  for (const h of holdings) {
    h.allocationPercent = totalStockValue > 0 ? (h.marketValue / totalStockValue) * 100 : 0;
  }

  // Sort holdings by market value descending
  holdings.sort((a, b) => b.marketValue - a.marketValue);

  // Sector breakdown
  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    const prev = sectorMap.get(h.sector) || 0;
    sectorMap.set(h.sector, prev + h.marketValue);
  }

  const sectorAllocations = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({
      sector,
      value,
      percent: totalStockValue > 0 ? (value / totalStockValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const totalUnrealizedPnL = totalStockValue - totalCostBasis;
  const totalUnrealizedPnLPercent =
    totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
  const totalNetWorth = totalStockValue + cashBalance;

  // Actual saved this month = deposits made or direct buys
  const actualSaved = Math.max(monthlyDeposit, monthlyStockBuy);
  const progressPercent = targetSavingsAmount > 0 ? Math.min(100, (actualSaved / targetSavingsAmount) * 100) : 0;

  return {
    totalNetWorth,
    totalStockValue,
    totalCostBasis,
    cashBalance,
    totalUnrealizedPnL,
    totalUnrealizedPnLPercent,
    totalRealizedPnL,
    totalDividends,
    holdings,
    sectorAllocations,
    monthlySavings: {
      yearMonth: currentYearMonth,
      targetAmount: targetSavingsAmount,
      actualSaved,
      progressPercent,
    },
  };
}

export async function refreshAllStockPrices(): Promise<{ updated: number; failed: number }> {
  const stocks = await prisma.stock.findMany();
  let updated = 0;
  let failed = 0;

  for (const stock of stocks) {
    try {
      const quote = await fetchStockQuote(stock.ticker);
      if (quote) {
        await prisma.stock.update({
          where: { ticker: stock.ticker },
          data: {
            currentPrice: quote.currentPrice,
            changePercent: quote.changePercent,
            name: stock.name || quote.name,
            lastUpdated: new Date(),
          },
        });
        updated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { updated, failed };
}

