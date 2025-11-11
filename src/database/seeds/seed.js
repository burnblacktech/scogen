/**
 * Database Seed Data
 * 
 * Seeds test data for development and testing
 */

const DatabaseManagerV2 = require('../db-manager-v2');

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');
  
  const db = new DatabaseManagerV2();
  db.initialize();
  
  try {
    // Seed test clients
    const clients = [
      {
        identifier: 'techstart@example.com',
        company_name: 'TechStart Solutions',
        contact_name: 'Raj Kumar',
        email: 'techstart@example.com',
        phone: '+919876543210',
        tech_savvy: 'high',
        industry: 'saas',
        client_type: 'startup'
      },
      {
        identifier: 'retail@example.com',
        company_name: 'RetailPlus Store',
        contact_name: 'Priya Sharma',
        email: 'retail@example.com',
        phone: '+919876543211',
        tech_savvy: 'low',
        industry: 'retail',
        client_type: 'sme'
      },
      {
        identifier: 'enterprise@example.com',
        company_name: 'Enterprise Corp',
        contact_name: 'Amit Patel',
        email: 'enterprise@example.com',
        phone: '+919876543212',
        tech_savvy: 'medium',
        industry: 'enterprise',
        client_type: 'enterprise'
      }
    ];
    
    for (const client of clients) {
      const id = db.createOrUpdateClient(client);
      console.log(`✅ Created client: ${client.company_name} (ID: ${id})`);
    }
    
    // Seed test patterns
    const patterns = [
      {
        type: 'module_effort',
        domain: 'ecommerce',
        key: 'ShoppingCart',
        value: { baseEffort: 3, complexity: 'medium', typicalDays: 3 }
      },
      {
        type: 'module_effort',
        domain: 'ecommerce',
        key: 'PaymentGateway',
        value: { baseEffort: 5, complexity: 'high', typicalDays: 5 }
      },
      {
        type: 'module_effort',
        domain: 'ecommerce',
        key: 'ProductCatalog',
        value: { baseEffort: 4, complexity: 'medium', typicalDays: 4 }
      },
      {
        type: 'hidden_cost',
        domain: 'retail',
        key: 'coordination',
        value: { multiplier: 1.15, reason: 'Non-technical clients require more hand-holding' }
      },
      {
        type: 'hidden_cost',
        domain: 'saas',
        key: 'documentation',
        value: { multiplier: 1.20, reason: 'SaaS products require extensive documentation' }
      },
      {
        type: 'effort_variance',
        domain: 'ecommerce',
        key: 'PaymentGateway',
        value: { multiplier: 1.2, samples: 5, note: 'Payment integrations typically take 20% longer' }
      }
    ];
    
    for (const pattern of patterns) {
      db.recordPattern(
        pattern.type,
        pattern.domain,
        pattern.key,
        pattern.value,
        true // Success
      );
      console.log(`✅ Created pattern: ${pattern.type}/${pattern.domain}/${pattern.key}`);
    }
    
    // Seed estimation accuracy data
    const accuracyData = [
      {
        module_name: 'Authentication',
        domain: 'general',
        total_estimates: 10,
        total_actual_effort: 45,
        total_estimated_effort: 40,
        avg_variance: 0.125,
        accuracy_percentage: 87.5,
        recommended_multiplier: 1.125
      },
      {
        module_name: 'Dashboard',
        domain: 'general',
        total_estimates: 8,
        total_actual_effort: 32,
        total_estimated_effort: 30,
        avg_variance: 0.067,
        accuracy_percentage: 93.3,
        recommended_multiplier: 1.067
      },
      {
        module_name: 'PaymentGateway',
        domain: 'ecommerce',
        total_estimates: 12,
        total_actual_effort: 66,
        total_estimated_effort: 55,
        avg_variance: 0.20,
        accuracy_percentage: 80.0,
        recommended_multiplier: 1.20
      }
    ];
    
    for (const acc of accuracyData) {
      const sql = `
        INSERT INTO estimation_accuracy (
          module_name, domain, total_estimates,
          total_actual_effort, total_estimated_effort,
          avg_variance, accuracy_percentage, recommended_multiplier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(module_name, domain) 
        DO UPDATE SET
          total_estimates = excluded.total_estimates,
          total_actual_effort = excluded.total_actual_effort,
          total_estimated_effort = excluded.total_estimated_effort,
          avg_variance = excluded.avg_variance,
          accuracy_percentage = excluded.accuracy_percentage,
          recommended_multiplier = excluded.recommended_multiplier,
          last_updated = CURRENT_TIMESTAMP
      `;
      
      db.db.prepare(sql).run(
        acc.module_name,
        acc.domain,
        acc.total_estimates,
        acc.total_actual_effort,
        acc.total_estimated_effort,
        acc.avg_variance,
        acc.accuracy_percentage,
        acc.recommended_multiplier
      );
      
      console.log(`✅ Created accuracy record: ${acc.module_name} (${acc.domain})`);
    }
    
    console.log('\n✅ Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase().catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}

module.exports = seedDatabase;

