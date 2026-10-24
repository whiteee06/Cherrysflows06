/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DatabaseTableDefinition {
  tableName: string;
  description: string;
  columns: {
    name: string;
    type: string;
    constraints?: string;
    description: string;
  }[];
  indexes: string[];
  rlsPolicies: string[];
}

export const CHERRYFLOW_SCHEMA_TABLES: DatabaseTableDefinition[] = [
  {
    tableName: 'profiles',
    description: 'User profile records associated with Supabase auth.users with strict ownership RLS.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE', description: 'User ID linked to auth.users' },
      { name: 'full_name', type: 'TEXT', constraints: 'NULL', description: 'User full display name' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Last profile update timestamp' },
    ],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at)'],
    rlsPolicies: [
      'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id)',
      'CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)',
      'CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id)',
    ],
  },
  {
    tableName: 'organizations',
    description: 'Tenant organizations and businesses managing their operations on Cherryflow.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Unique organization ID' },
      { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Business display name' },
      { name: 'legal_name', type: 'VARCHAR(255)', constraints: 'NULL', description: 'Registered business legal name' },
      { name: 'slug', type: 'VARCHAR(255)', constraints: 'UNIQUE NOT NULL', description: 'URL-friendly organization identifier' },
      { name: 'logo_url', type: 'TEXT', constraints: 'NULL', description: 'Business logo asset URL' },
      { name: 'email', type: 'VARCHAR(255)', constraints: 'NULL', description: 'Official business correspondence email' },
      { name: 'phone', type: 'VARCHAR(64)', constraints: 'NULL', description: 'Business telephone number' },
      { name: 'address', type: 'TEXT', constraints: 'NULL', description: 'Physical / headquarters address' },
      { name: 'website', type: 'VARCHAR(255)', constraints: 'NULL', description: 'Official business website URL' },
      { name: 'tax_identifier', type: 'VARCHAR(64)', constraints: 'NULL', description: 'Business tax/VAT/GST registration number' },
      { name: 'invoice_prefix', type: 'VARCHAR(16)', constraints: "DEFAULT 'INV-'", description: 'Invoice numbering prefix' },
      { name: 'invoice_start_number', type: 'INTEGER', constraints: 'DEFAULT 1001', description: 'Starting sequence for invoices' },
      { name: 'default_payment_terms', type: 'VARCHAR(64)', constraints: "DEFAULT 'Net 30'", description: 'Default billing terms' },
      { name: 'currency', type: 'VARCHAR(3)', constraints: "DEFAULT 'USD'", description: 'Primary ISO currency code' },
      { name: 'timezone', type: 'VARCHAR(64)', constraints: "DEFAULT 'UTC'", description: 'Operating timezone' },
      { name: 'date_format', type: 'VARCHAR(32)', constraints: "DEFAULT 'MMM DD, YYYY'", description: 'Regional date display format' },
      { name: 'number_format', type: 'VARCHAR(32)', constraints: "DEFAULT 'standard'", description: 'Number & decimal formatting style' },
      { name: 'notify_low_stock', type: 'BOOLEAN', constraints: 'DEFAULT true', description: 'Enable low stock workspace alerts' },
      { name: 'low_stock_threshold', type: 'INTEGER', constraints: 'DEFAULT 10', description: 'Low stock threshold trigger' },
      { name: 'notify_invoice_due', type: 'BOOLEAN', constraints: 'DEFAULT true', description: 'Enable invoice due alerts' },
      { name: 'notify_payment_received', type: 'BOOLEAN', constraints: 'DEFAULT true', description: 'Enable payment receipt alerts' },
      { name: 'notify_security_alerts', type: 'BOOLEAN', constraints: 'DEFAULT true', description: 'Enable security and auth alerts' },
      { name: 'theme', type: 'VARCHAR(32)', constraints: "DEFAULT 'charcoal'", description: 'UI surface theme' },
      { name: 'table_density', type: 'VARCHAR(32)', constraints: "DEFAULT 'comfortable'", description: 'Table rows display density' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Record creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Record update timestamp' },
    ],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug)'],
    rlsPolicies: [
      'ALTER TABLE organizations ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Users can select their own organization" ON organizations FOR SELECT USING (id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Authenticated users can create organization" ON organizations FOR INSERT WITH CHECK (auth.role() = \'authenticated\')',
      'CREATE POLICY "Owners and admins can update organization" ON organizations FOR UPDATE USING (id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() AND role IN (\'owner\', \'admin\')))',
    ],
  },
  {
    tableName: 'user_profiles',
    description: 'User accounts linked to auth.users and organizations with role-based access.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Profile ID' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE', description: 'Supabase Auth User reference' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'full_name', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Staff/Owner display name' },
      { name: 'role', type: 'VARCHAR(32)', constraints: "CHECK (role IN ('owner', 'admin', 'manager', 'staff')) DEFAULT 'staff'", description: 'RBAC Permission role' },
      { name: 'avatar_url', type: 'TEXT', constraints: 'NULL', description: 'Profile photo URL' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_profiles_org ON user_profiles(organization_id)',
    ],
    rlsPolicies: [
      'ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Users view members of their organization" ON user_profiles FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Users can insert their user profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id)',
      'CREATE POLICY "Users can update their user profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
    ],
  },
  {
    tableName: 'customers',
    description: 'Clients, buyers, and accounts managed within the business CRM.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Customer identifier' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'User creator' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Primary contact or business name' },
      { name: 'company_name', type: 'VARCHAR(255)', constraints: 'NULL', description: 'Company or entity name' },
      { name: 'email', type: 'VARCHAR(255)', constraints: 'NULL', description: 'Communication email' },
      { name: 'phone', type: 'VARCHAR(64)', constraints: 'NULL', description: 'Contact phone number' },
      { name: 'address', type: 'TEXT', constraints: 'NULL', description: 'Street address' },
      { name: 'billing_address', type: 'TEXT', constraints: 'NULL', description: 'Primary billing address' },
      { name: 'city', type: 'VARCHAR(128)', constraints: 'NULL', description: 'City location' },
      { name: 'notes', type: 'TEXT', constraints: 'NULL', description: 'Account notes and records' },
      { name: 'status', type: 'VARCHAR(32)', constraints: "CHECK (status IN ('active', 'inactive')) DEFAULT 'active'", description: 'Account status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Last update timestamp' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
      'CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)',
    ],
    rlsPolicies: [
      'ALTER TABLE customers ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for customers select" ON customers FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for customers insert" ON customers FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for customers update" ON customers FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for customers delete" ON customers FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'products',
    description: 'Product catalog, item variants, pricing, stock levels, and inventory parameters.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Product ID' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Creator user reference' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'sku', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Stock Keeping Unit (unique per organization)' },
      { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Product display name' },
      { name: 'description', type: 'TEXT', constraints: 'NULL', description: 'Detailed product description' },
      { name: 'category', type: 'VARCHAR(64)', constraints: 'NULL', description: 'Product category' },
      { name: 'selling_price', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0)', description: 'Selling price' },
      { name: 'cost_price', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0)', description: 'Unit cost price' },
      { name: 'stock_quantity', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)', description: 'Current available stock' },
      { name: 'low_stock_threshold', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0)', description: 'Low-stock alert threshold' },
      { name: 'unit', type: 'VARCHAR(32)', constraints: "DEFAULT 'unit'", description: 'Measurement unit' },
      { name: 'status', type: 'VARCHAR(32)', constraints: "CHECK (status IN ('active', 'inactive')) DEFAULT 'active'", description: 'Catalog status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Last update timestamp' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku)',
      'CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
    ],
    rlsPolicies: [
      'ALTER TABLE products ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for products select" ON products FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for products insert" ON products FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for products update" ON products FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for products delete" ON products FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'inventory_adjustments',
    description: 'Immutable ledger of stock movements, receipts, damage write-offs, and audits.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Adjustment ID' },
      { name: 'product_id', type: 'UUID', constraints: 'REFERENCES products(id) ON DELETE CASCADE', description: 'Target product' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Staff user performing adjustment' },
      { name: 'adjustment_type', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (adjustment_type IN ('received', 'correction', 'damaged', 'reduction'))", description: 'Type of movement' },
      { name: 'quantity_change', type: 'INTEGER', constraints: 'NOT NULL', description: 'Signed delta change in units' },
      { name: 'previous_quantity', type: 'INTEGER', constraints: 'NOT NULL CHECK (previous_quantity >= 0)', description: 'Stock before adjustment' },
      { name: 'new_quantity', type: 'INTEGER', constraints: 'NOT NULL CHECK (new_quantity >= 0)', description: 'Stock after adjustment' },
      { name: 'reason', type: 'TEXT', constraints: 'NOT NULL', description: 'Audit explanation' },
      { name: 'created_by', type: 'VARCHAR(255)', constraints: "NOT NULL DEFAULT 'Authorized User'", description: 'User or system name' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Timestamp' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_adjustments_product ON inventory_adjustments(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_adjustments_org ON inventory_adjustments(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_adjustments_created_at ON inventory_adjustments(created_at DESC)',
    ],
    rlsPolicies: [
      'ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for inventory_adjustments select" ON inventory_adjustments FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for inventory_adjustments insert" ON inventory_adjustments FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      '-- NOTE: Inventory adjustments are immutable audit logs. No UPDATE or DELETE policies are granted.',
    ],
  },
  {
    tableName: 'inventory_items',
    description: 'Current on-hand stock quantities, reorder thresholds, and warehouse bin locations.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Inventory record ID' },
      { name: 'product_id', type: 'UUID', constraints: 'REFERENCES products(id) ON DELETE CASCADE', description: 'Product reference' },
      { name: 'quantity_on_hand', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0)', description: 'Current available stock' },
      { name: 'reorder_level', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 10 CHECK (reorder_level >= 0)', description: 'Low-stock alert threshold' },
      { name: 'reorder_quantity', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 50 CHECK (reorder_quantity > 0)', description: 'Target reorder batch size' },
      { name: 'warehouse_location', type: 'VARCHAR(64)', constraints: 'NULL', description: 'Aisle/Bin/Shelf code' },
      { name: 'last_counted_at', type: 'TIMESTAMPTZ', constraints: 'NULL', description: 'Physical audit timestamp' },
    ],
    indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product ON inventory_items(product_id)'],
    rlsPolicies: [
      'ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for inventory select" ON inventory_items FOR SELECT USING (product_id IN (SELECT id FROM products WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for inventory modify" ON inventory_items FOR ALL USING (product_id IN (SELECT id FROM products WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid()))',
    ],
  },
  {
    tableName: 'invoices',
    description: 'Customer invoices, payment terms, tax calculations, and payment tracking.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Invoice ID' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Creator user reference' },
      { name: 'invoice_number', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Formatted invoice ID (INV-0001)' },
      { name: 'customer_id', type: 'UUID', constraints: 'REFERENCES customers(id)', description: 'Customer reference' },
      { name: 'sales_order_id', type: 'UUID', constraints: 'NULL', description: 'Associated sales order' },
      { name: 'issue_date', type: 'DATE', constraints: 'NOT NULL DEFAULT CURRENT_DATE', description: 'Billing date' },
      { name: 'due_date', type: 'DATE', constraints: 'NOT NULL', description: 'Payment due date' },
      { name: 'status', type: 'VARCHAR(32)', constraints: "CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'voided')) DEFAULT 'draft'", description: 'Invoice lifecycle status' },
      { name: 'subtotal', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0)', description: 'Pre-tax total' },
      { name: 'discount_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0)', description: 'Total discount' },
      { name: 'tax_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0)', description: 'Sales tax/VAT total' },
      { name: 'total_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0)', description: 'Gross payable total' },
      { name: 'amount_paid', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0)', description: 'Collected payments' },
      { name: 'notes', type: 'TEXT', constraints: 'NULL', description: 'Invoice notes' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Last update timestamp' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(organization_id, invoice_number)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    ],
    rlsPolicies: [
      'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for invoices select" ON invoices FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for invoices insert" ON invoices FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for invoices update" ON invoices FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for invoices delete" ON invoices FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'expenses',
    description: 'Operating expenditures, vendor disbursements, payment status, receipts, and ledger categories.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Expense record ID' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Creator user reference' },
      { name: 'expense_number', type: 'VARCHAR(64)', constraints: 'NULL', description: 'Unique expense reference (EXP-YYYY-XXXX)' },
      { name: 'title', type: 'VARCHAR(255)', constraints: 'NULL', description: 'Expense title / summary' },
      { name: 'category', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Cost category' },
      { name: 'category_id', type: 'UUID', constraints: 'NULL', description: 'Custom expense category reference' },
      { name: 'vendor', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Vendor/Merchant name' },
      { name: 'description', type: 'TEXT', constraints: 'NOT NULL', description: 'Expense justification / memo' },
      { name: 'amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL CHECK (amount > 0)', description: 'Expense monetary amount' },
      { name: 'amount_paid', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0)', description: 'Total settled amount' },
      { name: 'expense_date', type: 'DATE', constraints: 'NOT NULL DEFAULT CURRENT_DATE', description: 'Expenditure date' },
      { name: 'payment_method', type: 'VARCHAR(32)', constraints: "DEFAULT 'card'", description: 'Payment source' },
      { name: 'payment_status', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')) DEFAULT 'unpaid'", description: 'Settlement state' },
      { name: 'reference_number', type: 'VARCHAR(128)', constraints: 'NULL', description: 'Invoice or payment receipt ID' },
      { name: 'notes', type: 'TEXT', constraints: 'NULL', description: 'Internal accounting notes' },
      { name: 'is_recurring', type: 'BOOLEAN', constraints: 'NOT NULL DEFAULT false', description: 'Recurring template flag' },
      { name: 'recurring_frequency', type: 'VARCHAR(32)', constraints: "NULL CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly'))", description: 'Recurrence frequency' },
      { name: 'is_archived', type: 'BOOLEAN', constraints: 'NOT NULL DEFAULT false', description: 'Archived status flag' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Last update timestamp' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)',
    ],
    rlsPolicies: [
      'ALTER TABLE expenses ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for expenses select" ON expenses FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for expenses insert" ON expenses FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for expenses update" ON expenses FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for expenses delete" ON expenses FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'sales_orders',
    description: 'Commercial sales orders, customer commitments, and fulfillment state.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Order ID' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Creator user reference' },
      { name: 'customer_id', type: 'UUID', constraints: 'REFERENCES customers(id)', description: 'Customer reference' },
      { name: 'order_number', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Unique order number (SO-XXXX)' },
      { name: 'order_date', type: 'DATE', constraints: 'NOT NULL DEFAULT CURRENT_DATE', description: 'Order commitment date' },
      { name: 'status', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')) DEFAULT 'draft'", description: 'Order lifecycle status' },
      { name: 'subtotal', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0)', description: 'Pre-tax line total' },
      { name: 'discount_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0)', description: 'Total discount applied' },
      { name: 'tax_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0)', description: 'Sales tax/VAT amount' },
      { name: 'total_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0)', description: 'Final payable order value' },
      { name: 'notes', type: 'TEXT', constraints: 'NULL', description: 'Customer or fulfillment instructions' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Last update timestamp' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_num ON sales_orders(organization_id, order_number)',
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_cust ON sales_orders(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)',
    ],
    rlsPolicies: [
      'ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for sales_orders select" ON sales_orders FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for sales_orders insert" ON sales_orders FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for sales_orders update" ON sales_orders FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for sales_orders delete" ON sales_orders FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'sales_order_items',
    description: 'Line item snapshots preserving historical SKU, description, pricing, and quantities.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Line item ID' },
      { name: 'order_id', type: 'UUID', constraints: 'NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE', description: 'Parent sales order' },
      { name: 'product_id', type: 'UUID', constraints: 'REFERENCES products(id) ON DELETE SET NULL', description: 'Origin product reference' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'product_name_snapshot', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Immutable product name at sale' },
      { name: 'sku_snapshot', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Immutable SKU at sale' },
      { name: 'quantity', type: 'INTEGER', constraints: 'NOT NULL CHECK (quantity > 0)', description: 'Purchased quantity' },
      { name: 'unit_price', type: 'NUMERIC(12,2)', constraints: 'NOT NULL CHECK (unit_price >= 0)', description: 'Price per unit at sale' },
      { name: 'discount_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0)', description: 'Item level discount' },
      { name: 'tax_amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0)', description: 'Item level tax' },
      { name: 'line_total', type: 'NUMERIC(12,2)', constraints: 'NOT NULL CHECK (line_total >= 0)', description: 'Calculated line total' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_order_items_order ON sales_order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product ON sales_order_items(product_id)',
    ],
    rlsPolicies: [
      'ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for sales_order_items select" ON sales_order_items FOR SELECT USING (order_id IN (SELECT id FROM sales_orders WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for sales_order_items insert" ON sales_order_items FOR INSERT WITH CHECK (order_id IN (SELECT id FROM sales_orders WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for sales_order_items update" ON sales_order_items FOR UPDATE USING (order_id IN (SELECT id FROM sales_orders WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for sales_order_items delete" ON sales_order_items FOR DELETE USING (order_id IN (SELECT id FROM sales_orders WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid()))',
    ],
  },
  {
    tableName: 'payments',
    description: 'Payment receipts, partial collections, and reconciliation ledgers.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Payment record ID' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Cashier/staff recorded' },
      { name: 'invoice_id', type: 'UUID', constraints: 'REFERENCES invoices(id) ON DELETE SET NULL', description: 'Associated invoice' },
      { name: 'sales_order_id', type: 'UUID', constraints: 'REFERENCES sales_orders(id) ON DELETE SET NULL', description: 'Associated order' },
      { name: 'payment_number', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Unique receipt number (PAY-XXXX)' },
      { name: 'amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL CHECK (amount > 0)', description: 'Collected monetary amount' },
      { name: 'payment_date', type: 'DATE', constraints: 'NOT NULL DEFAULT CURRENT_DATE', description: 'Payment receipt date' },
      { name: 'payment_method', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')) DEFAULT 'card'", description: 'Payment instrument' },
      { name: 'reference', type: 'VARCHAR(128)', constraints: 'NULL', description: 'Bank / card reference or check number' },
      { name: 'notes', type: 'TEXT', constraints: 'NULL', description: 'Staff settlement notes' },
      { name: 'status', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (status IN ('recorded', 'reconciled', 'reversed')) DEFAULT 'recorded'", description: 'Settlement state' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_num ON payments(organization_id, payment_number)',
      'CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(sales_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC)',
    ],
    rlsPolicies: [
      'ALTER TABLE payments ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for payments select" ON payments FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for payments insert" ON payments FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for payments update" ON payments FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for payments delete" ON payments FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'expense_categories',
    description: 'Customizable operating expense categories with system defaults and organization isolation.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Category ID' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Author user reference' },
      { name: 'name', type: 'VARCHAR(128)', constraints: 'NOT NULL', description: 'Display name' },
      { name: 'slug', type: 'VARCHAR(128)', constraints: 'NOT NULL', description: 'Normalized category slug' },
      { name: 'description', type: 'TEXT', constraints: 'NULL', description: 'Category scope description' },
      { name: 'color', type: 'VARCHAR(32)', constraints: "DEFAULT '#f43f5e'", description: 'UI accent color hex code' },
      { name: 'is_system', type: 'BOOLEAN', constraints: 'NOT NULL DEFAULT false', description: 'System standard default flag' },
      { name: 'is_archived', type: 'BOOLEAN', constraints: 'NOT NULL DEFAULT false', description: 'Archived status flag' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_exp_cat_slug ON expense_categories(organization_id, slug)',
      'CREATE INDEX IF NOT EXISTS idx_exp_cat_org ON expense_categories(organization_id)',
    ],
    rlsPolicies: [
      'ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for expense_categories select" ON expense_categories FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for expense_categories insert" ON expense_categories FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for expense_categories update" ON expense_categories FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for expense_categories delete" ON expense_categories FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
  {
    tableName: 'expense_payments',
    description: 'Disbursements, partial settlement payments, and vendor remittance records for expenses.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Expense payment ID' },
      { name: 'organization_id', type: 'UUID', constraints: 'REFERENCES organizations(id) ON DELETE CASCADE', description: 'Parent organization' },
      { name: 'user_id', type: 'UUID', constraints: 'DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL', description: 'Staff user reference' },
      { name: 'expense_id', type: 'UUID', constraints: 'NOT NULL REFERENCES expenses(id) ON DELETE CASCADE', description: 'Linked expense reference' },
      { name: 'payment_number', type: 'VARCHAR(64)', constraints: 'NOT NULL', description: 'Remittance number (DISB-XXXX)' },
      { name: 'amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL CHECK (amount > 0)', description: 'Paid disbursement amount' },
      { name: 'payment_date', type: 'DATE', constraints: 'NOT NULL DEFAULT CURRENT_DATE', description: 'Disbursement date' },
      { name: 'payment_method', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')) DEFAULT 'card'", description: 'Payment source' },
      { name: 'reference', type: 'VARCHAR(128)', constraints: 'NULL', description: 'Wire / check / card transaction ID' },
      { name: 'notes', type: 'TEXT', constraints: 'NULL', description: 'Payment remarks' },
      { name: 'status', type: 'VARCHAR(32)', constraints: "NOT NULL CHECK (status IN ('recorded', 'reconciled', 'reversed')) DEFAULT 'recorded'", description: 'Remittance state' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()', description: 'Creation timestamp' },
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_exp_pay_expense ON expense_payments(expense_id)',
      'CREATE INDEX IF NOT EXISTS idx_exp_pay_date ON expense_payments(payment_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_exp_pay_org ON expense_payments(organization_id)',
    ],
    rlsPolicies: [
      'ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Organization isolation for expense_payments select" ON expense_payments FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for expense_payments insert" ON expense_payments FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()))',
      'CREATE POLICY "Organization isolation for expense_payments update" ON expense_payments FOR UPDATE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
      'CREATE POLICY "Organization isolation for expense_payments delete" ON expense_payments FOR DELETE USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid())',
    ],
  },
];

export function generatePhase2AuthMigrationSql(): string {
  return `-- =========================================================================
-- CHERRYFLOW PHASE 2: AUTHENTICATION & USER MANAGEMENT MIGRATION
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =========================================================================

-- 1. Create User Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- 4. Create RLS Policies enforcing strict user ownership
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Automatic Profile Creation Trigger on Supabase Sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;
}

export function generateFullSqlSchema(): string {
  let sql = `-- =========================================================================\n`;
  sql += `-- CHERRYFLOW DATABASE SCHEMA BLUEPRINT & SECURITY ENGINE (Supabase PostgreSQL)\n`;
  sql += `-- Phase 9 Architectural & Security Audit for Multi-Tenant SaaS\n`;
  sql += `-- Tagline: Manage. Automate. Grow.\n`;
  sql += `-- Architect: Nithiarasu (nithiarasu248@gmail.com | 9952281794)\n`;
  sql += `-- =========================================================================\n\n`;

  sql += generatePhase2AuthMigrationSql();
  sql += `\n\n`;

  for (const table of CHERRYFLOW_SCHEMA_TABLES) {
    if (table.tableName === 'profiles') continue; // already emitted in Phase 2 block

    sql += `-- Table: ${table.tableName}\n`;
    sql += `-- ${table.description}\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${table.tableName} (\n`;

    const colLines = table.columns.map((c) => {
      return `  ${c.name.padEnd(20)} ${c.type} ${c.constraints || ''}`.trimEnd();
    });

    sql += colLines.join(',\n');
    sql += `\n);\n\n`;

    for (const idx of table.indexes) {
      sql += `${idx};\n`;
    }

    for (const rls of table.rlsPolicies) {
      if (rls.startsWith('--')) {
        sql += `${rls}\n`;
      } else {
        sql += `${rls};\n`;
      }
    }

    sql += `\n`;
  }

  // Database Consistency & Server-Side Invariants (Step 5)
  sql += `-- =========================================================================\n`;
  sql += `-- SERVER-SIDE DATA CONSISTENCY & INTEGRITY TRIGGERS\n`;
  sql += `-- =========================================================================\n\n`;

  sql += `-- 1. Prevent Negative Inventory Trigger\n`;
  sql += `CREATE OR REPLACE FUNCTION public.check_stock_non_negative()\n`;
  sql += `RETURNS trigger AS $$\n`;
  sql += `BEGIN\n`;
  sql += `  IF NEW.stock_quantity < 0 THEN\n`;
  sql += `    RAISE EXCEPTION 'Stock quantity cannot be negative for product SKU % (Current: %, Delta: %)',\n`;
  sql += `      NEW.sku, NEW.stock_quantity, (NEW.stock_quantity - OLD.stock_quantity);\n`;
  sql += `  END IF;\n`;
  sql += `  RETURN NEW;\n`;
  sql += `END;\n`;
  sql += `$$ LANGUAGE plpgsql;\n\n`;
  sql += `DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON public.products;\n`;
  sql += `CREATE TRIGGER trg_prevent_negative_stock\n`;
  sql += `  BEFORE INSERT OR UPDATE OF stock_quantity ON public.products\n`;
  sql += `  FOR EACH ROW EXECUTE FUNCTION public.check_stock_non_negative();\n\n`;

  sql += `-- 2. Automated Updated-At Timestamps\n`;
  sql += `CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()\n`;
  sql += `RETURNS trigger AS $$\n`;
  sql += `BEGIN\n`;
  sql += `  NEW.updated_at = now();\n`;
  sql += `  RETURN NEW;\n`;
  sql += `END;\n`;
  sql += `$$ LANGUAGE plpgsql;\n\n`;

  const updatedTables = ['organizations', 'customers', 'products', 'invoices', 'expenses', 'sales_orders'];
  for (const t of updatedTables) {
    sql += `DROP TRIGGER IF EXISTS trg_${t}_updated_at ON public.${t};\n`;
    sql += `CREATE TRIGGER trg_${t}_updated_at\n`;
    sql += `  BEFORE UPDATE ON public.${t}\n`;
    sql += `  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();\n`;
  }
  sql += `\n`;

  sql += `-- 3. Invoice Payment Balance & Status Auto-Sync\n`;
  sql += `CREATE OR REPLACE FUNCTION public.sync_invoice_payment_status()\n`;
  sql += `RETURNS trigger AS $$\n`;
  sql += `BEGIN\n`;
  sql += `  IF NEW.amount_paid >= NEW.total_amount AND NEW.total_amount > 0 THEN\n`;
  sql += `    NEW.status = 'paid';\n`;
  sql += `  ELSIF NEW.amount_paid > 0 AND NEW.status = 'draft' THEN\n`;
  sql += `    NEW.status = 'issued';\n`;
  sql += `  END IF;\n`;
  sql += `  RETURN NEW;\n`;
  sql += `END;\n`;
  sql += `$$ LANGUAGE plpgsql;\n\n`;
  sql += `DROP TRIGGER IF EXISTS trg_sync_invoice_status ON public.invoices;\n`;
  sql += `CREATE TRIGGER trg_sync_invoice_status\n`;
  sql += `  BEFORE INSERT OR UPDATE OF amount_paid, total_amount ON public.invoices\n`;
  sql += `  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_status();\n\n`;

  return sql;
}
