/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingBag, CreditCard, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Customer } from '../../types/database';
import { insertRecord } from '../../services/business/records';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onTransactionCreated: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  customers,
  onTransactionCreated,
}) => {
  const [txType, setTxType] = useState<'sale' | 'expense'>('sale');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [category, setCategory] = useState<'software' | 'supplies' | 'marketing' | 'utilities' | 'other'>('software');
  const [orderStatus, setOrderStatus] = useState<'confirmed' | 'fulfilled' | 'draft'>('confirmed');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid transaction amount greater than $0.00.');
      return;
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);

    try {
      if (txType === 'sale') {
        const orderNumber = reference.trim() || `SO-${Math.floor(1000 + Math.random() * 9000)}`;
        let custId = selectedCustomerId;
        let cName = customerName.trim();

        if (!custId && cName) {
          // create a quick customer record
          const custRes = await insertRecord('customers', {
            name: cName,
            email: `${cName.toLowerCase().replace(/\s+/g, '')}@example.com`,
            status: 'active',
          });
          if (custRes.data?.id) custId = custRes.data.id;
        }

        await insertRecord('sales_orders', {
          order_number: orderNumber,
          customer_id: custId || 'cust_walk_in',
          order_date: today,
          status: orderStatus,
          subtotal: parsedAmount * 0.9,
          tax_amount: parsedAmount * 0.1,
          discount_amount: 0,
          total_amount: parsedAmount,
          notes: description || 'Direct entry sales order',
        });
      } else {
        const vendor = reference.trim() || 'Direct Vendor';
        await insertRecord('expenses', {
          vendor,
          amount: parsedAmount,
          currency: 'USD',
          category,
          expense_date: today,
          payment_method: 'card',
          recorded_by: 'current_user',
          description: description || `${category} expense recorded from dashboard`,
        });
      }

      onTransactionCreated();
      onClose();
      // Reset form
      setAmount('');
      setReference('');
      setCustomerName('');
      setDescription('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Real Business Transaction"
      description="Create an authorized sales order or operational expense record to update your business analytics."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setTxType('sale')}
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              txType === 'sale'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Sales Order (Revenue)</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType('expense')}
            className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              txType === 'expense'
                ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Operating Expense</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {txType === 'sale' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Customer / Account</label>
              {customers.length > 0 ? (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (e.target.value) {
                      const c = customers.find((x) => x.id === e.target.value);
                      if (c) setCustomerName(c.name);
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select Existing Customer or enter name below...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>
              ) : null}

              {!selectedCustomerId && (
                <div className="mt-2">
                  <Input
                    placeholder="E.g., Northwind Traders Inc"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Amount ($)"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Input
                label="Order Number (Optional)"
                placeholder="SO-1007"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Fulfillment Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['confirmed', 'fulfilled', 'draft'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatus(st)}
                    className={`py-1.5 px-2 rounded-lg text-xs capitalize border font-medium transition-all cursor-pointer ${
                      orderStatus === st
                        ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Note: Confirmed and Fulfilled orders count towards realized Gross Sales revenue.
              </p>
            </div>
          </>
        ) : (
          <>
            <Input
              label="Vendor / Payee"
              placeholder="E.g., Amazon Web Services, Office Depot"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Disbursement Amount ($)"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="software">Software & Subscriptions</option>
                  <option value="supplies">Office & Equipment</option>
                  <option value="marketing">Marketing & Advertising</option>
                  <option value="utilities">Utilities & Telecom</option>
                  <option value="other">Other Operations</option>
                </select>
              </div>
            </div>
          </>
        )}

        <Input
          label="Notes / Ledger Description"
          placeholder="Optional commercial description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save Record to Database
          </Button>
        </div>
      </form>
    </Modal>
  );
};
