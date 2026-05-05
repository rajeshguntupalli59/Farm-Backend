const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding PashuBazaar...')

  // ─── USERS ───────────────────────────────────────────────────────
  const hash = (p) => bcrypt.hashSync(p, 10)

  const owner = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: { name: 'Rajesh Guntupalli', phone: '9876543210', password: hash('owner123'), role: 'OWNER' },
  })
  const manager = await prisma.user.upsert({
    where: { phone: '9876543211' },
    update: {},
    create: { name: 'Venkata Rao', phone: '9876543211', password: hash('manager123'), role: 'MANAGER' },
  })
  const employee = await prisma.user.upsert({
    where: { phone: '9876543212' },
    update: {},
    create: { name: 'Suresh Kumar', phone: '9876543212', password: hash('emp123'), role: 'EMPLOYEE' },
  })
  console.log('✅ Users created')

  // ─── CATEGORIES (parent) ─────────────────────────────────────────
  const catAnimals = await prisma.category.upsert({
    where: { id: 1 }, update: {},
    create: { id: 1, name: 'Animals', nameTelugu: 'పశువులు', emoji: '🐐', sortOrder: 1 },
  })
  const catDairy = await prisma.category.upsert({
    where: { id: 2 }, update: {},
    create: { id: 2, name: 'Dairy', nameTelugu: 'పాల ఉత్పత్తులు', emoji: '🥛', sortOrder: 2 },
  })
  const catEggs = await prisma.category.upsert({
    where: { id: 3 }, update: {},
    create: { id: 3, name: 'Eggs', nameTelugu: 'గుడ్లు', emoji: '🥚', sortOrder: 3 },
  })
  const catVegetables = await prisma.category.upsert({
    where: { id: 4 }, update: {},
    create: { id: 4, name: 'Vegetables', nameTelugu: 'కూరగాయలు', emoji: '🌿', sortOrder: 4 },
  })
  const catMeat = await prisma.category.upsert({
    where: { id: 5 }, update: {},
    create: { id: 5, name: 'Meat', nameTelugu: 'మాంసం', emoji: '🥩', sortOrder: 5 },
  })

  // ─── SUBCATEGORIES ───────────────────────────────────────────────
  const subGoat = await prisma.category.upsert({
    where: { id: 6 }, update: {},
    create: { id: 6, name: 'Goat', nameTelugu: 'మేక', emoji: '🐐', parentId: catAnimals.id, sortOrder: 1 },
  })
  const subSheep = await prisma.category.upsert({
    where: { id: 7 }, update: {},
    create: { id: 7, name: 'Sheep', nameTelugu: 'గొర్రె', emoji: '🐑', parentId: catAnimals.id, sortOrder: 2 },
  })
  const subChicken = await prisma.category.upsert({
    where: { id: 8 }, update: {},
    create: { id: 8, name: 'Chicken', nameTelugu: 'కోడి', emoji: '🐓', parentId: catAnimals.id, sortOrder: 3 },
  })
  const subMilk = await prisma.category.upsert({
    where: { id: 9 }, update: {},
    create: { id: 9, name: 'Milk', nameTelugu: 'పాలు', emoji: '🥛', parentId: catDairy.id, sortOrder: 1 },
  })
  const subGoatMeat = await prisma.category.upsert({
    where: { id: 10 }, update: {},
    create: { id: 10, name: 'Goat Meat', nameTelugu: 'మేక మాంసం', emoji: '🥩', parentId: catMeat.id, sortOrder: 1 },
  })
  console.log('✅ Categories created')

  // ─── PRODUCTS ────────────────────────────────────────────────────
  const products = [
    // Dairy
    { name: 'Fresh Goat Milk', nameTelugu: 'తాజా మేక పాలు', categoryId: subMilk.id, unit: 'litre', price: 80, stock: 50, minStock: 10, description: 'Pure fresh goat milk, collected every morning', isAvailable: true },
    { name: 'Buffalo Milk', nameTelugu: 'గేదె పాలు', categoryId: subMilk.id, unit: 'litre', price: 55, stock: 120, minStock: 20, description: 'Rich creamy buffalo milk', isAvailable: true },
    { name: 'Country Ghee', nameTelugu: 'నాటు నెయ్యి', categoryId: catDairy.id, unit: 'KG', price: 1200, stock: 8, minStock: 2, description: 'Pure hand-churned country ghee', isAvailable: true },
    { name: 'Fresh Curd', nameTelugu: 'పెరుగు', categoryId: catDairy.id, unit: 'KG', price: 60, stock: 30, minStock: 5, description: 'Thick fresh curd made daily', isAvailable: true },
    // Eggs
    { name: 'Country Hen Eggs', nameTelugu: 'నాటు కోడి గుడ్లు', categoryId: catEggs.id, unit: 'dozen', price: 120, stock: 40, minStock: 6, description: 'Farm fresh country hen eggs, rich yolk', isAvailable: true },
    { name: 'Broiler Eggs', nameTelugu: 'బ్రాయిలర్ గుడ్లు', categoryId: catEggs.id, unit: 'dozen', price: 72, stock: 200, minStock: 24, description: 'Fresh broiler eggs', isAvailable: true },
    // Meat
    { name: 'Goat Meat (Bone-in)', nameTelugu: 'మేక మాంసం (ఎముకతో)', categoryId: subGoatMeat.id, unit: 'KG', price: 780, stock: 25, minStock: 5, description: 'Fresh country goat meat with bone', isAvailable: true },
    { name: 'Boneless Goat Meat', nameTelugu: 'మేక మాంసం (ఎముక లేకుండా)', categoryId: subGoatMeat.id, unit: 'KG', price: 950, stock: 12, minStock: 3, description: 'Premium boneless goat meat, cleaned and cut', isAvailable: true },
    { name: 'Country Chicken', nameTelugu: 'నాటు కోడి', categoryId: subChicken.id, unit: 'KG', price: 480, stock: 18, minStock: 4, description: 'Farm raised country chicken', isAvailable: true },
    { name: 'Broiler Chicken', nameTelugu: 'బ్రాయిలర్ కోడి', categoryId: subChicken.id, unit: 'KG', price: 180, stock: 60, minStock: 10, description: 'Fresh broiler chicken', isAvailable: true },
    // Vegetables
    { name: 'Tomatoes', nameTelugu: 'టమాటాలు', categoryId: catVegetables.id, unit: 'KG', price: 40, stock: 80, minStock: 10, description: 'Farm fresh red tomatoes', isAvailable: true },
    { name: 'Green Chilli', nameTelugu: 'పచ్చి మిరపకాయలు', categoryId: catVegetables.id, unit: 'KG', price: 60, stock: 15, minStock: 3, description: 'Fresh spicy green chillies', isAvailable: true },
    { name: 'Onions', nameTelugu: 'ఉల్లిపాయలు', categoryId: catVegetables.id, unit: 'KG', price: 35, stock: 3, minStock: 10, description: 'Fresh red onions', isAvailable: true }, // intentionally low stock
    { name: 'Drumstick', nameTelugu: 'మునగకాయ', categoryId: catVegetables.id, unit: 'piece', price: 5, stock: 100, minStock: 20, description: 'Fresh tender drumsticks', isAvailable: true },
  ]

  for (const p of products) {
    await prisma.product.create({ data: { ...p, userId: owner.id } })
  }
  console.log('✅ Products created')

  // ─── ANIMALS ─────────────────────────────────────────────────────
  const animals = [
    { name: 'Kali', type: 'GOAT', breed: 'Boer', age: '2 years', weight: 28, price: 15000, description: 'Healthy female Boer goat, vaccinated', status: 'AVAILABLE' },
    { name: 'Raja', type: 'GOAT', breed: 'Osmanabadi', age: '18 months', weight: 22, price: 12000, description: 'Strong male goat, good for breeding', status: 'AVAILABLE' },
    { name: 'Ganga', type: 'GOAT', breed: 'Sirohi', age: '3 years', weight: 35, price: 18000, description: 'High milk yielding female goat', status: 'AVAILABLE' },
    { name: 'Lakshmi', type: 'SHEEP', breed: 'Nellore', age: '2.5 years', weight: 40, price: 14000, description: 'Healthy Nellore sheep, wool-bearing', status: 'AVAILABLE' },
    { name: 'Bheem', type: 'SHEEP', breed: 'Deccani', age: '3 years', weight: 45, price: 16000, description: 'Large Deccani sheep, good meat quality', status: 'AVAILABLE' },
    { name: 'Raju', type: 'GOAT', breed: 'Boer', age: '1 year', weight: 15, price: 8000, description: 'Young male goat', status: 'SOLD' },
    { name: 'Meena', type: 'SHEEP', breed: 'Nellore', age: '4 years', weight: 38, price: 12000, description: 'Old sheep', status: 'DEAD' },
    { name: 'Chitti', type: 'CHICKEN', breed: 'Country', age: '8 months', weight: 2.5, price: 800, description: 'Healthy country hen, laying eggs', status: 'AVAILABLE' },
    { name: 'Babu', type: 'CHICKEN', breed: 'Country', age: '10 months', weight: 3.2, price: 950, description: 'Large country rooster', status: 'AVAILABLE' },
    { name: 'HEN-001', type: 'HEN', breed: 'Aseel', age: '1.5 years', weight: 2.8, price: 1200, description: 'Premium Aseel hen, fighting breed', status: 'AVAILABLE' },
  ]

  for (const a of animals) {
    await prisma.animal.create({ data: { ...a, userId: owner.id } })
  }
  console.log('✅ Animals created')

  // ─── CUSTOMERS ───────────────────────────────────────────────────
  const customers = [
    { name: 'Krishna Murthy', phone: '9000000001', address: 'Flat 12, Ameerpet, Hyderabad' },
    { name: 'Srinivas Reddy', phone: '9000000002', address: 'Plot 45, Kukatpally, Hyderabad' },
    { name: 'Padmavathi', phone: '9000000003', address: 'Door 7, Dilsukhnagar, Hyderabad' },
    { name: 'Ravi Shankar', phone: '9000000004', address: 'Flat 3B, LB Nagar, Hyderabad' },
    { name: 'Anitha Devi', phone: '9000000005', address: 'House 22, Malakpet, Hyderabad' },
    { name: 'Narasimha Rao', phone: '9000000006', address: 'Village Shadnagar, Ranga Reddy' },
    { name: 'Latha Kumari', phone: '9000000007', address: 'Flat 8, Mehdipatnam, Hyderabad' },
  ]

  const createdCustomers = []
  for (const c of customers) {
    const cust = await prisma.customer.upsert({ where: { phone: c.phone }, update: {}, create: c })
    createdCustomers.push(cust)
  }
  console.log('✅ Customers created')

  // ─── ORDERS ──────────────────────────────────────────────────────
  const allProducts = await prisma.product.findMany()
  const getProduct = (name) => allProducts.find(p => p.name === name)

  const orderData = [
    { customer: createdCustomers[0], product: getProduct('Goat Meat (Bone-in)'), quantity: 2, status: 'COMPLETED', paid: true },
    { customer: createdCustomers[1], product: getProduct('Fresh Goat Milk'), quantity: 10, status: 'CONFIRMED', paid: false },
    { customer: createdCustomers[2], product: getProduct('Country Hen Eggs'), quantity: 3, status: 'PENDING', paid: false },
    { customer: createdCustomers[3], product: getProduct('Country Chicken'), quantity: 1.5, status: 'COMPLETED', paid: true },
    { customer: createdCustomers[4], product: getProduct('Country Ghee'), quantity: 2, status: 'PENDING', paid: false },
    { customer: createdCustomers[5], product: getProduct('Boneless Goat Meat'), quantity: 3, status: 'CONFIRMED', paid: true },
    { customer: createdCustomers[6], product: getProduct('Buffalo Milk'), quantity: 20, status: 'COMPLETED', paid: true },
    { customer: createdCustomers[0], product: getProduct('Tomatoes'), quantity: 5, status: 'CANCELLED', paid: false },
    { customer: createdCustomers[1], product: getProduct('Broiler Chicken'), quantity: 4, status: 'PENDING', paid: false },
    { customer: createdCustomers[2], product: getProduct('Fresh Goat Milk'), quantity: 15, status: 'COMPLETED', paid: true },
    { customer: createdCustomers[3], product: getProduct('Country Hen Eggs'), quantity: 5, status: 'CONFIRMED', paid: false },
    { customer: createdCustomers[4], product: getProduct('Goat Meat (Bone-in)'), quantity: 1, status: 'PENDING', paid: false },
  ]

  for (const o of orderData) {
    if (!o.product) continue
    const totalPrice = o.product.price * o.quantity
    await prisma.order.create({
      data: {
        customerId: o.customer.id,
        productId: o.product.id,
        quantity: o.quantity,
        status: o.status,
        totalPrice,
        paidAmount: o.paid ? totalPrice : (o.status === 'CONFIRMED' ? totalPrice * 0.5 : 0),
      },
    })
  }
  console.log('✅ Orders created')

  // ─── INVENTORY ───────────────────────────────────────────────────
  const inventory = [
    { name: 'Goat Feed (Pellets)', category: 'FEED', unit: 'KG', quantity: 150, minQuantity: 30, costPerUnit: 35, supplier: 'Srinivasa Feed Store' },
    { name: 'Chicken Feed (Starter)', category: 'FEED', unit: 'KG', quantity: 80, minQuantity: 20, costPerUnit: 28, supplier: 'Poultry Supply Co.' },
    { name: 'Cattle Feed (Mixed)', category: 'FEED', unit: 'Bag', quantity: 12, minQuantity: 5, costPerUnit: 850, supplier: 'Sri Balaji Feeds' },
    { name: 'Green Fodder (Napier)', category: 'FEED', unit: 'KG', quantity: 8, minQuantity: 50, costPerUnit: 5, supplier: 'Local Farm' }, // low stock
    { name: 'Ivermectin Injection', category: 'MEDICINE', unit: 'Bottle', quantity: 6, minQuantity: 2, costPerUnit: 180, supplier: 'Vet Pharma' },
    { name: 'Tetanus Vaccine', category: 'MEDICINE', unit: 'Bottle', quantity: 3, minQuantity: 2, costPerUnit: 220, supplier: 'Animal Health Ltd' },
    { name: 'Antibiotic Powder', category: 'MEDICINE', unit: 'Pack', quantity: 1, minQuantity: 3, costPerUnit: 150, supplier: 'Vet Pharma' }, // low stock
    { name: 'Calcium Supplement', category: 'MEDICINE', unit: 'KG', quantity: 4, minQuantity: 1, costPerUnit: 95, supplier: 'Animal Health Ltd' },
    { name: 'Milk Bucket (SS)', category: 'EQUIPMENT', unit: 'Piece', quantity: 8, minQuantity: 3, costPerUnit: 450, supplier: 'Farm Equipment Hub' },
    { name: 'Feed Trough (Plastic)', category: 'EQUIPMENT', unit: 'Piece', quantity: 5, minQuantity: 2, costPerUnit: 320, supplier: 'Farm Equipment Hub' },
    { name: 'Weighing Scale (50kg)', category: 'EQUIPMENT', unit: 'Piece', quantity: 2, minQuantity: 1, costPerUnit: 2800, supplier: 'Scales & More' },
    { name: 'Ear Tags', category: 'EQUIPMENT', unit: 'Pack', quantity: 2, minQuantity: 5, costPerUnit: 120, supplier: 'Livestock Supplies' }, // low stock
  ]

  for (const item of inventory) {
    await prisma.inventory.create({ data: item })
  }
  console.log('✅ Inventory created')

  // ─── SUMMARY ─────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!')
  console.log('─────────────────────────────')
  console.log('Login credentials:')
  console.log('  OWNER    → 9876543210 / owner123')
  console.log('  MANAGER  → 9876543211 / manager123')
  console.log('  EMPLOYEE → 9876543212 / emp123')
  console.log('─────────────────────────────')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
