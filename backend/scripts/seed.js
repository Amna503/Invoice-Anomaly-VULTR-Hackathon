import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Vendor from '../src/models/Vendor.js';
import PurchaseOrder from '../src/models/PurchaseOrder.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from files, fall back to inline data
let vendors, purchaseOrders;

try {
  const vendorsPath = path.join(__dirname, '../../data/vendors.json');
  const posPath = path.join(__dirname, '../../data/purchase_orders.json');

  vendors = JSON.parse(fs.readFileSync(vendorsPath, 'utf-8'));
  purchaseOrders = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
  console.log('Loaded seed data from files');
} catch (error) {
  console.log('Data files not found, using inline fallback data');
  vendors = [
    {
      name: 'Acme Corp',
      taxId: '12-3456789',
      bankAccount: '****1234',
      email: 'billing@acme.com',
      paymentTerms: 'net30'
    },
    {
      name: 'Global Supplies Inc',
      taxId: '98-7654321',
      bankAccount: '****5678',
      email: 'ap@globalsupplies.com',
      paymentTerms: 'net45'
    },
    {
      name: 'Tech Services LLC',
      taxId: '45-1234567',
      bankAccount: '****9012',
      email: 'invoices@techservices.com',
      paymentTerms: 'net30'
    }
  ];

  purchaseOrders = [
    {
      poNumber: 'PO-1001',
      vendorTaxId: '12-3456789',
      lineItems: [
        {
          description: 'Consulting Services',
          quantity: 40,
          unitPrice: 150,
          amount: 6000
        }
      ],
      status: 'approved',
      approvedBy: 'Manager A'
    },
    {
      poNumber: 'PO-1002',
      vendorTaxId: '98-7654321',
      lineItems: [
        {
          description: 'Office Supplies',
          quantity: 100,
          unitPrice: 25,
          amount: 2500
        }
      ],
      status: 'approved',
      approvedBy: 'Manager B'
    },
    {
      poNumber: 'PO-1003',
      vendorTaxId: '45-1234567',
      lineItems: [
        {
          description: 'Software License',
          quantity: 10,
          unitPrice: 500,
          amount: 5000
        }
      ],
      status: 'approved',
      approvedBy: 'Manager C'
    }
  ];
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Upsert vendors (idempotent - no duplicates on re-run)
    let vendorCount = 0;
    const vendorMap = new Map();

    for (const vendor of vendors) {
      const result = await Vendor.findOneAndUpdate(
        { taxId: vendor.taxId },
        vendor,
        { upsert: true, new: true }
      );
      vendorMap.set(vendor.taxId, result._id);
      vendorCount++;
    }
    console.log(`Upserted ${vendorCount} vendors`);

    // Upsert purchase orders (idempotent)
    let poCount = 0;
    for (const po of purchaseOrders) {
      const vendorId = vendorMap.get(po.vendorTaxId);
      if (!vendorId) {
        console.warn(`Skipping PO ${po.poNumber} - vendor with taxId ${po.vendorTaxId} not found`);
        continue;
      }

      await PurchaseOrder.findOneAndUpdate(
        { poNumber: po.poNumber },
        {
          ...po,
          vendorId,
          vendorTaxId: undefined // Remove helper field
        },
        { upsert: true, new: true }
      );
      poCount++;
    }
    console.log(`Upserted ${poCount} purchase orders`);

    console.log('\n✓ Seed data loaded successfully (safe to re-run)');

    const allVendors = await Vendor.find();
    const allPOs = await PurchaseOrder.find();

    console.log('\nVendors:');
    allVendors.forEach(v => console.log(`  - ${v.name} (${v._id})`));
    console.log('\nPurchase Orders:');
    allPOs.forEach(po => console.log(`  - ${po.poNumber} (${po._id})`));

    await mongoose.disconnect();

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
