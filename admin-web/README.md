# NEXO MAP Admin Web

Panel web administrativo de NEXO MAP (React 18 + Vite + TypeScript + Tailwind + TanStack Query + Zustand + MapLibre).
Especificación: `docs/tecnica/04. admin-web.md`. Contratos: `docs/tecnica/02. system-contracts.md`.
Estado y continuidad: `docs/admin-web/`.

## Uso

```bash
npm install
cp .env.example .env      # VITE_API_URL (por defecto http://localhost:8000/api/v1)
npm run dev               # http://localhost:5173
npm run build             # tsc + vite build
npm run typecheck
npm test
npm run generate:mask     # regenera public/geo/formosa-mask.json desde backend/data/formosa.json
```

## Sin backend

El panel trabaja solo con el backend real (`VITE_API_URL`). No hay datos de simulación: si la API no responde,
cada pantalla muestra «No se pudo conectar con el servidor.» y el login no permite ingresar.
Los operadores son usuarios con `perfiles.rol = 'administrador'` en Supabase (`docs/tecnica/06. database-storage.md` §3.2).
