/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Building,
  Calendar,
  FileText,
  Filter,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState, LoadingState } from '../../components/common/StateViewer';
import { Modal } from '../../components/common/Modal';
import { fetchBusinessRecords, insertRecord, updateRecord } from '../../services/business/records';
import { Expense, ExpenseCategory } from '../../types/database';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  resolveCategoryMetadata,
  calculateExpenseMetrics,
  filterAndSortExpenses,
  validateExpenseForm,
} from '../../utils/expenses';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<Expense | null>(null);

  // Add Expense Form state
  const [vendor, setVendor] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('software');
  const [paymentMethod, setPaymentMethod] = useState<Expense['payment_method']>('card');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment settlement state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string>('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const bundle = await fetchBusinessRecords();
      setExpenses(bundle.expenses);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pure metrics calculation
  const metrics = useMemo(() => {
    return calculateExpenseMetrics(expenses, []);
  }, [expenses]);

  // Pure filtering
  const filteredExpenses = useMemo(() => {
    return filterAndSortExpenses(
      expenses,
      {
        search: searchQuery,
        category: categoryFilter,
        paymentStatus: statusFilter,
        paymentMethod: methodFilter,
      },
      []
    );
  }, [expenses, searchQuery, categoryFilter, statusFilter, methodFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateExpenseForm({
      vendor,
      title: title || vendor,
      amount,
      expense_date: expenseDate,
      category,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount);
      const isPaid = paymentStatus === 'paid';
      const expenseNumber = `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await insertRecord('expenses', {
        expense_number: expenseNumber,
        vendor: vendor.trim() || 'Vendor',
        title: title.trim() || vendor.trim(),
        amount: parsedAmount,
        amount_paid: isPaid ? parsedAmount : 0,
        currency: 'USD',
        category,
        payment_method: paymentMethod,
        payment_status: isPaid ? 'paid' : 'unpaid',
        expense_date: expenseDate,
        reference_number: referenceNumber.trim() || undefined,
        recorded_by: 'current_user',
        description: description.trim() || `${category} operational disbursement`,
        notes: notes.trim() || undefined,
        is_archived: false,
      });

      await loadData(true);
      setIsAddModalOpen(false);
      // Reset form
      setVendor('');
      setTitle('');
      setAmount('');
      setCategory('software');
      setPaymentMethod('card');
      setPaymentStatus('paid');
      setReferenceNumber('');
      setDescription('');
      setNotes('');
    } catch (err) {
      console.error('Failed to record expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = (exp: Expense) => {
    setSelectedExpenseForPayment(exp);
    const total = Number(exp.amount) || 0;
    const paid = Number(exp.amount_paid) || (exp.payment_status === 'paid' ? total : 0);
    const balance = Math.max(0, total - paid);
    setPayAmount(balance.toFixed(2));
    setPayError('');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseForPayment) return;

    const parsedPay = parseFloat(payAmount);
    const total = Number(selectedExpenseForPayment.amount) || 0;
    const paidAlready = Number(selectedExpenseForPayment.amount_paid) || 0;
    const remaining = Math.max(0, total - paidAlready);

    if (isNaN(parsedPay) || parsedPay <= 0) {
      setPayError('Please enter a valid disbursement amount greater than 0.');
      return;
    }

    if (parsedPay > remaining + 0.001) {
      setPayError(`Payment cannot exceed outstanding balance of ${formatCurrency(remaining)}.`);
      return;
    }

    setIsSubmittingPay(true);
    setPayError('');
    try {
      const nextPaid = Math.round((paidAlready + parsedPay) * 100) / 100;
      const nextStatus = nextPaid >= total ? 'paid' : 'partially_paid';

      await updateRecord('expenses', selectedExpenseForPayment.id, {
        amount_paid: nextPaid,
        payment_status: nextStatus,
        payment_method: payMethod as any,
        notes: selectedExpenseForPayment.notes
          ? `${selectedExpenseForPayment.notes} | Disbursed ${formatCurrency(parsedPay)} on ${new Date().toISOString().slice(0, 10)}`
          : `Disbursed ${formatCurrency(parsedPay)} on ${new Date().toISOString().slice(0, 10)}`,
      });

      await loadData(true);
      setIsPayModalOpen(false);
      setSelectedExpenseForPayment(null);
    } catch (err) {
      console.error('Failed to update expense payment:', err);
      setPayError('Failed to record payment disbursement.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-100">Operating Expenses & Payables</h2>
            <Badge variant="cherry" size="sm">Cost Center</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Track business overhead, vendor payables, utility bills, and tax-deductible items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            aria-label="Refresh expenses"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-500' : ''}`} />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Recorded</span>
              <CreditCard className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {formatCurrency(metrics.totalExpenses)}
            </div>
            <p className="text-[10px] text-zinc-500">{metrics.expensesCount} expenses registered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Cash Settled</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(metrics.paidExpenses)}
            </div>
            <p className="text-[10px] text-zinc-500">{metrics.paidCount} paid disbursements</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Unpaid Accounts Payable</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {formatCurrency(metrics.unpaidExpenses)}
            </div>
            <p className="text-[10px] text-zinc-500">{metrics.unpaidCount + metrics.partiallyPaidCount} pending settlement</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Top Category</span>
              <Tag className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-zinc-200 truncate">
              {metrics.categoryBreakdown[0] ? metrics.categoryBreakdown[0].name : 'None'}
            </div>
            <p className="text-[10px] text-zinc-500">
              {metrics.categoryBreakdown[0] ? `${metrics.categoryBreakdown[0].percentage}% of expenditures` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by vendor, title, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="all">All Methods</option>
            <option value="card">Card</option>
            <option value="bank_transfer">ACH / Bank Wire</option>
            <option value="cash">Petty Cash</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Table / Ledger */}
      {loading ? (
        <LoadingState label="Loading operating expenses..." />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          title={searchQuery || categoryFilter !== 'all' ? 'No matching expenses' : 'No expenses recorded yet'}
          description={
            searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search criteria or category filter.'
              : 'Your expense ledger is clean. Log business disbursements to track costs against sales revenue.'
          }
          icon={<CreditCard className="w-6 h-6 text-zinc-400" />}
          actionLabel="Record Expense"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <Card className="border-zinc-800">
          <CardHeader className="py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Expenses Ledger</CardTitle>
                <CardDescription>
                  {filteredExpenses.length} disbursement{filteredExpenses.length === 1 ? '' : 's'} recorded
                </CardDescription>
              </div>
              <Badge variant="outline" size="sm">
                Table: public.expenses
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor / Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Payment Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Balance Due</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-400">
                {filteredExpenses.map((exp) => {
                  const meta = resolveCategoryMetadata(exp.category || 'other');
                  const total = Number(exp.amount) || 0;
                  const paid = Number(exp.amount_paid) || (exp.payment_status === 'paid' ? total : 0);
                  const bal = Math.max(0, total - paid);
                  const isPaid = exp.payment_status === 'paid' || bal === 0;

                  return (
                    <tr key={exp.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5 font-sans">
                        <div className="text-zinc-100 font-medium">{exp.vendor || exp.title}</div>
                        {exp.description && (
                          <div className="text-[11px] text-zinc-500 truncate max-w-xs">{exp.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <Badge variant="muted" size="sm">
                          {meta.name}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-sans">{formatDate(exp.expense_date || exp.created_at)}</td>
                      <td className="px-4 py-3.5 capitalize font-sans">{exp.payment_method.replace('_', ' ')}</td>
                      <td className="px-4 py-3.5 font-sans">
                        <Badge variant={isPaid ? 'success' : exp.payment_status === 'partially_paid' ? 'warning' : 'danger'} size="sm">
                          {isPaid ? 'Paid' : exp.payment_status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans text-rose-400 font-bold">
                        {formatCurrency(total)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-sans font-semibold ${bal > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {formatCurrency(bal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans">
                        {bal > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentModal(exp)}
                            leftIcon={<DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                          >
                            Disburse
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-500 font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modal for recording Expense */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Operating Expense"
        description="Log an operational expenditure into the business ledger with category and payment tracking."
        size="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Vendor / Payee"
              placeholder="E.g., Supabase, Amazon Web Services, FedEx"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              error={formErrors.title}
              required
            />
            <Input
              label="Expense Title / Item"
              placeholder="E.g., Cloud Hosting Pro Tier"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={formErrors.amount}
              required
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Expense Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Expenditure Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="card">Corporate Card</option>
                <option value="bank_transfer">ACH / Bank Wire</option>
                <option value="cash">Petty Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="paid">Paid (Cash Settled)</option>
                <option value="unpaid">Unpaid (Accounts Payable)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Reference / Invoice #"
              placeholder="E.g., PO-9941, INV-8820"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
            <Input
              label="Description / Purpose"
              placeholder="Short description for accounting"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Expense Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal for recording Payment / Disbursement */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Expense Disbursement"
        description={
          selectedExpenseForPayment
            ? `Record cash settlement for ${selectedExpenseForPayment.vendor || selectedExpenseForPayment.title} (${formatCurrency(Number(selectedExpenseForPayment.amount) || 0)} total).`
            : 'Record cash settlement.'
        }
        size="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {payError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Disbursement Amount ($)"
              type="number"
              step="0.01"
              min="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Disbursement Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="bank_transfer">ACH / Bank Wire</option>
                <option value="card">Corporate Card</option>
                <option value="cash">Petty Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Payment Notes / Transaction ID"
            placeholder="Wire reference, receipt scan number..."
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingPay}>
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
