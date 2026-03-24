const http = require('http');

const specialists = [
  {
    name_en: "João Silva",
    name_fr: "João Silva",
    name_pt: "João Silva",
    specialty: "Cheese Master",
    description: "Master cheese maker with 25 years of experience in traditional Portuguese cheese production",
    location: "Nazaré, Portugal",
    expertise_years: 25,
    email: "joao@portuguese-cheese.pt",
    phone: "+351 912 345 678",
    website: "https://portuguese-cheese.pt",
    image: "https://via.placeholder.com/300x300?text=Cheese+Master"
  },
  {
    name_en: "Maria Santos",
    name_fr: "Maria Santos",
    name_pt: "Maria Santos",
    specialty: "Wine Specialist",
    description: "Certified wine sommelier specializing in Portuguese wines and Port wines with 20 years experience",
    location: "Porto, Portugal",
    expertise_years: 20,
    email: "maria@portuguese-wines.pt",
    phone: "+351 923 456 789",
    website: "https://portuguese-wines.pt",
    image: "https://via.placeholder.com/300x300?text=Wine+Expert"
  },
  {
    name_en: "Carlos Oliveira",
    name_fr: "Carlos Oliveira",
    name_pt: "Carlos Oliveira",
    specialty: "Cured Meats Expert",
    description: "Artisan in traditional Portuguese charcuterie and cured meats with 30 years of expertise",
    location: "Guarda, Portugal",
    expertise_years: 30,
    email: "carlos@portuguese-meats.pt",
    phone: "+351 934 567 890",
    website: "https://portuguese-meats.pt",
    image: "https://via.placeholder.com/300x300?text=Meats+Expert"
  },
  {
    name_en: "Ana Ferreira",
    name_fr: "Ana Ferreira",
    name_pt: "Ana Ferreira",
    specialty: "Pastry Chef",
    description: "Traditional Portuguese pastry chef specializing in pastéis de nata and regional sweets",
    location: "Belém, Lisbon",
    expertise_years: 22,
    email: "ana@portuguese-pastries.pt",
    phone: "+351 945 678 901",
    website: "https://portuguese-pastries.pt",
    image: "https://via.placeholder.com/300x300?text=Pastry+Chef"
  },
  {
    name_en: "Pedro Costa",
    name_fr: "Pedro Costa",
    name_pt: "Pedro Costa",
    specialty: "Seafood & Canned Goods",
    description: "Expert in Portuguese seafood preservation techniques and traditional canned fish products",
    location: "Setúbal, Portugal",
    expertise_years: 28,
    email: "pedro@portuguese-seafood.pt",
    phone: "+351 956 789 012",
    website: "https://portuguese-seafood.pt",
    image: "https://via.placeholder.com/300x300?text=Seafood+Expert"
  }
];

function postData(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve({ success: false, raw: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function addSpecialists() {
  try {
    console.log('Adding sample specialists...\n');
    
    for (const specialist of specialists) {
      try {
        const response = await postData('/api/specialists', specialist);
        if (response.success) {
          console.log(`✓ Added: ${specialist.name_en} (${specialist.specialty})`);
        } else {
          console.log(`⚠ Response for ${specialist.name_en}:`, response.message || 'Unknown response');
        }
      } catch (err) {
        console.error(`✗ Failed to add ${specialist.name_en}:`, err.message);
      }
    }
    
    console.log('\n✓ Sample data addition complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addSpecialists();
