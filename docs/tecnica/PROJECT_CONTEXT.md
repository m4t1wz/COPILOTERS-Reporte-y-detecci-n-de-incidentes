# NEXO MAP — Sistema de reporte y seguimiento de incidentes territoriales

**Identidad Oficial del Proyecto:** **NEXO MAP**  
**Logotipo e Isotipo Oficial:** `Nexo_map.png` (disponible en raíz y en `docs/assets/Nexo_map.png`)  
**Aplicación Móvil:** NEXO MAP Mobile (React Native / Expo)  
**Panel Administrativo:** NEXO MAP Web (React)  
**Territorio de Operación:** Provincia de Formosa, Argentina  

---

## 1. Aplicación móvil: ciudadanos (NEXO MAP)
La aplicación **NEXO MAP** está destinada a cualquier ciudadano que necesite informar una situación que pueda afectar a otras personas o al funcionamiento de la ciudad.

Su objetivo es que informar un incidente sea rápido, sencillo y accesible, incluso para personas con poca experiencia utilizando tecnología.
Al abrir la aplicación, el usuario encontrará:
- Un mapa interactivo de Formosa.
- Marcadores de incidentes reportados.
- Zonas de concentración de reportes cercanos.
- Un botón destacado «Informar un incidente».
- Acceso a la configuración.
- Acceso a los detalles de los incidentes.
- el botón de "Mis reportes"
Importante: explorar el mapa no requiere iniciar sesión. El usuario puede consultar los reportes, sus categorías y sus estados libremente.
B. Informar un incidente
Cuando el ciudadano presiona «Informar un incidente», se comprueba si tiene una sesión iniciada.
- Si tiene una cuenta, accede al formulario.
- Si no tiene una cuenta, aparece una pantalla de inicio de sesión y registro. Registro con un mensaje ¿Nuevo por aca? Toca acá. en caso de no tener cuenta.  Iniciar sesión en caso de tenerla.
El formulario debería contener:
Campo	               Descripción	                       Obligatorio
Categoría	Tipo de incidente	                          Sí
Ubicación	Coordenadas GPS y dirección aproximada	          Sí (Automatico, en caso de que no se pueda acceder a la ubicación permita colocar una manualmente)
Fotografía	Evidencia visual	                          No
Comentario	Descripción de lo sucedido	                  No (Obligatorio en caso de no colocar una fotografia)
Fecha	        Fecha de creación del reporte	              Automática (y obligatoria)
Hora	        Hora de creación del reporte	              Automática (y obligatoria)
----------------
Categorías a elegir según el tipo de incidente:
- Calle anegada.
- Camino interrumpido.
- Desborde de río o riacho.
- Vivienda o estructura dañada.
- Árbol caído.
- Obstrucción de desagüe.
- Poste o cable caído.
- Daños en infraestructura pública.
- Corte de servicios básicos.
- Otro.
----------------------
Si selecciona «Otro», aparece un campo para especificar qué sucedió (obligatorio completar si no se colocó una fotografía).
La ubicación debería obtenerse automáticamente mediante GPS, pero permitir corregir el punto en el mapa manualmente si la ubicación detectada no es precisa. botón: ¿La ubicación no es correcta? ¡Corregir!
La fecha y hora deben generarse desde el servidor, conservando la zona horaria correspondiente.
--------------------------
Agregar una fotografia se puede hacer mediante sacar una foto, o agregar una fotografia desde archivo
--------------------------
C. Confirmación del reporte
Una vez enviado, el usuario recibe una confirmación. con la estructura de tarjeta:
<Check en verde> Reporte enviado correctamente
REPORTE #00000 (id del reporte)
Categoria
Ubicacion - (coordenadas convertido en una referencia geografica mediante geodecodificacion inversa, el administrador recibe tanto la referencia geografica como la coordenada exacta)
Fecha y hora - DD/MM/AAAA (HH:MM)
Estado: Pendiente
Mensaje: El aviso fue recibido.
----------------------------
D. Seguimiento de mis reportes

una sección llamada «Mis reportes», donde pueda consultar todos los avisos que realizó.
- Categoría y fotografía.
- Ubicación en el mapa.
- Fecha y hora.
- Comentario original.
- Estado actual.
- Historial de actualizaciones.
- Comentarios del administrador.
Con este formato

Mi reporte #00000
[Foto] Categoria
Ubicación (geodecodificada) y entre paréntesis la coordenada exacta ()
Estado: Muestra el último estado registrado en el historial del reporte.

Historial del reporte
Historial en formato TimeLine:
Muestra en secuencia cronológica las actualizaciones conectados mediante una linea vertical, es decir que los eventos se conectan del mas antiguo al mas reciente, de arriba hacia abajo. Ejemplo:
1 Reporte recibido
DD/MM/AAAA (HH:MM)

2 En revisión
DD/MM/AAAA (HH:MM)
Se está revisando el reporte.
Comentario administrativo:
"Aca un comentario que escribe el administrador"
-----
Por cada actualización se debe recibir una notificación de cambio de estado, se puede activar o desactivar en la configuración, inicia en desactivado.
-------------------------
E. Mapa y exploración de incidentes
El mapa debe permitir consultar los incidentes registrados en toda la zona cubierta por el sistema (Formosa mediante un trazado GeoJSON)
Cada categoría tendrá un color identificativo.
Calle anegada: azul (#2196F3)
Camino interrumpido: naranja (#F57C00)
Desborde de río o riacho: azul oscuro (#1565C0)
Vivienda o estructura dañada: rojo (#D32F2F)
Árbol caído: verde (#558B2F)
Obstrucción de desagüe: turquesa (#00897B)
Poste o cable caído: amarillo ámbar (#F9A825)
Daños en infraestructura pública: violeta (#7E57C2)
Corte de servicios básicos: gris (#607D8B)
Otro: gris neutro (#757575)
--------
Al seleccionar un marcador(incididente unico) o una agrupación, se abre una ficha con información del incidente.
Importante sobre los polígonos: no se debe generar un polígono para cada reporte individual. Se utiliza para agrupaciones geográficas cuando existan varios avisos relacionados. 
Por ejemplo, tres reportes cercanos de calles anegadas pueden formar una zona de concentración azul mediante un poligono.
La agrupación debería considerar:
- Distancia entre coordenadas.
- Categoría coincidente.
- Cercanía temporal entre los avisos. (10 días de cercanía)
El polígono representa una concentración de avisos, no necesariamente el perímetro real de una inundación.
Los reportes individuales deben seguir existiendo y poder consultarse.
----------------------------------------------
F. Configuración y accesibilidad
La configuración debería incluir:
- Aumentar o reducir el tamaño de fuente.
- Elegir entre tema claro y oscuro.
- Ajustar los colores del mapa.
- Activar o desactivar notificaciones.
----------------------------------------------
2. Flujo de los reportes: desde el ciudadano hasta la resolución

Flujo: 
1. Pendiente 
El reporte fue recibido y esta pendiente a ser revisado
2. En revisión
Se está revisando el reporte. 

3. existen dos posibilidades: Verificado "Se confirmó el incidente" / Descartado (El aviso no corresponde a un incidente o no se pudo confirmar)
4. En seguimiento
Se está realizando gestiones sobre el incidente.
(El administrador puede dejar comentarios)
5. Resuelto
Se deja la constancia de cuando se resolvió.
---------------------------------------------------------

3. Sitio web: panel administrativo

El panel administrativo es la herramienta que utiliza el personal responsable de recibir, revisar y gestionar los reportes.
A diferencia de la aplicación ciudadana, requiere inicio de sesión obligatorio y permisos de administrador simplemente al entrar.

-----------
A. Dashboard principal
Al ingresar, el administrador encontrará un resumen general:
- Cantidad total de reportes.
- Reportes pendientes de revisión.
- Incidentes verificados.
- Incidentes en seguimiento.
- Incidentes resueltos.
- Reportes descartados.
tendrá un mapa general con los incidentes y sus agrupaciones geográficas.
----------
B. Gestión de reportes
Una sección donde pueda consultar todos los reportes recibidos.
Cada registro tendrá:
- Identificador único.
- Categoría.
- Fecha y hora.
- Ubicación y coordenada.
- Fotografía.
- Comentario del ciudadano.
- Estado actual.
Podrá filtrar por categoría, estado, fecha y zona geográfica.
Al seleccionar un reporte, podrá abrir su ficha completa y realizar acciones administrativas.
-----------
D. Actualización de estados y comentarios
El administrador podrá cambiar el estado y dejar un comentario visible para el ciudadano.
Los comentarios deben ser escritos por el administrador.
----------
E. Historial y trazabilidad
El administrador también podrá consultar el historial de cada incidente.
Ej: Si otro administrador modificó el estado, deberá quedar registrado.
Esto evita que las modificaciones se realicen sin dejar constancia de quién tomó cada decisión.


-------------------------------------------
FLUJO DE LA Aplicación
-----
Flujo ciudadano
1. Abrir aplicación
   El ciudadano ingresa sin necesidad de registrarse para explorar.

2. Consultar mapa
   Visualiza los reportes, categorías, agrupaciones y estados.

3. Presionar «Informar un incidente»
   Si no tiene sesión iniciada, aparece el login o la opción de crear una cuenta.

4. Completar formulario
   Selecciona categoría, ubicación, fotografía opcional y comentario opcional(obligatorio en caso de no poner fotografía).

5. Enviar reporte
   El servidor valida los datos y aplica el límite de solicitudes.

6. Recibir confirmación
   Se genera un identificador y el reporte queda pendiente de revisión.

7. Consultar seguimiento
   El ciudadano puede encontrar el reporte en «Mis reportes» y consultar las actualizaciones.
-----
Flujo administrativo
1. El administrador inicia sesión en el panel web.
2. Consulta los reportes recibidos.
3. Revisa ubicación, fotografías y comentarios.
4. Verifica o descarta los avisos.
5. Actualiza el estado y escribe un comentario.
6. Realiza el seguimiento y registra la resolución.
7. El ciudadano puede consultar las actualizaciones desde su aplicación.


------------------------------
STACK:
Backend: Python con FastAPI
Aplicación: React Native con Expo para visualizar cambios
Sitio web administrativo: React
Base de datos y almacenamiento de imágenes: Supabase (basado en PostgresSQL) y su función de storage para lamacenar las fotografías
MapLibre como base cartográfica 
-----------------------------
Problema:
Durante una emergencia pueden recibirse numerosos avisos sobre situaciones que requieren atención: calles anegadas, caminos interrumpidos, viviendas afectadas, árboles caídos u otros incidentes. Cuando la información se encuentra dispersa, resulta difícil localizar cada situación, verificarla y realizar su seguimiento.
-----------
¿Quién utilizaría nuestra herramienta?

-Ciudadanos de Formosa que necesiten reportar incidentes ocasionados por el fenómeno del niño.
-Organismos de emergencia y autoridades provinciales que necesiten consultar los reportes.

¿Qué necesidad concreta buscamos atender?

Buscamos centralizar información sobre incidentes ocacionados dentro de Formosa, por el evento climático. y disponer de información publica para todos.

¿Qué función principal tendrá nuestro prototipo?

Desarrollar una plataforma de reporte y visualización geográfica de incidentes en Formosa. Los ciudadanos podrán informar situaciones como calles anegadas, árboles caídos, caminos interrumpidos o viviendas afectadas, indicando su ubicación y proporcionando información como comentarios
Los reportes se visualizarán en un mapa interactivo de la provincia.

¿Qué información necesitamos y de dónde podemos obtenerla?

Necesitamos ubicación geográfica principalmente: coordenadas gps de los incidentes. también información como la categoría , fehca y hora y fotografías proporcionada por el usuario.

¿Qué acción concreta podremos mostrar al jurado?

Simular el reporte de una emergencia desde un dispositivo móvil.

¿Qué no podemos asegurar con la información disponible?
No podemos garantizar que todos los incidentes reportados sean reales.
No podemos asegurar que la ubicación proporcionada sea completamente precisa.
No podemos garantizar que las autoridades reciban, validen o atiendan cada reporte.

¿Por qué utilizar inteligencia artificial u otra tecnología mejora la solución?

La tecnología nos permite transformar reportes individuales y dispersos en información centralizada, organizada y georreferenciada.