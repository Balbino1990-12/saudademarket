/**
 * Add Sample Portuguese Specialties
 * This script loads default specialties into the database
 */

require('dotenv').config();
const { pool, initDatabase } = require('./src/config/database');

const specialties = [
    {
        name_en: 'Olive Oil',
        name_fr: 'Huile d\'Olive',
        name_pt: 'Azeite de Oliva',
        category: 'Oils & Vinegars',
        description: 'Premium',
        
        
        
        //olive oil, cold-pressed from select olives. Rich in flavor and antioxidants.',
        image: '/images/olive-oil.jpg',
        icon: '🫒',
        color: '#8B7500',
        active: 1
    },
    {
        name_en: 'Pastéis de Nata',
        name_fr: 'Pastéis de Nata',
        name_pt: 'Pastéis de Nata',
        category: 'Pastries & Sweets',
        description: 'Traditional Portuguese custard tarts with crispy pastry and creamy egg custard filling.',
        image: '/images/pasteis-nata.jpg',
        icon: '🥐',
        color: '#D4A574',
        active: 1
    },
    {
        name_en: 'Bacalhau',
        name_fr: 'Morue',
        name_pt: 'Bacalhau',
        category: 'Fish & Seafood',
        description: 'Salted cod, a staple of Portuguese cuisine. Perfect for traditional dishes like Bacalhau à Brás.',
        image: '/images/bacalhau.jpg',
        icon: '🐟',
        color: '#D4B59F',
        active: 1
    },
    {
        name_en: 'Chorizo & Jambon',
        name_fr: 'Chorizo & Jambon',
        name_pt: 'Chouriço e Presunto',
        category: 'Cured Meats',
        description: 'Traditional Portuguese cured meats including chorizo and jambon. Aged to perfection.',
        image: '/images/cured-meats.jpg',
        icon: '🥩',
        color: '#8B4513',
        active: 1
    },
    {
        name_en: 'Wine & Port',
        name_fr: 'Vin & Porto',
        name_pt: 'Vinho & Porto',
        category: 'Wines & Liqueurs',
        description: 'Fine Portuguese wines and world-renowned Port wines from the Douro Valley.',
        image: '/images/wine-port.jpg',
        icon: '🍷',
        color: '#722F37',
        active: 1
    },
    {
        name_en: 'Gourmet Gift Box',
        name_fr: 'Coffret Gourmand',
        name_pt: 'Caixa de Presentes Gourmet',
        category: 'Gift Sets',
        description: 'Carefully curated gift boxes featuring the best Portuguese specialties and delicacies.',
        image: '/images/gift-box.jpg',
        icon: '🎁',
        color: '#C41E1E',
        active: 1
    }
];

/**
 * Insert specialties into database
 */
async function insertSpecialties() {
    try {
        console.log('[Specialties] Starting data insertion...');
        
        // Initialize database first
        await initDatabase();
        console.log('[Specialties] Database initialized\n');
        
        for (const specialty of specialties) {
            const query = `
                INSERT INTO specialties 
                (name_en, name_fr, name_pt, category, description, image, icon, color, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await pool.query(query, [
                specialty.name_en,
                specialty.name_fr,
                specialty.name_pt,
                specialty.category,
                specialty.description,
                specialty.image,
                specialty.icon,
                specialty.color,
                specialty.active
            ]);
            
            console.log(`✓ Added: ${specialty.name_en} (ID: ${result.insertId})`);
        }
        
        console.log(`\n[Specialties] Successfully inserted ${specialties.length} specialties`);
        process.exit(0);
        
    } catch (error) {
        console.error('[Specialties] Insertion error:', error);
        process.exit(1);
    }
}

// Run
insertSpecialties();
