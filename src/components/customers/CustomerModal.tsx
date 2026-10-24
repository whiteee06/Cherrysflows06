/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Building2, Mail, Phone, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Customer } from '../../types/database';
import {
  CustomerFormValues,
  CustomerValidationErrors,
  validateCustomerForm,
} from '../../utils/customer';
import { insertRecord, updateRecord } from '../../services/business/records';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSaved: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaved,
}) => {
  const isEditing = Boolean(customerToEdit);

  const [values, setValues] = useState<CustomerFormValues>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<CustomerValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setValues({
        name: customerToEdit.name || '',
        companyName: customerToEdit.company_name || '',
        email: customerToEdit.email || '',
        phone: customerToEdit.phone || '',
        address: customerToEdit.address || customerToEdit.billing_address || '',
        city: customerToEdit.city || '',
        notes: customerToEdit.notes || '',
        status: customerToEdit.status || 'active',
      });
    } else {
      setValues({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        notes: '',
        status: 'active',
      });
    }
    setErrors({});
    setServerError(null);
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateCustomerForm(values);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: values.name.trim(),
        company_name: values.companyName.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        address: values.address.trim() || undefined,
        billing_address: values.address.trim() || undefined,
        city: values.city.trim() || undefined,
        notes: values.notes.trim() || undefined,
        status: values.status,
      };

      if (isEditing && customerToEdit) {
        const res = await updateRecord<Customer>('customers', customerToEdit.id, payload);
        if (!res.success) {
          throw new Error(res.error || 'Failed to update customer record');
        }
      } else {
        const res = await insertRecord('customers', {
          ...payload,
          organization_id: 'org_cherryflow_demo',
        });
        if (!res.success) {
          throw new Error(res.error || 'Failed to create customer record');
        }
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Customer Account' : 'Register New Customer'}
      description={
        isEditing
          ? 'Update contact information, commercial identity, and billing settings.'
          : 'Add a new client or buyer account with verified business parameters.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Customer / Contact Name *"
            placeholder="e.g. Evelyn Vance"
            value={values.name}
            onChange={(e) => {
              setValues({ ...values, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            error={errors.name}
            leftIcon={<User className="w-4 h-4 text-zinc-500" />}
            required
          />

          <Input
            label="Company / Business Entity"
            placeholder="e.g. Vance Logistics Corp"
            value={values.companyName}
            onChange={(e) => setValues({ ...values, companyName: e.target.value })}
            leftIcon={<Building2 className="w-4 h-4 text-zinc-500" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Address"
            type="email"
            placeholder="client@company.com"
            value={values.email}
            onChange={(e) => {
              setValues({ ...values, email: e.target.value });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4 text-zinc-500" />}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 234-5678"
            value={values.phone}
            onChange={(e) => {
              setValues({ ...values, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            error={errors.phone}
            leftIcon={<Phone className="w-4 h-4 text-zinc-500" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Street / Billing Address"
              placeholder="Suite 400, 100 Industrial Pkwy"
              value={values.address}
              onChange={(e) => setValues({ ...values, address: e.target.value })}
              leftIcon={<MapPin className="w-4 h-4 text-zinc-500" />}
            />
          </div>

          <div>
            <Input
              label="City / Region"
              placeholder="Chicago, IL"
              value={values.city}
              onChange={(e) => setValues({ ...values, city: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Account Notes / Terms</label>
            <textarea
              rows={2}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
              placeholder="Special billing terms, SLA notes, or delivery preferences..."
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Account Status</label>
            <select
              value={values.status}
              onChange={(e) => setValues({ ...values, status: e.target.value as 'active' | 'inactive' })}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value="active">Active Client</option>
              <option value="inactive">Inactive / Archived</option>
            </select>
            <p className="text-[11px] text-zinc-500">Active clients can receive orders and invoices.</p>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
