require('dotenv').config();
const { connect, getDb, close } = require('./src/db/mongo');

async function seedAlbumVendors() {
  try {
    await connect();
    const db = getDb();
    
    // Clear existing data
    await db.collection('album_vendors').deleteMany({});
    
    // Insert sample album vendors
    const albumVendors = [
      {
        name: 'Royal Album Studio',
        email: 'royal@albumstudio.com',
        whatsappNo: '+94712345678',
        city: 'Colombo',
        status: 'approved',
        createdAt: new Date()
      },
      {
        name: 'Wedding Memories Albums',
        email: 'memories@albums.com',
        whatsappNo: '+94723456789',
        city: 'Kandy',
        status: 'pending',
        createdAt: new Date()
      },
      {
        name: 'Premium Photo Albums',
        email: 'premium@photos.com',
        whatsappNo: '+94734567890',
        city: 'Galle',
        status: 'approved',
        createdAt: new Date()
      }
    ];
    
    const result = await db.collection('album_vendors').insertMany(albumVendors);
    console.log(`✅ Inserted ${result.insertedCount} album vendors`);
    
    // Verify the data
    const count = await db.collection('album_vendors').countDocuments();
    console.log(`📊 Total album vendors in database: ${count}`);
    
    await close();
  } catch (error) {
    console.error('❌ Error seeding album vendors:', error);
    process.exit(1);
  }
}

seedAlbumVendors();