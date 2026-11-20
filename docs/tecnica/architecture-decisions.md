# Registro de Decisiones de Arquitectura (ADR) — NEXO MAP
## NEXO MAP — Sistema de Reporte y Seguimiento de Incidentes Territoriales (Formosa)

Este documento compila las Decisiones de Arquitectura de Software (Architecture Decision Records) adoptadas para el ecosistema **NEXO MAP**. Cada registro documenta el contexto del problema, las alternativas analizadas, la justificación técnica, las consecuencias y el estado de la decisión.

---

### ADR-001: Desacoplamiento de Clientes y Backend mediante API REST Centralizada

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El sistema cuenta con dos clientes heterogéneos: una aplicación móvil para ciudadanos (React Native + Expo) y un panel web para administradores (React). Supabase ofrece un SDK de cliente directo (Supabase JS) que permite consultar la base de datos y el storage directamente desde los frontends mediante Row Level Security (RLS). Sin embargo, existen reglas de negocio complejas: validación territorial estricta (punto dentro del polígono de Formosa), algoritmos de agrupamiento espacial y temporal, generación automática de identificadores secuenciales, geodecodificación inversa y sanitización de datos.
- **Alternativas consideradas:**
  1. *Arquitectura Serverless / Direct-to-Supabase:* Conectar ambas aplicaciones directamente a Supabase mediante su SDK JS y apoyarse exclusivamente en funciones PostgreSQL (PL/pgSQL) y Edge Functions.
  2. *Arquitectura Cliente-Servidor Desacoplada (FastAPI como pasarela de negocio):* Todos los clientes interactúan exclusivamente con una API REST en Python (FastAPI). FastAPI orquesta la persistencia en Supabase, la autenticación y las reglas de dominio.
- **Justificación:**
  La alternativa 2 centraliza la lógica de negocio en un único lugar. Evita duplicar validaciones críticas (como la verificación geométrica de coordenadas contra los 11.673 vértices del polígono de Formosa) en JavaScript/TypeScript para Web y Móvil. Además, permite implementar rate limiting, auditoría uniforme y geoprocesamiento avanzado con librerías nativas como Shapely.
- **Consecuencias:**
  - *Positivas:* Consistencia absoluta de reglas de negocio, contratos HTTP/JSON únicos para ambos clientes, desacoplamiento de la estructura de base de datos respecto a los clientes.
  - *Negativas:* Requiere mantener y desplegar el servicio FastAPI; añade un salto de red (hop) entre clientes y base de datos.

---

### ADR-002: Conservación de la Estructura Obligatoria del Backend (`main.py` y `database.py`)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  Existe un requisito estricto del proyecto: la carpeta `backend/` debe conservar obligatoriamente los archivos `main.py` (inicializa FastAPI) y `database.py` (conexión con Supabase). No deben renombrarse, eliminarse ni trasladarse.
- **Alternativas consideradas:**
  1. *Estructura Plana:* Colocar todos los routers, modelos y servicios dentro de `main.py` o en la misma carpeta raíz.
  2. *Estructura Modular en Capas:* Mantener `main.py` como punto de entrada de la aplicación (creación de la instancia `FastAPI`, configuración de CORS, inclusión de routers y middlewares) y `database.py` como el cliente singleton de conexión con Supabase (cliente `supabase-py` y pool de conexiones PostgreSQL), organizando el resto del código en subdirectorios bien delimitados (`core/`, `api/`, `schemas/`, `services/`).
- **Justificación:**
  La alternativa 2 cumple estrictamente con la restricción sin sacrificar la escalabilidad ni la separación de responsabilidades para un equipo distribuido.
- **Consecuencias:**
  - *Positivas:* Cumplimiento contractual estricto; arquitectura escalable y legible para múltiples agentes de desarrollo.
  - *Negativas:* Ninguna.

---

### ADR-003: Estrategia de Validación y Geoprocesamiento Territorial (Shapely + PostGIS)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El archivo `Fsa_geojson/formosa.json` contiene un `Polygon` detallado con 11.673 vértices que delimita la provincia de Formosa. Cada reporte de incidente debe validarse para asegurar que sus coordenadas caigan estrictamente dentro de este territorio.
- **Alternativas consideradas:**
  1. *Validación únicamente por Bounding Box:* Comprobar únicamente si `min_lat <= lat <= max_lat` y `min_lon <= lon <= max_lon`.
  2. *Validación en Base de Datos (PostGIS `ST_Contains`):* Enviar las coordenadas a PostgreSQL y ejecutar `ST_Contains(provincia_geom, ST_SetSRID(ST_Point(lon, lat), 4326))`.
  3. *Validación en Memoria en FastAPI (Shapely `prepared.prep`):* Cargar el GeoJSON en el inicio de la aplicación backend, crear una geometría optimizada en memoria y validar en tiempo sub-milisegundo antes de interactuar con la base de datos.
  4. *Estrategia Híbrida (Bounding Box rápido + Shapely en FastAPI + PostGIS en persistencia):* El backend ejecuta un filtro rápido por BBOX y valida el polígono exacto en memoria con `shapely.prepared`. En la base de datos, el punto se almacena como `GEOMETRY(Point, 4326)` con soporte PostGIS para consultas espaciales y agrupamientos.
- **Justificación:**
  Formosa tiene una forma irregular con fronteras fluviales complejas. Un BBOX permitiría reportes erróneos en Paraguay o provincias vecinas como Chaco y Salta. La estrategia híbrida permite rechazar inmediatamente solicitudes inválidas en el backend con HTTP 422 antes de escribir en disco, mientras que PostGIS otorga capacidades espaciales avanzadas en las consultas.
- **Consecuencias:**
  - *Positivas:* Tiempo de respuesta ultrarrápido (< 2 ms) para validación territorial sin sobrecargar la base de datos.
  - *Negativas:* Se requiere cargar y preparar el polígono al arrancar el backend (`~50 ms` en el startup).

---

### ADR-004: Integración de MapLibre en React Native y Expo (Expo Dev Client)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El stack tecnológico exige React Native + Expo para la aplicación móvil ciudadana y MapLibre para la cartografía interactiva.
- **Alternativas consideradas:**
  1. *MapLibre en WebView (`react-native-webview`):* Cargar MapLibre GL JS dentro de un WebView embebido.
  2. *`@maplibre/maplibre-react-native` con Expo Go clásico:* Intentar ejecutar la librería nativa directamente en la app Expo Go de Play Store / App Store.
  3. *`@maplibre/maplibre-react-native` con Expo Development Builds (`expo-dev-client`):* Utilizar el Config Plugin oficial de MapLibre en `app.json` y generar un Development Build (`npx expo run:android` o EAS Build).
- **Justificación:**
  - La alternativa 2 es **técnicamente imposible**: `@maplibre/maplibre-react-native` contiene código C++ y dependencias nativas (MapLibre Native) que no están compiladas dentro del binario estándar de Expo Go.
  - La alternativa 1 (WebView) sufre de bajo rendimiento táctil, retrasos en la respuesta de gestos, consumo excesivo de memoria y problemas de renderizado de marcadores dinámicos.
  - La alternativa 3 es la solución oficial y recomendada por el ecosistema Expo y MapLibre. El Config Plugin inyecta automáticamente los cambios en el proyecto Android/iOS nativo y permite la previsualización en vivo en dispositivos físicos con live-reload idéntico a Expo Go una vez instalada la app de desarrollo.
- **Consecuencias:**
  - *Positivas:* Rendimiento nativo fluido a 60 FPS, aceleración por hardware (OpenGL/Vulkan), control total de la cámara y capas de GeoJSON.
  - *Negativas:* No se puede usar la aplicación estándar Expo Go de las tiendas; requiere compilar el cliente de desarrollo una vez (`apk` de depuración para Android).

---

### ADR-005: Integración de MapLibre en React Web (`react-map-gl/maplibre` + `maplibre-gl`)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El panel administrativo requiere un mapa interactivo con visualización de incidentes, agrupaciones poligonales, filtrado en tiempo real y restricción de navegación.
- **Alternativas consideradas:**
  1. *Manipulación directa de `maplibre-gl` con referencias de React (`useRef`):* Crear y destruir la instancia del mapa imperativamente.
  2. *Librería `@vis.gl/react-maplibre` directa:* Wrapper desarrollado por vis.gl.
  3. *`react-map-gl/maplibre` (mantenida por vis.gl):* Importación estándar oficial recomendada por el consorcio MapLibre y vis.gl.
- **Justificación:**
  `react-map-gl/maplibre` provee bindings declarativos de React (componentes `<Map>`, `<Source>`, `<Layer>`, `<Marker>`, `<Popup>`), sincronización de ciclo de vida, soporte tipado en TypeScript y excelente integración con capas GeoJSON.
- **Consecuencias:**
  - *Positivas:* Código declarativo, mantenible, fácil de componer con el estado de React y TanStack Query.
  - *Negativas:* Requiere instalar tanto `react-map-gl` como `maplibre-gl`.

---

### ADR-006: Representación Visual del Límite Territorial (Máscara Poligonal Invertida)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El requerimiento funcional exige:
  *"...que se genere un bounding box del formosa.json que sea el limite en el que se puede desplazar un usuario. y solo según el poligono de formosa.json lo que esté dentro de el territorio se pueda colocar los reportes, por fuera esté en un color más oscuro".*
- **Alternativas consideradas:**
  1. *Filtro visual CSS en el canvas:* No discrimina la forma irregular del polígono.
  2. *Línea perimetral gruesa:* No oscurece el exterior, solo resalta el borde.
  3. *Máscara Invertida (Inverted Polygon Mask / Donut Polygon):* Crear un GeoJSON cuya geometría exterior sea un polígono que cubra el mundo o la región ampliada (ej. `[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]`), y cuyo anillo interior (hole) sea exactamente la lista de coordenadas de `formosa.json`.
- **Justificación:**
  MapLibre soporta nativamente polígonos con agujeros (holes). Al aplicar una capa de tipo `fill` sobre la máscara invertida con color negro y opacidad (`rgba(15, 23, 42, 0.6)`), el territorio exterior a Formosa se oscurece uniformemente, mientras que la provincia de Formosa permanece perfectamente iluminada y nítida. Combinado con la propiedad `maxBounds` en la cámara del mapa, el usuario no puede desplazarse fuera del área provincial.
- **Consecuencias:**
  - *Positivas:* Experiencia visual intuitiva y elegante, implementable de manera idéntica en Web y Móvil.
  - *Negativas:* Requiere pregenerar o computar en memoria la máscara invertida a partir del archivo `formosa.json`.

---

### ADR-007: Criterios y Generación de Agrupaciones Geográficas (Incident Clusters)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El requerimiento funcional especifica que no se debe generar un polígono por cada reporte individual, sino que cuando existan reportes cercanos de la misma categoría ocurridos en una ventana temporal de 10 días, se represente una zona de concentración mediante un polígono coloreado según la categoría.
- **Alternativas consideradas:**
  1. *Clustering dinámico en el cliente con Supercluster:* Agrupa marcadores en burbujas con números, pero no genera polígonos de concentración representativos del área.
  2. *Generación de polígonos bajo demanda en el cliente:* Sobrecarga el hilo principal del móvil calculando envolventes convexas con miles de coordenadas.
  3. *Cálculo y Servicio en Backend (DBSCAN Espaciotemporal + Convex Hull con Buffer):* El backend procesa periódicamente o ante cambios de estado los incidentes activos (`verificado`, `en_seguimiento`). Si 3 o más reportes de la misma categoría distan menos de 800 metros entre sí y tienen menos de 10 días de diferencia temporal, genera una envolvente convexa (`Convex Hull`) con un pequeño buffer suavizado (`ST_Buffer` / `shapely.buffer`). Las zonas resultantes se exponen en `GET /api/v1/incidents/clusters`.
- **Justificación:**
  Garantiza coherencia total entre lo que ve el ciudadano en la app móvil y lo que ve el administrador en el panel web. Desliga a los dispositivos móviles de cálculos geométricos pesados.
- **Consecuencias:**
  - *Positivas:* Polígonos limpios, consistentes y cacheados; rendimiento óptimo en clientes.
  - *Negativas:* Requiere un servicio de cálculo de clusters en el backend.

---

### ADR-008: Identificadores Secuenciales Amigables para el Ciudadano (`#00001` vs UUID)

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El requerimiento funcional solicita que la confirmación y la ficha de seguimiento muestren `REPORTE #00000` o `Mi reporte #00000`, facilitando que un ciudadano pueda memorizar o comunicar telefónicamente su número de aviso.
- **Alternativas consideradas:**
  1. *Utilizar UUIDv4 directamente en la interfaz:* Ej. `REPORTE #550e8400-e29b-41d4-a716-446655440000`. Inviable para ciudadanos comunes.
  2. *Utilizar una secuencia entera autoincremental simple:* Riesgo de enumeración de recursos si se expone como clave primaria única sin control.
  3. *Clave primaria UUID en base de datos + Columna `report_number` autoincremental con formato visual:* En la base de datos se mantiene `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` para relaciones seguras y `report_number INT GENERATED ALWAYS AS IDENTITY` formateado en la API como `#` seguido de 5 dígitos (ej. `#00142`).
- **Justificación:**
  Combina la robustez técnica de UUID para claves foráneas y APIs internas con la simplicidad y accesibilidad humana que exige un sistema de emergencias.
- **Consecuencias:**
  - *Positivas:* Cumple exactamente con la UI especificada en `PROJECT_CONTEXT.md` y mantiene la integridad referencial de base de datos.
  - *Negativas:* Ninguna.

---

### ADR-009: Pipeline de Gestión y Almacenamiento de Fotografías

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  Los reportes ciudadanos permiten adjuntar una fotografía como evidencia visual. Las imágenes deben almacenarse en Supabase Storage y optimizarse para evitar saturación de red durante situaciones de emergencia climática.
- **Alternativas consideradas:**
  1. *Subida directa desde el cliente a Supabase Storage mediante SDK JS:* Expone el bucket a subidas de archivos maliciosos sin validar si el reporte asociado es válido territorialmente.
  2. *Subida Multipart/form-data a través del Backend FastAPI:* El cliente envía los datos del formulario y el archivo binario en una única solicitud multipart. FastAPI valida el polígono geográfico y los campos obligatorios. Si es válido, redimensiona/comprime la imagen a formato JPEG optimizado (máx 1920x1080, calidad 80%) y la sube al bucket privado de Supabase Storage mediante el SDK `supabase-py` usando la clave Service Role.
- **Justificación:**
  Evita que se almacenen imágenes huérfanas o que se consuma cuota de almacenamiento si el reporte es rechazado por estar fuera de Formosa o por campos inválidos. Permite además aplicar compresión en el servidor para estandarizar el peso de los archivos.
- **Consecuencias:**
  - *Positivas:* Validación atómica (reporte + foto), control total del tamaño y formato, seguridad estricta del bucket.
  - *Negativas:* Mayor consumo de ancho de banda y CPU en el servidor backend durante la carga.

---

### ADR-010: Máquina de Estados y Reglas de Transición para Reportes

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  El ciclo de vida de un reporte tiene estados definidos: `pendiente`, `en_revision`, `verificado`, `descartado`, `en_seguimiento` y `resuelto`. Debe existir una estricta trazabilidad de quién y cuándo modificó el estado, con comentarios administrativos obligatorios en ciertas transiciones.
- **Alternativas consideradas:**
  1. *Actualización directa del campo `status` sin validación de transiciones:* Cualquier estado puede pasar a cualquier otro.
  2. *Máquina de estados finita (FSM) estricta en el Backend:* Las transiciones están controladas por reglas formales. Cada cambio genera atómicamente un registro en `report_history`.
- **Justificación:**
  Un reporte no puede saltar directamente de `pendiente` a `resuelto` sin pasar por revisión/verificación. La trazabilidad es un requisito explícito para evitar modificaciones anónimas entre operadores.
- **Consecuencias:**
  - *Positivas:* Integridad del flujo operativo, auditoría completa garantizada, datos limpios para métricas del dashboard.
  - *Negativas:* Las solicitudes con transiciones no permitidas serán rechazadas con HTTP 409 Conflict o 422 Unprocessable Entity.

---

### ADR-011: Sistema de Diseño Visual Unificado, Paleta de Identidad y Regla «Cero Emojis»

- **Estado:** Aprobada.
- **Fecha:** 2026-11-18.
- **Contexto:**
  La aplicación móvil ciudadana y el panel administrativo web deben pertenecer a un único ecosistema visual institucional. Se requiere un lenguaje de diseño moderno, sobrio y funcional que transmita claridad, orden y confianza en situaciones de emergencia, evitando estéticas saturadas, infantiles o sobrecargadas.
- **Alternativas consideradas:**
  1. *Librerías de componentes UI preempaquetadas con estéticas independientes (ej. Material Design en móvil vs AntDesign/Chakra en Web):* Provoca fragmentación visual, diferencias notorias en bordes, tipografías dispares y sobrecarga de estilos.
  2. *Uso libre de emojis para enriquecer estados y categorías:* Informaliza la plataforma, provoca inconsistencias de renderizado entre marcas de celulares (iOS/Android) y afecta la accesibilidad en lectores de pantalla.
  3. *Sistema de Diseño Compartido Basado en Tokens (Azul del logo `#0475EF` / `#091B3B` / `#3CD6FC` + Blanco `#FFFFFF`, Tipografía Inter, Iconos Lucide y Bordes Selectivos):* Se define una paleta institucional sobria con el azul del logo como color de identidad y acento, tipografía unificada Inter, biblioteca vectorial Lucide Icons (prohibiendo terminantemente los emojis) y minimalismo de contenido sin frases decorativas.
- **Justificación:**
  La alternativa 3 asegura coherencia multiplataforma total sin perder la especialización funcional de cada cliente. El uso de Lucide garantiza vectores nítidos con trazo uniforme (1.75px/2px), mientras que la tipografía Inter ofrece una legibilidad insuperable en datos numéricos y cartografía. El botón flotante «Informar» en superficie clara con texto e icono en el azul del logo destaca con jerarquía y elegancia sin saturar visualmente el mapa.
- **Consecuencias:**
  - *Positivas:* Coherencia estética absoluta, diseño profesional y accesible, menor peso en bundle (sin fuentes ni librerías redundantes), rápida adopción por desarrolladores.
  - *Negativas:* Requiere disciplina estricta para evitar la inclusión de emojis o estilos ad-hoc.

