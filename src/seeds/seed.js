require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = () => {
  return mongoose.connect(process.env.MONGODB_URI);
};

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');
const Counter = require('../models/Counter');

const importData = async () => {
  try {
    await connectDB();
    console.log('MongoDB Conectado para Seeding');

    // Limpiar BD
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    await Sale.deleteMany();
    await StockMovement.deleteMany();
    await Counter.deleteMany();

    // 1. Crear Admin
    const adminUser = await User.create({
      nombre: 'Admin General',
      email: 'admin@kiosco.com',
      password: 'password123', // El pre-save del modelo lo hasheará
      rol: 'admin'
    });

    const empleado = await User.create({
      nombre: 'Juan Pérez',
      email: 'juan@kiosco.com',
      password: 'password123',
      rol: 'empleado'
    });

    console.log('Usuarios creados.');

    // 2. Crear Categorias
    let colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
    const cats = [
      { nombre: 'Bebidas', color: colors[0], icono: 'cup-soda' },
      { nombre: 'Snacks', color: colors[1], icono: 'cookie' },
      { nombre: 'Golosinas', color: colors[2], icono: 'candy' },
      { nombre: 'Almacén', color: colors[3], icono: 'package' },
      { nombre: 'Lácteos', color: colors[4], icono: 'milk' },
      { nombre: 'Limpieza', color: colors[5], icono: 'spray' }
    ];

    const createdCats = await Category.insertMany(cats);
    console.log('Categorías creadas.');

    // 3. Crear Productos
    // Todo se vende por unidad: `unidadMedida` describe la presentación,
    // nunca se vende por peso ni por fracción.
    const prodsToCreate = [
      { nombre: 'Coca Cola 2.25L', sku: '779001', codigoBarras: '7790010000011', descripcion: 'Gaseosa cola en botella de 2.25 litros.', categoria: createdCats[0]._id, precioCompra: 800, precioVenta: 1200, stock: 50, stockMinimo: 10, unidadMedida: 'botella' },
      { nombre: 'Sprite 2L', sku: '779002', codigoBarras: '7790010000028', descripcion: 'Gaseosa lima-limón en botella de 2 litros.', categoria: createdCats[0]._id, precioCompra: 750, precioVenta: 1100, stock: 30, stockMinimo: 10, unidadMedida: 'botella' },
      { nombre: 'Agua Villavicencio 1.5L', sku: '779003', codigoBarras: '7790010000035', descripcion: 'Agua mineral sin gas 1.5 litros.', categoria: createdCats[0]._id, precioCompra: 300, precioVenta: 500, stock: 40, stockMinimo: 15, unidadMedida: 'botella' },
      { nombre: 'Papas Lays 145g', sku: '779004', codigoBarras: '7790010000042', descripcion: 'Papas fritas clásicas, paquete de 145 gramos.', categoria: createdCats[1]._id, precioCompra: 450, precioVenta: 700, stock: 25, stockMinimo: 5, unidadMedida: 'paquete' },
      { nombre: 'Doritos 100g', sku: '779005', codigoBarras: '7790010000059', descripcion: 'Totopos de nacho con queso, paquete de 100 gramos.', categoria: createdCats[1]._id, precioCompra: 400, precioVenta: 650, stock: 20, stockMinimo: 5, unidadMedida: 'paquete' },
      { nombre: 'Alfajor Jorgito', sku: '779006', codigoBarras: '7790010000066', descripcion: 'Alfajor de maicena con dulce de leche.', categoria: createdCats[2]._id, precioCompra: 120, precioVenta: 200, stock: 60, stockMinimo: 20, unidadMedida: 'unidad' },
      { nombre: 'Chocolate Milka 100g', sku: '779007', codigoBarras: '7790010000073', descripcion: 'Chocolate de leche alpino, tableta de 100 gramos.', categoria: createdCats[2]._id, precioCompra: 500, precioVenta: 850, stock: 15, stockMinimo: 5, unidadMedida: 'unidad' },
      { nombre: 'Gomitas Mogul', sku: '779008', codigoBarras: '7790010000080', descripcion: 'Gomitas de frutilla surtidas.', categoria: createdCats[2]._id, precioCompra: 100, precioVenta: 180, stock: 100, stockMinimo: 30, unidadMedida: 'bolsa' },
      { nombre: 'Yerba Playadito 1Kg', sku: '779009', codigoBarras: '7790010000097', descripcion: 'Yerba mate suave, paquete de 1 kilo.', categoria: createdCats[3]._id, precioCompra: 1100, precioVenta: 1600, stock: 20, stockMinimo: 8, unidadMedida: 'paquete' },
      { nombre: 'Azúcar Ledesma 1Kg', sku: '779010', codigoBarras: '7790010000103', descripcion: 'Azúcar blanca fina, paquete de 1 kilo.', categoria: createdCats[3]._id, precioCompra: 350, precioVenta: 550, stock: 40, stockMinimo: 10, unidadMedida: 'paquete' },
      { nombre: 'Aceite Natura 1.5L', sku: '779011', codigoBarras: '7790010000110', descripcion: 'Aceite de girasol alto oleico 1.5 litros.', categoria: createdCats[3]._id, precioCompra: 900, precioVenta: 1300, stock: 15, stockMinimo: 5, unidadMedida: 'botella' },
      { nombre: 'Leche La Serenísima 1L', sku: '779012', codigoBarras: '7790010000127', descripcion: 'Leche entera pasteurizada en caja de 1 litro.', categoria: createdCats[4]._id, precioCompra: 320, precioVenta: 480, stock: 35, stockMinimo: 15, unidadMedida: 'litro' },
      { nombre: 'Yogur Ser Vainilla', sku: '779013', codigoBarras: '7790010000134', descripcion: 'Yogur bebible de vainilla.', categoria: createdCats[4]._id, precioCompra: 200, precioVenta: 350, stock: 20, stockMinimo: 8, unidadMedida: 'unidad' },
      { nombre: 'Queso Crema Casancrem', sku: '779014', codigoBarras: '7790010000141', descripcion: 'Queso cremoso untable, pote de 400 gramos.', categoria: createdCats[4]._id, precioCompra: 650, precioVenta: 1000, stock: 12, stockMinimo: 4, unidadMedida: 'pote' },
      { nombre: 'Detergente Magistral 750ml', sku: '779021', codigoBarras: '7790010000158', descripcion: 'Detergente líquido para platos con limón.', categoria: createdCats[5]._id, precioCompra: 700, precioVenta: 1100, stock: 22, stockMinimo: 8, unidadMedida: 'botella' },
      { nombre: 'Papel Higieno Higiénol x4', sku: '779022', codigoBarras: '7790010000165', descripcion: 'Pack de 4 rollos de papel higiénico doble hoja.', categoria: createdCats[5]._id, precioCompra: 1400, precioVenta: 2100, stock: 18, stockMinimo: 6, unidadMedida: 'paquete' },
      // Producto genérico: se vende con precio libre en el momento de la venta
      { nombre: 'Aire (producto genérico)', sku: 'GEN-001', descripcion: 'Producto de precio variable o sin código de barras. El precio se ingresa al momento de la venta.', categoria: createdCats[3]._id, precioCompra: 0, precioVenta: 0, stock: 0, stockMinimo: 0, unidadMedida: 'unidad', esGenerico: true, mostrarEnCatalogo: false },
      // Productos con stock bajo para alertas
      { nombre: 'Fanta 2L', sku: '779015', codigoBarras: '7790010000172', descripcion: 'Gaseosa naranja en botella de 2 litros.', categoria: createdCats[0]._id, precioCompra: 750, precioVenta: 1100, stock: 3, stockMinimo: 10, unidadMedida: 'botella' },
      { nombre: 'Chicles Beldent', sku: '779016', codigoBarras: '7790010000189', descripcion: 'Chicles sabor menta, caja de 20 unidades.', categoria: createdCats[2]._id, precioCompra: 80, precioVenta: 150, stock: 4, stockMinimo: 20, unidadMedida: 'caja' },
      { nombre: 'Turrón Arcor', sku: '779017', codigoBarras: '7790010000196', descripcion: 'Turrón de maní con miel.', categoria: createdCats[2]._id, precioCompra: 50, precioVenta: 100, stock: 0, stockMinimo: 15, unidadMedida: 'unidad' },
      { nombre: 'Levite Pomelo 1.5L', sku: '779018', codigoBarras: '7790010000202', descripcion: 'Bebida de pomelo sin gas, botella de 1.5 litros.', categoria: createdCats[0]._id, precioCompra: 400, precioVenta: 650, stock: 1, stockMinimo: 8, unidadMedida: 'botella' },
      { nombre: 'Galletitas Oreo', sku: '779019', codigoBarras: '7790010000219', descripcion: 'Galletitas rellenas de crema de vainilla, paquete de 117 gramos.', categoria: createdCats[1]._id, precioCompra: 250, precioVenta: 450, stock: 8, stockMinimo: 10, unidadMedida: 'paquete' },
      { nombre: 'Pan Bimbo Blanco', sku: '779020', codigoBarras: '7790010000226', descripcion: 'Pan de molde blanco en bolsa de 550 gramos.', categoria: createdCats[3]._id, precioCompra: 550, precioVenta: 850, stock: 5, stockMinimo: 5, unidadMedida: 'bolsa' },
    ];

    const createdProducts = await Product.insertMany(prodsToCreate);
    console.log('Productos creados.');

    // Movimientos iniciales
    const movements = createdProducts.map(p => ({
      producto: p._id,
      tipo: 'entrada',
      cantidad: p.stock,
      stockAnterior: 0,
      stockNuevo: p.stock,
      motivo: 'Stock Inicial',
      usuario: adminUser._id
    }));
    await StockMovement.insertMany(movements);

    // 4. Crear Algunas ventas históricas aleatorias
    const sales = [];
    let ticketNum = 1;
    for (let i = 0; i < 15; i++) {
       const diasAtras = Math.floor(Math.random() * 30); // Ultimo mes
       const fecha = new Date();
       fecha.setDate(fecha.getDate() - diasAtras);
       fecha.setHours(Math.floor(Math.random() * (22 - 8) + 8)); // Entre 8am y 10pm

       const prod1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
       const prod2 = createdProducts[Math.floor(Math.random() * createdProducts.length)];

       const cant1 = Math.floor(Math.random() * 3) + 1;
       const cant2 = Math.floor(Math.random() * 2) + 1;

       const subtotal1 = prod1.precioVenta * cant1;
       const subtotal2 = prod2.precioVenta * cant2;
       const subtotal = subtotal1 + subtotal2;

       sales.push({
         numeroTicket: `T-${ticketNum.toString().padStart(4, '0')}`,
         fecha,
         empleado: (i % 2 === 0) ? adminUser._id : empleado._id,
         items: [
           {
             producto: prod1._id,
             cantidad: cant1,
             precioVentaHisto: prod1.precioVenta,
             precioCompraHisto: prod1.precioCompra,
             subtotal: subtotal1
           },
           {
             producto: prod2._id,
             cantidad: cant2,
             precioVentaHisto: prod2.precioVenta,
             precioCompraHisto: prod2.precioCompra,
             subtotal: subtotal2
           }
         ],
         subtotal,
         descuento: 0,
         totalFinal: subtotal,
         metodoPago: ['efectivo', 'tarjeta', 'transferencia'][Math.floor(Math.random() * 3)],
         montoPagado: subtotal, // Supongamos pago justo
         vuelto: 0,
         estado: 'completada'
       });
       ticketNum++;
    }

    await Sale.insertMany(sales);
    console.log('Ventas de prueba creadas.');

    // 5. Inicializar los contadores correlativos a partir de lo ya creado,
    // así el próximo ticket/presupuesto/promoción/pedido no repite números.
    await Counter.insertMany([
      { _id: 'ticket', seq: sales.length },
      { _id: 'budget', seq: 0 },
      { _id: 'promocion', seq: 0 },
      { _id: 'order', seq: 0 },
    ]);
    console.log('Contadores de numeración inicializados.');

    console.log('Datos importados correctamente!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
