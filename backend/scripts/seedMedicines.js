const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Medicine = require('../models/Medicine');

dotenv.config({
  path: path.join(__dirname, '../.env')
});

const medicines = [
  // TABLETS / CHURNA
  {
    name: "RaktaBal",
    category: "tablets",
    quantity: 50,
    alertLevel: 10
  },
  {
    name: "Aampachak Vati",
    category: "tablets",
    quantity: 100,
    alertLevel: 20
  },
  {
    name: "Panchasakar Churna",
    category: "tablets",
    quantity: 200,
    alertLevel: 30
  },
  {
    name: "Triguni Plus",
    category: "tablets",
    quantity: 60,
    alertLevel: 15
  },
  {
    name: "Kaishor Guggul",
    category: "tablets",
    quantity: 80,
    alertLevel: 10
  },
  {
    name: "Medohar Guggul",
    category: "tablets",
    quantity: 75,
    alertLevel: 12
  },
  {
    name: "Yograj Guggul",
    category: "tablets",
    quantity: 90,
    alertLevel: 10
  },
  {
    name: "Mahayograj Guggul",
    category: "tablets",
    quantity: 40,
    alertLevel: 8
  },
  {
    name: "Gokshura",
    category: "tablets",
    quantity: 120,
    alertLevel: 25
  },
  {
    name: "Shilajit",
    category: "tablets",
    quantity: 30,
    alertLevel: 5
  },
  {
    name: "Triphala",
    category: "tablets",
    quantity: 250,
    alertLevel: 50
  },

  // LIQUIDS / KADHA
  {
    name: "Chandanasavam",
    category: "liquids",
    quantity: 15,
    alertLevel: 5
  },
  {
    name: "Vidangarishta",
    category: "liquids",
    quantity: 20,
    alertLevel: 5
  },
  {
    name: "Mahamanjishtadi Kadha",
    category: "liquids",
    quantity: 25,
    alertLevel: 5
  },
  {
    name: "Abhayarishta",
    category: "liquids",
    quantity: 30,
    alertLevel: 8
  },
  {
    name: "Gokshuradi Kadha",
    category: "liquids",
    quantity: 40,
    alertLevel: 10
  },
  {
    name: "Kumaryasavam",
    category: "liquids",
    quantity: 35,
    alertLevel: 7
  },
  {
    name: "Ashwagandharishta",
    category: "liquids",
    quantity: 50,
    alertLevel: 12
  },
  {
    name: "Balarishta",
    category: "liquids",
    quantity: 18,
    alertLevel: 4
  },
  {
    name: "Guduchyadi Kashayam",
    category: "liquids",
    quantity: 22,
    alertLevel: 6
  },
  {
    name: "Rasnerandhi Kashayam",
    category: "liquids",
    quantity: 12,
    alertLevel: 5
  },

  // OTHERS
  {
    name: "Swasamrutham Liquid",
    category: "others",
    quantity: 28,
    alertLevel: 10
  },
  {
    name: "Divsora Oil",
    category: "others",
    quantity: 14,
    alertLevel: 5
  },
  {
    name: "TrimaLIP",
    category: "others",
    quantity: 55,
    alertLevel: 15
  },
  {
    name: "Divasto",
    category: "others",
    quantity: 42,
    alertLevel: 12
  },
  {
    name: "Ksheerabala (101)",
    category: "others",
    quantity: 9,
    alertLevel: 5
  },
  {
    name: "Trikatu Churna",
    category: "others",
    quantity: 110,
    alertLevel: 25
  },
  {
    name: "Chyawanprash",
    category: "others",
    quantity: 65,
    alertLevel: 15
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const med of medicines) {
      await Medicine.findOneAndUpdate({
        name: med.name
      }, med, {
        upsert: true,
        new: true
      });
    }

    console.log('Medicines seeded successfully');
    process.exit();
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();
