
import { Product, Store } from './types';

const VARIANTS_STAPLES = [
  { name: '1 kg', multiplier: 1 },
  { name: '2 kg', multiplier: 2 },
  { name: '5 kg', multiplier: 4.8 }, // Discount for bulk
  { name: '10 kg', multiplier: 9.5 }
];

const VARIANTS_OILS = [
  { name: '1 L', multiplier: 1 },
  { name: '5 L', multiplier: 4.8 }
];

const VARIANTS_DAIRY = [
  { name: '500 ml', multiplier: 0.5 },
  { name: '1 L', multiplier: 1 }
];

const VARIANTS_SNACKS = [
  { name: 'Small', multiplier: 1 },
  { name: 'Family Pack', multiplier: 2.5 }
];

export const INITIAL_PRODUCTS: Product[] = [
  // --- 1–20: Staples, Grains & Pulses ---
  { id: '1', name: 'Rice', price: 60, emoji: '🍚', category: 'Staples', brands: [{name: 'India Gate', price: 85}, {name: 'Daawat', price: 90}, {name: 'Fortune', price: 60}], variants: VARIANTS_STAPLES },
  { id: '2', name: 'Basmati rice', price: 110, emoji: '🥘', category: 'Staples', brands: [{name: 'India Gate Classic', price: 140}, {name: 'Kohinoor', price: 130}, {name: 'Daawat Rozana', price: 110}], variants: VARIANTS_STAPLES },
  { id: '3', name: 'Brown rice', price: 90, emoji: '🌾', category: 'Staples', brands: [{name: 'India Gate', price: 110}, {name: '24 Mantra Organic', price: 130}], variants: VARIANTS_STAPLES },
  { id: '4', name: 'Flattened rice (poha)', price: 50, emoji: '🍙', category: 'Staples', brands: [{name: 'Tata Sampann', price: 55}, {name: 'Rajdhani', price: 45}], variants: [{ name: '500 g', multiplier: 1 }, { name: '1 kg', multiplier: 1.9 }] },
  { id: '5', name: 'Wheat flour', price: 45, emoji: '🌾', category: 'Staples', brands: [{name: 'Aashirvaad', price: 58}, {name: 'Pillsbury', price: 55}, {name: 'Fortune', price: 48}], variants: VARIANTS_STAPLES },
  { id: '6', name: 'Refined flour', price: 40, emoji: '🧂', category: 'Staples', brands: [{name: 'Rajdhani', price: 40}, {name: 'Naga', price: 42}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '7', name: 'Multigrain flour', price: 65, emoji: '🌾', category: 'Staples', brands: [{name: 'Aashirvaad', price: 72}, {name: 'Pillsbury', price: 68}], variants: VARIANTS_STAPLES },
  { id: '8', name: 'Gram flour', price: 70, emoji: '🫘', category: 'Staples', brands: [{name: 'Tata Sampann', price: 85}, {name: 'Rajdhani', price: 70}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '9', name: 'Rice flour', price: 50, emoji: '🍚', category: 'Staples', brands: [{name: 'Nirapara', price: 55}, {name: 'Double Horse', price: 52}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '10', name: 'Semolina', price: 45, emoji: '🍥', category: 'Staples', brands: [{name: 'MTR', price: 50}, {name: 'Bambino', price: 45}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '11', name: 'Split pigeon peas', price: 140, emoji: '🫘', category: 'Staples', brands: [{name: 'Tata Sampann', price: 165}, {name: 'Organic Tattva', price: 180}, {name: 'Loose', price: 140}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '12', name: 'Red lentils', price: 100, emoji: '🟥', category: 'Staples', brands: [{name: 'Tata Sampann', price: 120}, {name: 'Loose', price: 100}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '13', name: 'Yellow lentils', price: 110, emoji: '🟨', category: 'Staples', brands: [{name: 'Tata Sampann', price: 130}, {name: 'Loose', price: 110}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '14', name: 'Black gram', price: 130, emoji: '⚫', category: 'Staples', brands: [{name: 'Tata Sampann', price: 155}, {name: 'Loose', price: 130}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '15', name: 'Green gram', price: 120, emoji: '🟩', category: 'Staples', brands: [{name: 'Tata Sampann', price: 145}, {name: 'Loose', price: 120}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '16', name: 'Chickpeas', price: 110, emoji: '🧆', category: 'Staples', brands: [{name: 'Tata Sampann', price: 135}, {name: 'Loose', price: 110}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '17', name: 'Black chickpeas', price: 95, emoji: '🖤', category: 'Staples', brands: [{name: 'Tata Sampann', price: 110}, {name: 'Loose', price: 95}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '18', name: 'Kidney beans', price: 125, emoji: '🫘', category: 'Staples', brands: [{name: 'Tata Sampann', price: 150}, {name: 'Loose', price: 125}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '19', name: 'White beans', price: 130, emoji: '🤍', category: 'Staples', variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '20', name: 'Soybeans', price: 90, emoji: '🫘', category: 'Staples', brands: [{name: 'Nutrela', price: 110}, {name: 'Loose', price: 90}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },

  // --- 21–40: Oils, Spices & Seasonings ---
  { id: '21', name: 'Cooking oil', price: 150, emoji: '🛢️', category: 'Oils & Spices', brands: [{name: 'Fortune Refined', price: 155}, {name: 'Gold Drop', price: 150}, {name: 'Freedom', price: 160}], variants: VARIANTS_OILS },
  { id: '22', name: 'Sunflower oil', price: 160, emoji: '🌻', category: 'Oils & Spices', brands: [{name: 'Sunpure', price: 160}, {name: 'Fortune', price: 165}, {name: 'Gold Winner', price: 158}], variants: VARIANTS_OILS },
  { id: '23', name: 'Mustard oil', price: 180, emoji: '🌼', category: 'Oils & Spices', brands: [{name: 'Dhara', price: 185}, {name: 'Fortune', price: 180}], variants: VARIANTS_OILS },
  { id: '24', name: 'Olive oil', price: 500, emoji: '🫒', category: 'Oils & Spices', brands: [{name: 'Figaro', price: 650}, {name: 'Borges', price: 580}, {name: 'Del Monte', price: 550}], variants: [{ name: '500 ml', multiplier: 0.55 }, { name: '1 L', multiplier: 1 }] },
  { id: '25', name: 'Ghee', price: 600, emoji: '🧈', category: 'Oils & Spices', brands: [{name: 'Nandini', price: 610}, {name: 'Amul', price: 630}, {name: 'GRB', price: 650}], variants: [{ name: '200 ml', multiplier: 0.25 }, { name: '500 ml', multiplier: 0.55 }, { name: '1 L', multiplier: 1 }] },
  { id: '26', name: 'Salt', price: 25, emoji: '🧂', category: 'Oils & Spices', brands: [{name: 'Tata Salt', price: 28}, {name: 'Aashirvaad', price: 25}], variants: [{ name: '1 kg', multiplier: 1 }] },
  { id: '27', name: 'Iodized salt', price: 30, emoji: '🧊', category: 'Oils & Spices', brands: [{name: 'Tata Salt Lite', price: 40}, {name: 'Tata Salt', price: 30}], variants: [{ name: '1 kg', multiplier: 1 }] },
  { id: '28', name: 'Sugar', price: 45, emoji: '🍬', category: 'Oils & Spices', brands: [{name: 'Madhur', price: 55}, {name: 'Loose', price: 45}], variants: [{ name: '1 kg', multiplier: 1 }, { name: '5 kg', multiplier: 4.8 }] },
  { id: '29', name: 'Brown sugar', price: 95, emoji: '🟫', category: 'Oils & Spices', brands: [{name: 'Parry', price: 105}, {name: 'Organic Tattva', price: 120}], variants: [{ name: '500 g', multiplier: 0.55 }, { name: '1 kg', multiplier: 1 }] },
  { id: '30', name: 'Jaggery cube', price: 60, emoji: '🍯', category: 'Oils & Spices', brands: [{name: '24 Mantra', price: 85}, {name: 'Loose', price: 60}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '31', name: 'Turmeric powder', price: 40, emoji: '🟧', category: 'Oils & Spices', brands: [{name: 'Everest', price: 45}, {name: 'MTR', price: 42}, {name: 'Aashirvaad', price: 40}], variants: [{ name: '100 g', multiplier: 1 }, { name: '200 g', multiplier: 1.9 }] },
  { id: '32', name: 'Red chili powder', price: 50, emoji: '🌶️', category: 'Oils & Spices', brands: [{name: 'Everest', price: 60}, {name: 'MTR', price: 55}, {name: 'Aashirvaad', price: 50}], variants: [{ name: '100 g', multiplier: 1 }, { name: '200 g', multiplier: 1.9 }] },
  { id: '33', name: 'Coriander powder', price: 40, emoji: '🌿', category: 'Oils & Spices', brands: [{name: 'Everest', price: 45}, {name: 'MTR', price: 42}], variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '34', name: 'Cumin seeds', price: 70, emoji: '🌱', category: 'Oils & Spices', variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '35', name: 'Mustard seeds', price: 35, emoji: '🟤', category: 'Oils & Spices', variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '36', name: 'Fenugreek seeds', price: 40, emoji: '🌾', category: 'Oils & Spices', variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '37', name: 'Black pepper', price: 90, emoji: '🧂', category: 'Oils & Spices', variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '38', name: 'Mixed spice blend', price: 80, emoji: '🧂🌶️', category: 'Oils & Spices', brands: [{name: 'Everest Garam Masala', price: 85}, {name: 'MTR Sambar Powder', price: 75}], variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '39', name: 'Curry seasoning', price: 60, emoji: '🍛', category: 'Oils & Spices', brands: [{name: 'Kitchen King', price: 65}, {name: 'Chicken Masala', price: 60}], variants: [{ name: '100 g', multiplier: 1 }] },
  { id: '40', name: 'Bay leaves', price: 30, emoji: '🍃', category: 'Oils & Spices', variants: [{ name: '50 g', multiplier: 1 }] },

  // --- 41–60: Dairy & Breakfast Essentials ---
  { id: '41', name: 'Milk', price: 34, emoji: '🥛', category: 'Dairy & Breakfast', brands: [{name: 'Nandini Blue', price: 44}, {name: 'Amul Taaza', price: 54}, {name: 'Akshayakalpa', price: 85}], variants: VARIANTS_DAIRY },
  { id: '42', name: 'Yogurt', price: 40, emoji: '🍶', category: 'Dairy & Breakfast', brands: [{name: 'Nandini Curd', price: 40}, {name: 'Milky Mist', price: 55}, {name: 'Amul Masti', price: 50}], variants: [{ name: '500 g', multiplier: 1 }, { name: '1 kg', multiplier: 1.9 }] },
  { id: '43', name: 'Butter', price: 60, emoji: '🧈', category: 'Dairy & Breakfast', brands: [{name: 'Amul Butter', price: 60}, {name: 'Nandini Butter', price: 58}, {name: 'President', price: 90}], variants: [{ name: '100 g', multiplier: 1 }, { name: '500 g', multiplier: 4.8 }] },
  { id: '44', name: 'Clarified butter (ghee)', price: 620, emoji: '🧈', category: 'Dairy & Breakfast', brands: [{name: 'Nandini', price: 610}, {name: 'Amul', price: 630}], variants: [{ name: '200 ml', multiplier: 0.25 }, { name: '500 ml', multiplier: 0.55 }, { name: '1 L', multiplier: 1 }] },
  { id: '45', name: 'Cheese', price: 130, emoji: '🧀', category: 'Dairy & Breakfast', brands: [{name: 'Amul Cubes', price: 130}, {name: 'Britannia', price: 140}, {name: 'Go Cheese', price: 150}], variants: [{ name: '200 g', multiplier: 1 }] },
  { id: '46', name: 'Cottage cheese', price: 100, emoji: '🧊', category: 'Dairy & Breakfast', brands: [{name: 'Nandini Paneer', price: 110}, {name: 'Milky Mist', price: 125}, {name: 'Amul', price: 120}], variants: [{ name: '200 g', multiplier: 1 }] },
  { id: '47', name: 'Eggs', price: 50, emoji: '🥚', category: 'Dairy & Breakfast', brands: [{name: 'Suguna', price: 55}, {name: 'Farm Fresh', price: 50}, {name: 'Licious', price: 65}], variants: [{ name: '6 pcs', multiplier: 1 }, { name: '12 pcs', multiplier: 1.9 }, { name: '30 pcs', multiplier: 4.5 }] },
  { id: '48', name: 'Bread', price: 45, emoji: '🍞', category: 'Dairy & Breakfast', brands: [{name: 'Modern', price: 45}, {name: 'Britannia', price: 50}] },
  { id: '49', name: 'Brown bread', price: 55, emoji: '🍞', category: 'Dairy & Breakfast', brands: [{name: 'Modern', price: 55}, {name: 'Britannia', price: 60}] },
  { id: '50', name: 'Multigrain bread', price: 65, emoji: '🥖', category: 'Dairy & Breakfast', brands: [{name: 'Modern', price: 65}, {name: 'Britannia', price: 70}] },
  { id: '51', name: 'Oats', price: 95, emoji: '🥣', category: 'Dairy & Breakfast', brands: [{name: 'Quaker', price: 95}, {name: 'Saffola', price: 90}, {name: 'Kelloggs', price: 110}], variants: [{ name: '500 g', multiplier: 1 }, { name: '1 kg', multiplier: 1.9 }] },
  { id: '52', name: 'Cornflakes', price: 150, emoji: '🌽', category: 'Dairy & Breakfast', brands: [{name: 'Kelloggs', price: 150}, {name: 'Kwality', price: 130}], variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '53', name: 'Muesli', price: 220, emoji: '🥄', category: 'Dairy & Breakfast', brands: [{name: 'Kelloggs', price: 220}, {name: 'Yoga Bar', price: 250}], variants: [{ name: '400 g', multiplier: 1 }] },
  { id: '54', name: 'Peanut butter', price: 170, emoji: '🥜', category: 'Dairy & Breakfast', brands: [{name: 'Sundrop', price: 170}, {name: 'Pintola', price: 180}, {name: 'MyFitness', price: 200}], variants: [{ name: '350 g', multiplier: 1 }, { name: '1 kg', multiplier: 2.5 }] },
  { id: '55', name: 'Jam', price: 120, emoji: '🍓', category: 'Dairy & Breakfast', brands: [{name: 'Kissan', price: 120}, {name: 'Mapro', price: 150}], variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '56', name: 'Honey', price: 200, emoji: '🍯', category: 'Dairy & Breakfast', brands: [{name: 'Dabur', price: 200}, {name: 'Saffola', price: 220}, {name: 'Lion', price: 210}], variants: [{ name: '500 g', multiplier: 1 }, { name: '1 kg', multiplier: 1.9 }] },
  { id: '57', name: 'Tea', price: 140, emoji: '🍵', category: 'Dairy & Breakfast', brands: [{name: 'Red Label', price: 140}, {name: 'Tata Tea Gold', price: 160}, {name: 'Taj Mahal', price: 200}], variants: [{ name: '250 g', multiplier: 1 }, { name: '500 g', multiplier: 1.9 }] },
  { id: '58', name: 'Coffee', price: 260, emoji: '☕', category: 'Dairy & Breakfast', brands: [{name: 'Bru Instant', price: 260}, {name: 'Nescafe Classic', price: 280}, {name: 'Cothas', price: 150}], variants: [{ name: '100 g', multiplier: 1 }, { name: '200 g', multiplier: 1.9 }] },
  { id: '59', name: 'Hot chocolate', price: 230, emoji: '🍫', category: 'Dairy & Breakfast', brands: [{name: 'Cadbury', price: 230}, {name: 'Hersheys', price: 250}] },
  { id: '60', name: 'Tea bags', price: 150, emoji: '🫖', category: 'Dairy & Breakfast', brands: [{name: 'Lipton Green', price: 150}, {name: 'Tetley', price: 160}], variants: [{ name: '25 bags', multiplier: 1 }] },

  // --- 61–80: Vegetables & Fruits ---
  { id: '61', name: 'Potatoes', price: 35, emoji: '🥔', category: 'Veg & Fruits', variants: [{ name: '1 kg', multiplier: 1 }, { name: '2 kg', multiplier: 2 }] },
  { id: '62', name: 'Onions', price: 40, emoji: '🧅', category: 'Veg & Fruits', variants: [{ name: '1 kg', multiplier: 1 }, { name: '2 kg', multiplier: 2 }] },
  { id: '63', name: 'Tomatoes', price: 50, emoji: '🍅', category: 'Veg & Fruits', variants: [{ name: '1 kg', multiplier: 1 }, { name: '2 kg', multiplier: 2 }] },
  { id: '64', name: 'Ginger', price: 30, emoji: '🫚', category: 'Veg & Fruits', variants: [{ name: '100 g', multiplier: 1 }, { name: '250 g', multiplier: 2.2 }] },
  { id: '65', name: 'Garlic', price: 40, emoji: '🧄', category: 'Veg & Fruits', variants: [{ name: '100 g', multiplier: 1 }, { name: '250 g', multiplier: 2.2 }] },
  { id: '66', name: 'Green chilies', price: 20, emoji: '🌶️', category: 'Veg & Fruits', variants: [{ name: '100 g', multiplier: 1 }, { name: '250 g', multiplier: 2.2 }] },
  { id: '67', name: 'Spinach', price: 25, emoji: '🥬', category: 'Veg & Fruits', variants: [{ name: '1 Bunch', multiplier: 1 }] },
  { id: '68', name: 'Coriander leaves', price: 20, emoji: '🌿', category: 'Veg & Fruits', variants: [{ name: '1 Bunch', multiplier: 1 }] },
  { id: '69', name: 'Mint leaves', price: 20, emoji: '🌱', category: 'Veg & Fruits', variants: [{ name: '1 Bunch', multiplier: 1 }] },
  { id: '70', name: 'Cabbage', price: 40, emoji: '🥬', category: 'Veg & Fruits', variants: [{ name: '1 pc', multiplier: 1 }] },
  { id: '71', name: 'Cauliflower', price: 50, emoji: '🥦', category: 'Veg & Fruits', variants: [{ name: '1 pc', multiplier: 1 }] },
  { id: '72', name: 'Bell peppers', price: 70, emoji: '🫑', category: 'Veg & Fruits', variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '73', name: 'Carrots', price: 50, emoji: '🥕', category: 'Veg & Fruits', brands: [{name: 'Ooty Carrots', price: 65}, {name: 'Local', price: 50}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '74', name: 'Beetroot', price: 45, emoji: '🪻', category: 'Veg & Fruits', variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '75', name: 'Cucumbers', price: 35, emoji: '🥒', category: 'Veg & Fruits', brands: [{name: 'English Cucumber', price: 50}, {name: 'Local', price: 35}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '76', name: 'Lemon', price: 15, emoji: '🍋', category: 'Veg & Fruits', variants: [{ name: '3 pcs', multiplier: 1 }, { name: '6 pcs', multiplier: 1.8 }] },
  { id: '77', name: 'Apples', price: 160, emoji: '🍎', category: 'Veg & Fruits', brands: [{name: 'Washington', price: 220}, {name: 'Shimla', price: 160}, {name: 'Royal Gala', price: 240}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '78', name: 'Bananas', price: 60, emoji: '🍌', category: 'Veg & Fruits', brands: [{name: 'Yelakki', price: 70}, {name: 'Robusta', price: 60}, {name: 'Nendra', price: 80}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '79', name: 'Grapes', price: 90, emoji: '🍇', category: 'Veg & Fruits', brands: [{name: 'Black Seedless', price: 110}, {name: 'Green Seedless', price: 90}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },
  { id: '80', name: 'Oranges', price: 85, emoji: '🍊', category: 'Veg & Fruits', brands: [{name: 'Nagpur', price: 85}, {name: 'Imported', price: 120}], variants: [{ name: '500 g', multiplier: 0.5 }, { name: '1 kg', multiplier: 1 }] },

  // --- 81–100: Snacks, Beverages & Packaged Foods ---
  { id: '81', name: 'Chips', price: 20, emoji: '🍟', category: 'Snacks & Drinks', brands: [{name: 'Lays Classic', price: 20}, {name: 'Bingo Mad Angles', price: 20}, {name: 'Pringles', price: 110}], variants: VARIANTS_SNACKS },
  { id: '82', name: 'Nachos', price: 70, emoji: '🫓', category: 'Snacks & Drinks', brands: [{name: 'Doritos', price: 70}, {name: 'Cornitos', price: 85}], variants: VARIANTS_SNACKS },
  { id: '83', name: 'Popcorn', price: 50, emoji: '🍿', category: 'Snacks & Drinks', brands: [{name: 'Act II', price: 35}, {name: '4700BC', price: 60}], variants: VARIANTS_SNACKS },
  { id: '84', name: 'Cookies', price: 45, emoji: '🍪', category: 'Snacks & Drinks', brands: [{name: 'Unibic', price: 55}, {name: 'Good Day', price: 45}, {name: 'Dark Fantasy', price: 60}], variants: VARIANTS_SNACKS },
  { id: '85', name: 'Crackers', price: 40, emoji: '🧇', category: 'Snacks & Drinks', brands: [{name: 'Monaco', price: 30}, {name: 'Nutrichoice', price: 45}], variants: VARIANTS_SNACKS },
  { id: '86', name: 'Biscuits', price: 30, emoji: '🍪', category: 'Snacks & Drinks', brands: [{name: 'Parle-G', price: 10}, {name: 'Marie Gold', price: 30}, {name: 'Oreo', price: 40}], variants: VARIANTS_SNACKS },
  { id: '87', name: 'Instant noodles', price: 25, emoji: '🍜', category: 'Snacks & Drinks', brands: [{name: 'Maggi', price: 28}, {name: 'Yippee', price: 25}, {name: 'Top Ramen', price: 25}], variants: [{ name: 'Single', multiplier: 1 }, { name: '4 Pack', multiplier: 3.8 }] },
  { id: '88', name: 'Pasta', price: 60, emoji: '🍝', category: 'Snacks & Drinks', brands: [{name: 'Bambino', price: 50}, {name: 'Disano', price: 80}], variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '89', name: 'Vermicelli', price: 35, emoji: '🍝', category: 'Snacks & Drinks', brands: [{name: 'MTR', price: 40}, {name: 'Bambino', price: 35}], variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '90', name: 'Ready-to-eat meals', price: 130, emoji: '🍱', category: 'Snacks & Drinks', brands: [{name: 'MTR', price: 130}, {name: 'Tata Q', price: 140}] },
  { id: '91', name: 'Frozen peas', price: 90, emoji: '🟢❄️', category: 'Snacks & Drinks', brands: [{name: 'Safa', price: 90}, {name: 'McCain', price: 110}], variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '92', name: 'Frozen corn', price: 100, emoji: '🌽❄️', category: 'Snacks & Drinks', brands: [{name: 'Safa', price: 100}, {name: 'McCain', price: 120}], variants: [{ name: '500 g', multiplier: 1 }] },
  { id: '93', name: 'Fruit juice', price: 110, emoji: '🧃', category: 'Snacks & Drinks', brands: [{name: 'Real', price: 110}, {name: 'Tropicana', price: 120}, {name: 'B Natural', price: 115}], variants: [{ name: '1 L', multiplier: 1 }] },
  { id: '94', name: 'Soft drinks', price: 50, emoji: '🥤', category: 'Snacks & Drinks', brands: [{name: 'Coca Cola', price: 50}, {name: 'Pepsi', price: 50}, {name: 'Sprite', price: 50}, {name: 'Thums Up', price: 50}], variants: [{ name: '750 ml', multiplier: 1 }, { name: '2 L', multiplier: 2.2 }] },
  { id: '95', name: 'Energy drink', price: 120, emoji: '⚡🥤', category: 'Snacks & Drinks', brands: [{name: 'Red Bull', price: 125}, {name: 'Monster', price: 120}, {name: 'Sting', price: 20}], variants: [{ name: '250 ml', multiplier: 1 }] },
  { id: '96', name: 'Coconut water', price: 60, emoji: '🥥', category: 'Snacks & Drinks', brands: [{name: 'Raw Pressery', price: 70}, {name: 'Paper Boat', price: 60}], variants: [{ name: '200 ml', multiplier: 1 }] },
  { id: '97', name: 'Buttermilk', price: 25, emoji: '🥛', category: 'Snacks & Drinks', brands: [{name: 'Amul', price: 25}, {name: 'Nandini', price: 20}, {name: 'Mother Dairy', price: 25}], variants: [{ name: '200 ml', multiplier: 1 }] },
  { id: '98', name: 'Chocolate bar', price: 50, emoji: '🍫', category: 'Snacks & Drinks', brands: [{name: 'Dairy Milk', price: 50}, {name: 'KitKat', price: 40}, {name: 'Snickers', price: 50}, {name: 'Amul Dark', price: 120}], variants: VARIANTS_SNACKS },
  { id: '99', name: 'Ice cream', price: 70, emoji: '🍨', category: 'Snacks & Drinks', brands: [{name: 'Amul Tub', price: 250}, {name: 'Kwality Wall\'s', price: 280}, {name: 'Corner House (Local)', price: 350}, {name: 'Cup', price: 50}] },
  { id: '100', name: 'Snack mixture', price: 50, emoji: '🍲', category: 'Snacks & Drinks', brands: [{name: 'Haldiram', price: 55}, {name: 'Bikaji', price: 50}], variants: VARIANTS_SNACKS },

  // --- 101-115: Personal Care ---
  { id: '101', name: 'Bathing Soap', price: 45, emoji: '🧼', category: 'Personal Care', brands: [{name: 'Dove', price: 65}, {name: 'Lux', price: 45}, {name: 'Lifebuoy', price: 35}], variants: [{ name: 'Single', multiplier: 1 }, { name: 'Pack of 3', multiplier: 2.8 }] },
  { id: '102', name: 'Shampoo', price: 180, emoji: '🧴', category: 'Personal Care', brands: [{name: 'Dove', price: 220}, {name: 'Sunsilk', price: 180}, {name: 'Clinic Plus', price: 120}], variants: [{ name: '180 ml', multiplier: 1 }, { name: '340 ml', multiplier: 1.8 }] },
  { id: '103', name: 'Conditioner', price: 190, emoji: '🛁', category: 'Personal Care', brands: [{name: 'Dove', price: 230}, {name: 'Loreal', price: 250}], variants: [{ name: '180 ml', multiplier: 1 }] },
  { id: '104', name: 'Face Wash', price: 120, emoji: '🧖', category: 'Personal Care', brands: [{name: 'Himalaya', price: 130}, {name: 'Clean & Clear', price: 150}], variants: [{ name: '100 ml', multiplier: 1 }, { name: '150 ml', multiplier: 1.4 }] },
  { id: '105', name: 'Toothpaste', price: 85, emoji: '🦷', category: 'Personal Care', brands: [{name: 'Colgate', price: 90}, {name: 'Pepsodent', price: 80}, {name: 'Sensodyne', price: 150}], variants: [{ name: '150 g', multiplier: 1 }, { name: '300 g', multiplier: 1.9 }] },
  { id: '106', name: 'Toothbrush', price: 40, emoji: '🪥', category: 'Personal Care', brands: [{name: 'Oral-B', price: 50}, {name: 'Colgate', price: 30}] },
  { id: '107', name: 'Body Lotion', price: 250, emoji: '🧴', category: 'Personal Care', brands: [{name: 'Nivea', price: 280}, {name: 'Vaseline', price: 250}], variants: [{ name: '200 ml', multiplier: 1 }, { name: '400 ml', multiplier: 1.8 }] },
  { id: '108', name: 'Deodorant', price: 199, emoji: '🌬️', category: 'Personal Care', brands: [{name: 'Fogg', price: 199}, {name: 'Axe', price: 210}, {name: 'Nivea', price: 200}], variants: [{ name: '150 ml', multiplier: 1 }] },
  { id: '109', name: 'Shaving Foam', price: 180, emoji: '🪒', category: 'Personal Care', brands: [{name: 'Gillette', price: 180}, {name: 'Old Spice', price: 190}] },
  { id: '110', name: 'Sanitary Pads', price: 150, emoji: '🌸', category: 'Personal Care', brands: [{name: 'Whisper', price: 180}, {name: 'Stayfree', price: 150}], variants: [{ name: '8 pads', multiplier: 1 }, { name: '16 pads', multiplier: 1.8 }] },
  
  // --- 116-125: Household Essentials ---
  { id: '116', name: 'Detergent Powder', price: 110, emoji: '🧺', category: 'Household', brands: [{name: 'Surf Excel', price: 140}, {name: 'Ariel', price: 150}, {name: 'Tide', price: 110}], variants: VARIANTS_STAPLES },
  { id: '117', name: 'Dishwash Bar', price: 20, emoji: '🍽️', category: 'Household', brands: [{name: 'Vim', price: 25}, {name: 'Exo', price: 20}], variants: [{ name: 'Single', multiplier: 1 }, { name: 'Pack of 4', multiplier: 3.8 }] },
  { id: '118', name: 'Liquid Detergent', price: 220, emoji: '🧴', category: 'Household', brands: [{name: 'Surf Excel Matic', price: 240}, {name: 'Ariel Matic', price: 250}], variants: [{ name: '1 L', multiplier: 1 }, { name: '2 L', multiplier: 1.9 }] },
  { id: '119', name: 'Toilet Cleaner', price: 90, emoji: '🚽', category: 'Household', brands: [{name: 'Harpic', price: 95}, {name: 'Domex', price: 85}], variants: [{ name: '500 ml', multiplier: 1 }, { name: '1 L', multiplier: 1.9 }] },
  { id: '120', name: 'Floor Cleaner', price: 100, emoji: '🧹', category: 'Household', brands: [{name: 'Lizol', price: 110}, {name: 'Domex', price: 95}], variants: [{ name: '500 ml', multiplier: 1 }, { name: '1 L', multiplier: 1.9 }] },
  { id: '121', name: 'Mosquito Repellent', price: 80, emoji: '🦟', category: 'Household', brands: [{name: 'Good Knight', price: 85}, {name: 'All Out', price: 80}], variants: [{ name: 'Refill', multiplier: 1 }, { name: 'Machine + Refill', multiplier: 2 }] },
  { id: '122', name: 'Garbage Bags', price: 120, emoji: '🗑️', category: 'Household', brands: [{name: 'Shalimar', price: 120}, {name: 'Oxo', price: 130}], variants: [{ name: 'Small (30 bags)', multiplier: 1 }, { name: 'Medium (15 bags)', multiplier: 1.2 }] },

  // --- 126-130: Pet Care ---
  { id: '126', name: 'Dog Food', price: 400, emoji: '🐕', category: 'Pet Care', brands: [{name: 'Pedigree', price: 450}, {name: 'Royal Canin', price: 800}], variants: [{ name: '1 kg', multiplier: 1 }, { name: '3 kg', multiplier: 2.8 }] },
  { id: '127', name: 'Cat Food', price: 350, emoji: '🐈', category: 'Pet Care', brands: [{name: 'Whiskas', price: 380}, {name: 'Me-O', price: 350}], variants: [{ name: '1 kg', multiplier: 1 }, { name: '3 kg', multiplier: 2.8 }] },
  { id: '128', name: 'Pet Biscuits', price: 150, emoji: '🦴', category: 'Pet Care', brands: [{name: 'Pedigree', price: 150}, {name: 'Drools', price: 140}] },
];

// Helper to get ranges
const range = (start: number, end: number) => Array.from({length: end - start + 1}, (_, i) => String(start + i));

export const DAIRY_IDS = range(41, 60);
export const PRODUCE_IDS = range(61, 80);
export const GENERAL_IDS = [
  ...range(1, 40),   // Staples + Oils
  ...range(81, 100), // Snacks
  ...range(101, 122), // Personal & Household
  ...range(126, 128), // Pet Care
  ...['41', '42', '47', '48'], // Basic Dairy
  ...['61', '62', '63', '66', '76'] // Basic Veg
];

// Comprehensive Bengaluru Stores List
export const MOCK_STORES: Store[] = [
  // --- Indiranagar (East) ---
  { id: 'blr-ind-1', name: "Nandini Milk Parlour", address: "CMH Road, Indiranagar", rating: 4.8, distance: "0.2 km", lat: 12.9784, lng: 77.6408, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-ind-2', name: "MK Ahmed Bazaar", address: "12th Main, Indiranagar", rating: 4.5, distance: "0.5 km", lat: 12.9700, lng: 77.6380, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-ind-3', name: "Hopcoms Fresh", address: "Double Road, Indiranagar", rating: 4.6, distance: "0.7 km", lat: 12.9740, lng: 77.6450, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-ind-4', name: "Shri Krishna Provisions", address: "100ft Road, Indiranagar", rating: 4.2, distance: "0.4 km", lat: 12.9650, lng: 77.6410, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-ind-5', name: "Daily Needs Mart", address: "Domlur Flyover", rating: 4.0, distance: "1.2 km", lat: 12.9610, lng: 77.6380, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- Koramangala (South East) ---
  { id: 'blr-kora-1', name: "A One Provision Store", address: "5th Block, Koramangala", rating: 4.3, distance: "0.8 km", lat: 12.9352, lng: 77.6245, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-kora-2', name: "Nandini Booth", address: "Near BDA Complex, Koramangala", rating: 4.7, distance: "1.1 km", lat: 12.9340, lng: 77.6100, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-kora-3', name: "Koramangala Veg Market", address: "8th Block, Koramangala", rating: 4.5, distance: "1.0 km", lat: 12.9400, lng: 77.6200, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-kora-4', name: "Devi Super Mart", address: "1st Block, Koramangala", rating: 4.1, distance: "1.5 km", lat: 12.9280, lng: 77.6300, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-kora-5', name: "Green Farm Fresh", address: "6th Block, Koramangala", rating: 4.4, distance: "1.3 km", lat: 12.9380, lng: 77.6300, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },

  // --- HSR Layout (South East) ---
  { id: 'blr-hsr-1', name: "HSR Local Mart", address: "27th Main, HSR Layout", rating: 4.4, distance: "2.5 km", lat: 12.9121, lng: 77.6446, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-hsr-2', name: "Agara Lake Veggies", address: "Sector 1, HSR Layout", rating: 4.3, distance: "2.8 km", lat: 12.9200, lng: 77.6480, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-hsr-3', name: "Nandini HSR", address: "Sector 2, HSR Layout", rating: 4.6, distance: "3.0 km", lat: 12.9150, lng: 77.6500, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-hsr-4', name: "Sri Balaji Stores", address: "Sector 7, HSR Layout", rating: 4.2, distance: "3.5 km", lat: 12.9080, lng: 77.6400, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- Jayanagar & JP Nagar (South) ---
  { id: 'blr-jay-1', name: "SLV Provision Store", address: "4th Block, Jayanagar", rating: 4.6, distance: "3.2 km", lat: 12.9250, lng: 77.5938, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-jay-2', name: "Jayanagar Veg Market", address: "9th Block, Jayanagar", rating: 4.5, distance: "3.8 km", lat: 12.9180, lng: 77.5900, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-jp-1', name: "Sri Venkateshwara Stores", address: "JP Nagar 2nd Phase", rating: 4.2, distance: "4.5 km", lat: 12.9100, lng: 77.5850, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-jp-2', name: "Mini Forest Mart", address: "JP Nagar 3rd Phase", rating: 4.1, distance: "4.8 km", lat: 12.9050, lng: 77.5950, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-basa-1', name: "Nandini Dairy Booth", address: "Near Basavanagudi Park", rating: 4.9, distance: "4.0 km", lat: 12.9421, lng: 77.5750, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-basa-2', name: "Gandhi Bazaar Produce", address: "Gandhi Bazaar Main Rd", rating: 4.8, distance: "4.2 km", lat: 12.9450, lng: 77.5700, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },

  // --- Malleshwaram & Rajajinagar (North/West) ---
  { id: 'blr-mall-1', name: "Sampige Provision", address: "Sampige Road, Malleshwaram", rating: 4.4, distance: "5.5 km", lat: 13.0031, lng: 77.5643, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-mall-2', name: "Malleshwaram Market", address: "8th Cross, Malleshwaram", rating: 4.7, distance: "5.6 km", lat: 13.0050, lng: 77.5700, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-mall-3', name: "CTR General Store", address: "Margosa Road, Malleshwaram", rating: 4.3, distance: "5.8 km", lat: 13.0000, lng: 77.5680, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-raja-1', name: "Rajajinagar 1st Block Mart", address: "Rajajinagar Entrance", rating: 4.2, distance: "6.0 km", lat: 12.9900, lng: 77.5550, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-raja-2', name: "Navrang Dairy", address: "Near Navrang Theatre", rating: 4.5, distance: "6.2 km", lat: 12.9950, lng: 77.5500, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },

  // --- Whitefield & Marathahalli (East) ---
  { id: 'blr-wfd-1', name: "Whitefield Organics", address: "Whitefield Main Road", rating: 4.6, distance: "12 km", lat: 12.9698, lng: 77.7500, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-wfd-2', name: "ITPL Road Dairy", address: "Near ITPL, Whitefield", rating: 4.3, distance: "12.5 km", lat: 12.9850, lng: 77.7300, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-wfd-3', name: "Varthur Provisions", address: "Varthur Kodi", rating: 4.0, distance: "13 km", lat: 12.9600, lng: 77.7400, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-mar-1', name: "Marathahalli Bridge Mart", address: "Outer Ring Road", rating: 4.1, distance: "10 km", lat: 12.9550, lng: 77.7000, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-mar-2', name: "Spice Garden Store", address: "Marathahalli", rating: 4.2, distance: "10.5 km", lat: 12.9580, lng: 77.7050, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- CBD & Central ---
  { id: 'blr-cbd-1', name: "Shivaji Nagar Market", address: "Shivaji Nagar", rating: 4.2, distance: "3.0 km", lat: 12.9857, lng: 77.6057, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-cbd-2', name: "MG Road Super Mart", address: "Church Street", rating: 4.4, distance: "2.8 km", lat: 12.9750, lng: 77.6080, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-cbd-3', name: "Richmond Circle Dairy", address: "Richmond Road", rating: 4.5, distance: "2.5 km", lat: 12.9650, lng: 77.6000, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-cbd-4', name: "Brigade Road Convenience", address: "Brigade Road", rating: 4.3, distance: "2.9 km", lat: 12.9700, lng: 77.6050, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- Electronic City (South) ---
  { id: 'blr-ecity-1', name: "E-City Provisions", address: "Neeladri Road, Electronic City", rating: 4.1, distance: "15 km", lat: 12.8450, lng: 77.6600, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-ecity-2', name: "Nandini E-City", address: "Phase 1, Electronic City", rating: 4.5, distance: "15.2 km", lat: 12.8500, lng: 77.6650, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-ecity-3', name: "Velankani Drive Mart", address: "Phase 2, Electronic City", rating: 4.2, distance: "16 km", lat: 12.8400, lng: 77.6700, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- BTM Layout ---
  { id: 'blr-btm-1', name: "BTM Lake Store", address: "Near BTM Lake", rating: 4.3, distance: "5.0 km", lat: 12.9150, lng: 77.6100, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-btm-2', name: "Udupi Garden Mart", address: "BTM 2nd Stage", rating: 4.4, distance: "5.2 km", lat: 12.9120, lng: 77.6080, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- Banaswadi & Kammanahalli ---
  { id: 'blr-kamm-1', name: "Kammanahalli Fresh", address: "Main Road, Kammanahalli", rating: 4.5, distance: "7.0 km", lat: 13.0100, lng: 77.6400, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-banas-1', name: "Banaswadi Provisions", address: "Outer Ring Road", rating: 4.0, distance: "7.5 km", lat: 13.0150, lng: 77.6500, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- North Bengaluru (Hebbal, Yelahanka) ---
  { id: 'blr-heb-1', name: "Hebbal Farm Fresh", address: "Hebbal Flyover Service Rd", rating: 4.4, distance: "8.0 km", lat: 13.0350, lng: 77.5900, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-heb-2', name: "Esteem Mall Dairy", address: "Near Esteem Mall", rating: 4.2, distance: "8.2 km", lat: 13.0400, lng: 77.5850, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },
  { id: 'blr-yel-1', name: "Yelahanka New Town Market", address: "4th Phase, Yelahanka", rating: 4.5, distance: "14.0 km", lat: 13.1000, lng: 77.5700, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-yel-2', name: "Kogilu Cross Stores", address: "Kogilu Main Road", rating: 4.1, distance: "15.0 km", lat: 13.1100, lng: 77.6000, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },

  // --- South West (Banashankari, RR Nagar) ---
  { id: 'blr-bsk-1', name: "Banashankari BDA Complex", address: "2nd Stage, Banashankari", rating: 4.6, distance: "6.0 km", lat: 12.9250, lng: 77.5700, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-bsk-2', name: "Kathriguppe Veg Mart", address: "Main Road, Kathriguppe", rating: 4.3, distance: "6.5 km", lat: 12.9300, lng: 77.5500, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
  { id: 'blr-rr-1', name: "RR Nagar Arch Stores", address: "Rajarajeshwari Nagar", rating: 4.4, distance: "9.0 km", lat: 12.9300, lng: 77.5200, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-rr-2', name: "Ideal Homes Dairy", address: "Ideal Homes Township", rating: 4.5, distance: "9.5 km", lat: 12.9200, lng: 77.5100, isOpen: true, type: 'dairy', availableProductIds: DAIRY_IDS },

  // --- West (Vijayanagar, Mysore Road) ---
  { id: 'blr-vij-1', name: "Vijayanagar Club Mart", address: "RPC Layout, Vijayanagar", rating: 4.5, distance: "7.0 km", lat: 12.9600, lng: 77.5300, isOpen: true, type: 'general', availableProductIds: GENERAL_IDS },
  { id: 'blr-mys-1', name: "Mysore Road Satellite Market", address: "Byatarayanapura", rating: 4.0, distance: "8.0 km", lat: 12.9500, lng: 77.5400, isOpen: true, type: 'produce', availableProductIds: PRODUCE_IDS },
];
