/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ArrowRight, ArrowUpRight, ShoppingBag, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { TransactionRow } from '../../types/analytics';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RecentTransactionsTableProps {
  transactions: TransactionRow[];
  onOpenNewTransactionModal?: () => void;
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  transactions,
  onOpenNewTransactionModal,
}) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-100">
                Recent Business Transactions
              </CardTitle>
              <CardDescription className="text-xs">
                Authorized orders and commercial invoices recorded in the database
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/sales">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All Orders
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mx-auto text-zinc-500 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200">No Transactions Found</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
              No sales orders or customer invoices have been recorded yet in your database.
            </p>
            {onOpenNewTransactionModal && (
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={onOpenNewTransactionModal}>
                  Record First Transaction
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase text-[10px] font-semibold tracking-wider border-y border-zinc-800/80">
                <tr>
                  <th scope="col" className="py-3 px-4 sm:px-6">Reference</th>
                  <th scope="col" className="py-3 px-4">Client / Account</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4 text-right">Amount</th>
                  <th scope="col" className="py-3 px-4 text-right sm:pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        {tx.type === 'sale_order' ? (
                          <span title="Sales Order" className="w-5 h-5 rounded-sm bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400">
                            <ShoppingBag className="w-3 h-3" />
                          </span>
                        ) : (
                          <span title="Invoice" className="w-5 h-5 rounded-sm bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400">
                            <Receipt className="w-3 h-3" />
                          </span>
                        )}
                        <span className="font-mono font-medium text-zinc-100">
                          {tx.reference}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-200 font-medium truncate max-w-[180px]">
                      {tx.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-100">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right sm:pr-6">
                      <Badge variant={tx.badgeVariant} size="sm">
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
