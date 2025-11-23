/**
 * GST Calculator
 * 
 * Calculates GST amounts and generates GST-compliant invoices
 * Part of Precision Pivot system - Indian Context
 */

class GSTCalculator {
    constructor(logger) {
        this.logger = logger || console;
        this.defaultRate = 0.18; // 18% GST
        this.gstRates = {
            'standard': 0.18, // 18% - Most goods and services
            'reduced': 0.05,  // 5% - Essential goods
            'zero': 0.0,      // 0% - Exported goods
            'exempt': 0.0     // 0% - Exempt goods
        };
    }

    /**
     * Calculate GST amount
     * @param {number} amount - Base amount
     * @param {number|string} rate - GST rate (number or rate name)
     * @param {Object} options - Calculation options
     * @returns {Object} GST calculation result
     */
    calculate(amount, rate = this.defaultRate, options = {}) {
        if (typeof amount !== 'number' || amount <= 0) {
            throw new Error('Invalid amount. Must be a positive number.');
        }

        // Resolve rate
        const gstRate = typeof rate === 'string' ? 
            (this.gstRates[rate] || this.defaultRate) : 
            (rate || this.defaultRate);

        // Calculate GST
        const gstAmount = Math.round(amount * gstRate * 100) / 100;
        const totalAmount = amount + gstAmount;

        return {
            baseAmount: amount,
            gstRate: gstRate,
            gstAmount: gstAmount,
            totalAmount: totalAmount,
            formatted: {
                baseAmount: this.formatCurrency(amount),
                gstAmount: this.formatCurrency(gstAmount),
                totalAmount: this.formatCurrency(totalAmount),
                gstRate: `${(gstRate * 100).toFixed(0)}%`
            }
        };
    }

    /**
     * Calculate GST for multiple items
     * @param {Array} items - Array of items with amount and rate
     * @returns {Object} Total GST calculation
     */
    calculateMultiple(items) {
        let totalBase = 0;
        let totalGST = 0;
        const breakdown = [];

        items.forEach((item, index) => {
            const calc = this.calculate(
                item.amount,
                item.rate || this.defaultRate,
                item.options
            );

            totalBase += calc.baseAmount;
            totalGST += calc.gstAmount;

            breakdown.push({
                item: item.name || `Item ${index + 1}`,
                ...calc
            });
        });

        return {
            items: breakdown,
            totals: {
                baseAmount: totalBase,
                gstAmount: totalGST,
                totalAmount: totalBase + totalGST
            },
            formatted: {
                baseAmount: this.formatCurrency(totalBase),
                gstAmount: this.formatCurrency(totalGST),
                totalAmount: this.formatCurrency(totalBase + totalGST)
            }
        };
    }

    /**
     * Generate GST invoice
     * @param {Object} invoiceData - Invoice data
     * @returns {Object} GST-compliant invoice
     */
    generateInvoice(invoiceData) {
        const {
            invoiceNumber,
            date,
            items,
            customer,
            seller,
            placeOfSupply
        } = invoiceData;

        // Calculate GST for all items
        const gstCalculation = this.calculateMultiple(items);

        // Generate invoice number if not provided
        const finalInvoiceNumber = invoiceNumber || this.generateInvoiceNumber();

        // Generate invoice date
        const invoiceDate = date || new Date().toISOString().split('T')[0];

        return {
            invoiceNumber: finalInvoiceNumber,
            invoiceDate: invoiceDate,
            customer: customer || {},
            seller: seller || {},
            placeOfSupply: placeOfSupply || 'India',
            items: gstCalculation.items,
            totals: {
                ...gstCalculation.totals,
                formatted: gstCalculation.formatted
            },
            gstDetails: {
                cgst: gstCalculation.totals.gstAmount / 2, // Central GST (50% of total GST)
                sgst: gstCalculation.totals.gstAmount / 2, // State GST (50% of total GST)
                igst: 0 // Integrated GST (for inter-state, would be full GST amount)
            },
            paymentTerms: invoiceData.paymentTerms || 'Net 30',
            notes: invoiceData.notes || ''
        };
    }

    /**
     * Generate invoice number (GST compliant format)
     */
    generateInvoiceNumber(prefix = 'INV') {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}-${year}${month}-${sequence}`;
    }

    /**
     * Format currency (Indian format)
     */
    formatCurrency(amount) {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)}Cr`;
        }
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)}L`;
        }
        if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(2)}K`;
        }
        return `₹${Math.round(amount).toLocaleString('en-IN')}`;
    }

    /**
     * Validate GST number format
     */
    validateGSTNumber(gstNumber) {
        // GST number format: 15 characters, alphanumeric
        // Format: 2 digits (state code) + 10 digits (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 digit (check digit)
        const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstPattern.test(gstNumber);
    }
}

module.exports = GSTCalculator;

