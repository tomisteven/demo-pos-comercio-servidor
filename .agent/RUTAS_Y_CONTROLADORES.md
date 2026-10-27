# Rutas y Controladores

## Mapeo en server.js
| Ruta | Ruta archivo | Controlador |
|---|---|---|
| `/api/auth` | `authRoutes.js` | `authController.js` |
| `/api/products` | `productRoutes.js` | `productController.js` (incluye `/public/catalog` y `/public/:id`) |
| `/api/sales` | `saleRoutes.js` | `saleController.js` |
| `/api/stock-movements` | `stockRoutes.js` | `stockController.js` |
| `/api/categories` | `categoryRoutes.js` | `categoryController.js` |
| `/api/customers` | `customerRoutes.js` | `customerController.js` |
| `/api/orders` | `orderRoutes.js` | `orderController.js` |
| `/api/system-config` | `systemConfigRoutes.js` | `systemConfigController.js` |
| `/api/reports` | `reportRoutes.js` | `reportController.js` |
| `/api/users` | `userRoutes.js` | `userController.js` |

## Públicos importantes
- `GET /api/products/public/catalog`
- `GET /api/products/public/:id`
- `GET /api/system-config/public`
- `GET /api/health`
