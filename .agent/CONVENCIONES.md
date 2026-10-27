# Convenciones Servidor

## Estructura
- **Rutas**: solo definen endpoints, delegan a controlador
- **Controladores**: toda la lógica de negocio
- **Modelos**: schemas, validaciones, virtuales
- **Middlewares**: cross-cutting (auth, errors)
- **Utils/Services**: helpers reutilizables

## API
- REST coherente
- Respuestas JSON
- Errores con `message` claros
- Validar ownership/roles con `protect`/`admin`
- Respetar `activo` / `mostrarEnCatalogo`

## Antes de cambios
- `node --check` en archivos JS modificados
- Probar con curl/local
- Tener en cuenta compatibilidad con Vercel
