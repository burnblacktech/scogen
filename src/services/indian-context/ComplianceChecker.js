/**
 * Compliance Checker
 * 
 * Checks Indian compliance requirements (GST, data protection, etc.)
 * Part of Precision Pivot system - Indian Context
 */

class ComplianceChecker {
    constructor(logger, db) {
        this.logger = logger || console;
        this.db = db;
        this.complianceRules = this.loadComplianceRules();
    }

    /**
     * Check compliance for a feature
     * @param {Object} feature - Feature to check
     * @param {Object} projectContext - Project context
     * @returns {Object} Compliance check result
     */
    async check(feature, projectContext = {}) {
        const checks = [];
        const requirements = [];

        // GST compliance
        if (projectContext.requiresGST || feature.involvesPayment) {
            const gstCheck = this.checkGSTCompliance(feature, projectContext);
            checks.push(gstCheck);
            if (gstCheck.required) {
                requirements.push('GST calculation and invoice generation');
            }
        }

        // Data protection compliance
        if (feature.handlesPersonalData || projectContext.requiresDataProtection) {
            const dataCheck = this.checkDataProtectionCompliance(feature);
            checks.push(dataCheck);
            if (dataCheck.required) {
                requirements.push('Data protection measures (encryption, consent)');
            }
        }

        // Payment compliance
        if (feature.involvesPayment) {
            const paymentCheck = this.checkPaymentCompliance(feature, projectContext);
            checks.push(paymentCheck);
            if (paymentCheck.required) {
                requirements.push('PCI-DSS compliance for payment processing');
            }
        }

        // Industry-specific compliance
        if (projectContext.industry) {
            const industryCheck = this.checkIndustryCompliance(feature, projectContext.industry);
            checks.push(industryCheck);
            if (industryCheck.required) {
                requirements.push(`${projectContext.industry} industry compliance`);
            }
        }

        const allCompliant = checks.every(c => c.compliant !== false);
        const requiredChecks = checks.filter(c => c.required);

        return {
            compliant: allCompliant,
            checks: checks,
            requirements: requirements,
            requiredChecks: requiredChecks.length,
            recommendations: this.generateRecommendations(checks)
        };
    }

    /**
     * Check GST compliance
     */
    checkGSTCompliance(feature, projectContext) {
        const required = projectContext.requiresGST || feature.involvesPayment;
        
        if (!required) {
            return {
                type: 'GST',
                required: false,
                compliant: true,
                message: 'GST compliance not required'
            };
        }

        const hasGSTLogic = feature.functions?.some(f => 
            f.includesGSTLogic || f.name.toLowerCase().includes('gst')
        );

        return {
            type: 'GST',
            required: true,
            compliant: hasGSTLogic,
            message: hasGSTLogic ? 
                'GST logic implemented' : 
                'GST calculation logic required',
            action: hasGSTLogic ? null : 'Add GST calculation to payment functions'
        };
    }

    /**
     * Check data protection compliance
     */
    checkDataProtectionCompliance(feature) {
        const handlesPersonalData = feature.handlesPersonalData || 
            feature.functions?.some(f => 
                f.name.toLowerCase().includes('personal') ||
                f.name.toLowerCase().includes('data') ||
                f.name.toLowerCase().includes('user')
            );

        if (!handlesPersonalData) {
            return {
                type: 'Data Protection',
                required: false,
                compliant: true,
                message: 'No personal data handling detected'
            };
        }

        const hasEncryption = feature.functions?.some(f =>
            f.name.toLowerCase().includes('encrypt') ||
            f.name.toLowerCase().includes('hash')
        );

        return {
            type: 'Data Protection',
            required: true,
            compliant: hasEncryption,
            message: hasEncryption ?
                'Data protection measures in place' :
                'Data encryption required for personal data',
            action: hasEncryption ? null : 'Add encryption/hashing for sensitive data'
        };
    }

    /**
     * Check payment compliance
     */
    checkPaymentCompliance(feature, projectContext) {
        if (!feature.involvesPayment) {
            return {
                type: 'Payment',
                required: false,
                compliant: true,
                message: 'No payment processing detected'
            };
        }

        const hasSecureStorage = feature.functions?.some(f =>
            f.name.toLowerCase().includes('secure') ||
            f.name.toLowerCase().includes('token')
        );

        return {
            type: 'Payment',
            required: true,
            compliant: hasSecureStorage,
            message: hasSecureStorage ?
                'Payment security measures in place' :
                'PCI-DSS compliance required for payment processing',
            action: hasSecureStorage ? null : 'Implement secure payment storage and processing'
        };
    }

    /**
     * Check industry-specific compliance
     */
    checkIndustryCompliance(feature, industry) {
        const industryRules = this.complianceRules[industry] || {};

        if (!industryRules.required) {
            return {
                type: `${industry} Industry`,
                required: false,
                compliant: true,
                message: 'No industry-specific compliance required'
            };
        }

        return {
            type: `${industry} Industry`,
            required: true,
            compliant: false, // Would need actual check
            message: `${industryRules.description || 'Industry compliance required'}`,
            action: industryRules.action || 'Review industry-specific compliance requirements'
        };
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(checks) {
        const recommendations = [];

        checks.forEach(check => {
            if (check.required && !check.compliant && check.action) {
                recommendations.push({
                    type: check.type,
                    priority: check.type === 'Payment' ? 'high' : 'medium',
                    action: check.action
                });
            }
        });

        return recommendations;
    }

    /**
     * Load compliance rules
     */
    loadComplianceRules() {
        return {
            'fintech': {
                required: true,
                description: 'RBI compliance required for financial services',
                action: 'Ensure RBI guidelines compliance'
            },
            'healthcare': {
                required: true,
                description: 'HIPAA-like compliance for patient data',
                action: 'Implement patient data protection measures'
            },
            'ecommerce': {
                required: true,
                description: 'Consumer protection and GST compliance',
                action: 'Ensure consumer protection and GST compliance'
            }
        };
    }
}

module.exports = ComplianceChecker;

