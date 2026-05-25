// defaultSystems.js
// Contiene la definición estructurada de los 5 sistemas solares por defecto de OrbiMind.
// Diseñado con variedad orbital asimétrica extrema en cada sistema:
// - Planeta A: Profundo lineal (1 planetoide -> 1 luna -> 1 satélite)
// - Planeta B: Ancho plano (5 planetoides)
// - Planeta C: Mixto asimétrico (2 planetoides; el primero con 5 lunas de pioneros históricos, el segundo simple)

export const defaultSystemsData = [
  {
    name: "Termodinámica Avanzada",
    tasks: [
      "Deducir matemáticamente las Relaciones de Maxwell",
      "Analizar la eficiencia de Carnot y el Teorema de Clausius",
      "Evaluar la producción de entropía local en no equilibrio"
    ],
    sun: {
      title: "Termodinámica",
      type: "sun",
      notes: `# Termodinámica Clásica y Estadística (Nivel Universitario)

La termodinámica clásica y estadística describe el comportamiento macroscópico y microscópico de la materia bajo equilibrio térmico mediante leyes matemáticas y estadísticas rigurosas. A diferencia del enfoque puramente mecánico, la termodinámica introduce conceptos de calor, entropía y temperatura para cambiar la comprensión de sistemas complejos compuestos por un gran número de partículas ($N \\approx 10^{23}$).

### Concepto de Diferencial Exacta
En termodinámica, las funciones de estado poseen diferenciales exactas, lo que significa que el cambio de una variable de estado depende únicamente del estado inicial y final, no de la trayectoria. Para una función $z(x, y)$:
$$dz = \\left(\\frac{\\partial z}{\\partial x}\\right)_y dx + \\left(\\frac{\\partial z}{\\partial y}\\right)_x dy$$
Si $dz$ es exacta, se cumple el teorema de Clairaut (o de Euler) para las segundas derivadas cruzadas:
$$\\frac{\\partial^2 z}{\\partial y \\partial x} = \\frac{\\partial^2 z}{\\partial x \\partial y}$$

### Clasificación de Sistemas Termodinámicos
1. **Aislado**: No intercambia materia ni energía con el entorno ($\\Delta U = 0, \\Delta N = 0$). Es el marco de referencia fundamental para el ensamble microcanónico.
2. **Cerrado**: Intercambia energía (calor y trabajo) pero no materia ($\\Delta N = 0$). Rige el comportamiento del ensamble canónico.
3. **Abierto**: Intercambia tanto materia como energía. Su descripción requiere incorporar potenciales químicos.

### Variables de Estado
- **Intensivas**: Independientes del tamaño o masa del sistema (ej. Temperatura $T$, Presión $P$, Densidad $\\rho$, Potencial químico $\\mu$).
- **Extensivas**: Proporcionales al tamaño o masa del sistema (ej. Volumen $V$, Energía interna $U$, Entropía $S$, Masa $m$, Número de partículas $N$).

Q: ¿Qué diferencia a una función de estado de una función de trayectoria?
A: Una **función de estado** (como $U, H, S, G$) tiene una diferencial exacta y su cambio depende solo de los estados extremos. Una **función de trayectoria** (como el calor $Q$ y el trabajo $W$) tiene una diferencial inexacta ($\\delta Q, \\delta W$) y su valor acumulado depende de los detalles mecánicos y térmicos de la transición.

[^1]: Zemansky, M. W. & Dittman, R. H. (1997). Heat and Thermodynamics. McGraw-Hill.
[^2]: Callen, H. B. (1985). Thermodynamics and an Introduction to Thermostatistics. Wiley.`,
      color: "#ffaa00",
      children: [
        {
          title: "Leyes Fundamentales",
          type: "planet",
          notes: `# Leyes de la Termodinámica y Límites del Universo

Los cuatro principios pilares sobre los que se construye la termodinámica macroscópica clásica, estableciendo los límites físicos del universo.

### Ley Cero (Equilibrio Térmico)
Si un sistema $A$ está en equilibrio térmico con un sistema $B$, y $B$ está en equilibrio con $C$, entonces $A$ y $C$ están en equilibrio térmico entre sí:
$$T_A = T_B \\quad \\text{y} \\quad T_B = T_C \\implies T_A = T_C$$
Permite definir operacionalmente el concepto de temperatura, justificando la validez de los termómetros como instrumentos de medición.

### Primera Ley (Conservación de la Energía)
La energía interna total de un sistema cerrado solo se modifica por el intercambio de calor o la realización de trabajo:
$$dU = \\delta Q - \\delta W$$

### Segunda Ley (Entropía y Causalidad)
La entropía de un sistema aislado en un proceso espontáneo siempre aumenta, alcanzando su máximo en el equilibrio:
$$dS_{\\text{universo}} = dS_{\\text{sistema}} + dS_{\\text{entorno}} \\geq 0$$

### Tercera Ley (Límite del Cero Absoluto)
Al aproximarse la temperatura de un sistema cristalino perfecto al cero absoluto, su entropía toma un valor constante mínimo (que por convención se define como cero):
$$\\lim_{T \\to 0} S = 0$$`,
          orbitRadius: 130,
          orbitSpeed: 0.035,
          color: "#00f2fe",
          children: [
            {
              title: "Temperatura y Primera Ley",
              type: "planetoid",
              notes: `# Temperatura y Primer Principio de la Termodinámica

La formulación rigurosa de la temperatura como propiedad térmica coordinada y el principio general de la conservación de la energía en sistemas cerrados y abiertos.

### Formulación Rigurosa de la Ley Cero
Define una relación de equivalencia entre sistemas termodinámicos basada en tres propiedades matemáticas fundamentales:
1. **Reflexiva**: Un sistema está en equilibrio térmico consigo mismo.
2. **Simétrica**: Si el sistema A está en equilibrio con B, B lo está con A.
3. **Transitiva**: Si A y B están en equilibrio con C independientemente, A y B están en equilibrio térmico mutuo.

### Primera Ley en Sistemas Cerrados y Abiertos
La primera ley postula la existencia de una propiedad intrínseca del sistema denominada Energía Interna ($U$), que engloba la energía cinética molecular, rotacional, vibracional y la energía potencial de las interacciones moleculares.
- **Formulación Diferencial Cerrada (Proceso Reversible)**:
  $$dU = dQ - dW = TdS - PdV$$
  Donde se asume que el único trabajo realizado es de expansión ($P-V$).
- **Formulación Integrada para Procesos Finitos**:
  $$\\Delta U = Q - W$$
  Aquí, el signo de $Q$ y $W$ sigue la convención de la IUPAC: el calor suministrado al sistema es positivo ($Q > 0$) y el trabajo realizado por el sistema sobre el entorno es positivo ($W > 0$).
- **Generalización a Sistemas Abiertos (Flujo Estacionario)**:
  Para un volumen de control donde entra y sale masa (como una turbina o compresor):
  $$\\dot{Q} - \\dot{W} + \\sum \\dot{m}_{\\text{in}} \\left( h_{\\text{in}} + \\frac{V_{\\text{in}}^2}{2} + g z_{\\text{in}} \\right) - \\sum \\dot{m}_{\\text{out}} \\left( h_{\\text{out}} + \\frac{V_{\\text{out}}^2}{2} + g z_{\\text{out}} \\right) = \\frac{dU_{\\text{VC}}}{dt}$$
  Donde $h = u + Pv$ representa la Entalpía específica del fluido de trabajo (J/kg), $V$ la velocidad de flujo (m/s), y $gz$ la energía potencial de gravedad. En régimen permanente, $dU_{\\text{VC}}/dt = 0$.`,
              orbitRadius: 75,
              orbitSpeed: -0.06,
              color: "#ff7b00",
              children: [
                {
                  title: "Equivalente de Joule",
                  type: "moon",
                  notes: `# El Experimento de Joule y el Equivalente Mecánico del Calor

El trabajo experimental de James Prescott Joule entre 1843 y 1850 fue crucial para formular la primera ley, demostrando de forma cuantitativa que el trabajo mecánico y el calor son manifestaciones equivalentes de la energía.

### Montaje Experimental de Joule
Joule utilizó un recipiente de cobre aislado térmicamente (calorímetro) lleno de agua. En su interior, dispuso un eje con paletas de latón que giraban por la caída libre de dos masas de plomo suspendidas por cuerdas y poleas en el exterior.
Al descender una altura conocida $h$ bajo la aceleración de la gravedad $g$, las masas realizaban un trabajo mecánico sobre el eje:
$$W = 2 \\cdot m \\cdot g \\cdot h$$
Este trabajo mecánico se disipaba por fricción viscosa en el agua, elevando su temperatura en $\\Delta T$. Midiendo la masa del agua ($m_{\\text{agua}}$) y la capacidad calorífica del vaso del calorímetro, calculó el calor equivalente $Q$:
$$Q = (m_{\\text{agua}} c_{\\text{agua}} + m_{\\text{calorímetro}} c_{\\text{cobre}}) \\Delta T$$

### Resultados y Equivalencia Numérica
A partir de múltiples iteraciones, Joule determinó la constante de proporcionalidad o equivalente mecánico del calor ($J$):
$$J = \\frac{W}{Q} \\approx 4.184 \\text{ Joules por caloría}$$

### Tabla de Datos Históricos (Representativa de Joule)
| Ensayo | Masa ($kg$) | Caída $h$ ($m$) | Trabajo $W$ ($J$) | $\\Delta T$ ($^\\circ C$) | Calor $Q$ ($cal$) | Equivalente $J$ ($J/cal$) |
|---|---|---|---|---|---|---|
| 1 | 26.3 | 1.62 | 418.0 | 0.239 | 100.0 | 4.18 |
| 2 | 26.3 | 3.24 | 836.0 | 0.477 | 200.0 | 4.18 |
| 3 | 26.3 | 4.86 | 1254.0 | 0.718 | 300.0 | 4.18 |

Q: ¿Por qué fue fundamental el aislamiento adiabático en este experimento?
A: Porque si hubiese existido transferencia de calor con el exterior ($Q \\neq 0$), la elevación de temperatura no se debería únicamente al trabajo mecánico de las paletas, falseando la equivalencia cuantitativa entre energía mecánica y térmica.`,
                  orbitRadius: 50,
                  orbitSpeed: 0.12,
                  color: "#e8c4ff",
                  children: [
                    {
                      title: "Trabajo de Frontera",
                      type: "satellite",
                      notes: `# Trabajo de Frontera y Diferenciales en Procesos Reversibles

El cálculo del trabajo de expansión-compresión reversible (trabajo de frontera) en sistemas cerrados depende fuertemente de la relación de presión y volumen ($P-V$) durante la trayectoria.

### Trabajo de Expansión General
Para un proceso cuasiestático (reversible) en un pistón cilíndrico, el trabajo mecánico realizado es:
$$W = \\int_{V_1}^{V_2} P dV$$

### Casos de Procesos Termodinámicos Reversibles
1. **Isobaro ($P = \\text{cte}$)**:
   $$W = P(V_2 - V_1)$$
2. **Isócoro ($V = \\text{cte}$)**:
   $$dV = 0 \\implies W = 0$$
3. **Isotérmico ($T = \\text{cte}$, Gas Ideal)**:
   $$W = nRT \\ln\\left(\\frac{V_2}{V_1}\\right)$$
4. **Adiabático ($Q = 0$, Gas Ideal)**:
   La relación de estado es $P V^\\gamma = C$, donde $\\gamma = C_p/C_v$ es el coeficiente adiabático:
   $$W = \\frac{P_2 V_2 - P_1 V_1}{1 - \\gamma}$$

### Diferenciales Exactas e Inexactas
Un diferencial $df = M dx + N dy$ es una **diferencial exacta** si se cumple la condición de Clairaut:
$$\\left(\\frac{\\partial M}{\\partial y}\\right)_x = \\left(\\frac{\\partial N}{\\partial x}\\right)_y$$
Esto garantiza que la integral cíclica $\\oint df = 0$, lo que define a las funciones de estado (como $U, H, S, G$). En cambio, el calor ($dQ$) y el trabajo ($dW$) tienen diferenciales inexactos y dependen del camino, por lo que su integral cíclica no es nula.`,
                      orbitRadius: 26,
                      orbitSpeed: -0.25,
                      color: "#a8afb8"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: "Potenciales Termodinámicos",
          type: "planet",
          notes: `# Potenciales Termodinámicos y Relaciones de Maxwell

Los potenciales termodinámicos son funciones de estado con dimensiones de energía que se utilizan para evaluar la espontaneidad y el equilibrio de procesos en condiciones específicas. Su deducción se basa en la aplicación del teorema de Clairaut para derivadas cruzadas sobre diferenciales exactas.

### Las 4 Ecuaciones Fundamentales de Energía
1. **Energía Interna** $U(S, V)$:
   $$dU = T\,dS - P\,dV$$
2. **Entalpía** $H(S, P) = U + PV$:
   $$dH = T\,dS + V\,dP$$
3. **Energía Libre de Helmholtz** $A(T, V) = U - TS$:
   $$dA = -S\,dT - P\,dV$$
4. **Energía Libre de Gibbs** $G(T, P) = H - TS$:
   $$dG = -S\,dT + V\,dP$$

### Deducción de las Relaciones de Maxwell
Para una función de estado diferencial analítica $df = M dx + N dy$, el teorema de Clairaut establece que $(\\frac{\\partial M}{\\partial y})_x = (\\frac{\\partial N}{\\partial x})_y$. Aplicado a los potenciales:
- **Desde $dU$**: $\\left(\\frac{\\partial T}{\\partial V}\\right)_S = -\\left(\\frac{\\partial P}{\\partial S}\\right)_V$
- **Desde $dH$**: $\\left(\\frac{\\partial T}{\\partial P}\\right)_S = \\left(\\frac{\\partial V}{\\partial S}\\right)_P$
- **Desde $dA$**: $\\left(\\frac{\\partial S}{\\partial V}\\right)_T = \\left(\\frac{\\partial P}{\\partial T}\\right)_V$
- **Desde $dG$**: $-\\left(\\frac{\\partial S}{\\partial P}\\right)_T = \\left(\\frac{\\partial V}{\\partial T}\\right)_P$`,
          orbitRadius: 210,
          orbitSpeed: 0.02,
          color: "#00b4d8",
          children: [
            {
              title: "Energía Interna (U)",
              type: "planetoid",
              notes: `# Energía Interna ($U$) y Coeficientes Termodinámicos

La energía interna representa la suma de todas las energías cinéticas y potenciales microscópicas de las partículas del sistema.

### Ecuación de Estado Energética
A partir del formalismo diferencial de $dU = TdS - PdV$, y sustituyendo el diferencial de entropía en función de $T$ y $V$, se deduce:
$$\\left(\\frac{\\partial U}{\\partial V}\\right)_T = T \\left(\\frac{\\partial P}{\\partial T}\\right)_V - P$$
Esta importante relación determina el cambio de energía interna con el volumen a temperatura constante.
- **Gas Ideal**: $P = nRT/V \\implies \\left(\\frac{\\partial P}{\\partial T}\\right)_V = nR/V \\implies \\left(\\frac{\\partial U}{\\partial V}\\right)_T = T(nR/V) - P = 0$. Esto demuestra que la energía interna de un gas ideal depende exclusivamente de la temperatura.
- **Gas de Van der Waals**: $\\left(P + \\frac{an^2}{V^2}\\right)(V - nb) = nRT \\implies \\left(\\frac{\\partial U}{\\partial V}\\right)_T = \\frac{an^2}{V^2}$. Revela que las fuerzas atractivas intermoleculares modifican la energía interna durante expansiones volumétricas.`,
              orbitRadius: 65,
              orbitSpeed: 0.08,
              color: "#3a86c8"
            },
            {
              title: "Entalpía (H)",
              type: "planetoid",
              notes: `# Entalpía ($H$) y Calor de Reacción

La entalpía describe el contenido de calor de un sistema a presión constante. Es una transformada de Legendre de la energía interna:
$$H = U + PV$$

### Diferencial Fundamental
$$dH = T dS + V dP$$
A presión constante ($dP = 0$), el cambio de entalpía es exactamente igual al calor transferido reversiblemente al sistema:
$$dH_P = \\delta Q_p \\implies \\Delta H = Q_p$$
Esta equivalencia justifica la definición de calores de reacción (entalpías de combustión, formación y neutralización) en calorímetros abiertos a presión atmosférica.`,
              orbitRadius: 90,
              orbitSpeed: 0.07,
              color: "#4ea8de"
            },
            {
              title: "Energía de Helmholtz (A)",
              type: "planetoid",
              notes: `# Energía Libre de Helmholtz ($A$) y Trabajo Máximo

La energía libre de Helmholtz representa el trabajo máximo útil (incluyendo el trabajo de expansión) que puede extraerse de un sistema cerrado durante un proceso isotérmico.
$$A = U - TS$$

### Criterio de Espontaneidad a T y V Constantes
El diferencial fundamental es:
$$dA = -S dT - P dV$$
Para procesos que ocurren a temperatura constante ($dT=0$) y volumen constante ($dV=0$):
$$dA_{T,V} \\leq 0$$
Cualquier proceso espontáneo bajo estas condiciones debe disminuir la energía de Helmholtz, alcanzando su mínimo absoluto en el equilibrio térmico y mecánico.`,
              orbitRadius: 115,
              orbitSpeed: 0.06,
              color: "#8338ec"
            },
            {
              title: "Energía de Gibbs (G)",
              type: "planetoid",
              notes: `# Energía Libre de Gibbs ($G$) y Espontaneidad Química

La energía libre de Gibbs es el potencial termodinámico de mayor utilidad práctica en química e ingeniería. Describe el trabajo útil no expansivo máximo obtenible bajo condiciones de temperatura y presión constantes.
$$G = H - TS$$

### Relación Diferencial y Espontaneidad
$$dG = -S dT + V dP + \\sum \\mu_i dN_i$$
A temperatura ($dT = 0$) y presión ($dP = 0$) constantes, un proceso es espontáneo si la energía de Gibbs disminuye:
$$dG_{T,P} \\leq 0$$
- $\\Delta G < 0$: Reacción espontánea (Exergónica).
- $\\Delta G > 0$: Reacción no espontánea (Endergónica). Requiere trabajo externo.
- $\\Delta G = 0$: Sistema en equilibrio químico o físico de fases.`,
              orbitRadius: 140,
              orbitSpeed: 0.05,
              color: "#ff006e"
            },
            {
              title: "Potencial Químico",
              type: "planetoid",
              notes: `# Potencial Químico ($\\mu$) y Ley de Gibbs-Duhem

El potencial químico describe la afinidad y la fuerza impulsora para la transferencia de masa y reacciones químicas en sistemas multicomponentes y abiertos.

### Definición Matemática
El potencial químico de la especie $i$ se define como:
$$\\mu_i \\equiv \\left(\\frac{\\partial G}{\\partial N_i}\\right)_{T, P, N_{j \\neq i}}$$

### Ecuación de Gibbs-Duhem
Las variables intensivas de una mezcla ($T, P, \\mu_i$) están acopladas de manera lineal. A partir de la propiedad extensiva de Euler $G = \\sum \\mu_i N_i$, su diferenciación e igualdad con la ecuación fundamental resulta en:
$$S dT - V dP + \\sum N_i d\\mu_i = 0$$
A temperatura y presión constantes, esta ley limita las variaciones de potenciales químicos de la mezcla:
$$\\sum N_i d\\mu_i = 0$$`,
              orbitRadius: 165,
              orbitSpeed: 0.045,
              color: "#ffca3a"
            }
          ]
        },
        {
          title: "Transiciones y Coexistencia",
          type: "planet",
          notes: `# Transiciones de Fase y Termodinámica de Coexistencia

El estudio termodinámico clásico del equilibrio de fases coexistentes (sólido, líquido, gas) y la formulación microscópica de conjuntos estadísticos.

### Criterio de Equilibrio de Fases
Cuando dos fases $\\alpha$ y $\\beta$ coexisten a temperatura $T$ y presión $P$, sus potenciales químicos moleculares deben ser estrictamente idénticos:
$$\\mu_\\alpha(T, P) = \\mu_\\beta(T, P)$$`,
          orbitRadius: 310,
          orbitSpeed: 0.015,
          color: "#90e0ef",
          children: [
            {
              title: "Pioneros del Equilibrio",
              type: "planetoid",
              notes: `# Pioneros del Equilibrio de Fases y la Termodinámica de Transición

Las leyes matemáticas y fenomenológicas del equilibrio térmico y el comportamiento de coexistencia física fueron deducidas por cinco gigantes intelectuales de la ciencia decimonónica. Sus aportaciones establecieron las bases de la física de transiciones.`,
              orbitRadius: 85,
              orbitSpeed: -0.06,
              color: "#a2d2ff",
              children: [
                {
                  title: "J. Willard Gibbs",
                  type: "moon",
                  notes: `# Josiah Willard Gibbs y el Potencial Químico

J. Willard Gibbs (1839-1903) fue un físico matemático estadounidense que fundó la química física moderna y la mecánica estadística.

### La Regla de las Fases de Gibbs
Gibbs dedujo la condición de estabilidad de fases introduciendo los grados de libertad intensivos $F$:
$$F = C - P + 2$$
Demostró que para un sistema de $C$ componentes químicos distribuidos en $P$ fases, las condiciones de igualdad de temperatura, presión y potencial químico molecular ($\\mu_i^\\alpha = \\mu_i^\\beta$) acoplan los grados de libertad del sistema de forma matemática.

### Ecuación de Gibbs-Duhem
Demostró que los diferenciales de potenciales químicos en mezclas están mutuamente limitados:
$$\\sum N_i d\\mu_i = 0 \\quad \\text{(a T y P constantes)}$$
Esta ecuación evita cambios arbitrarios del potencial de cada especie, vinculándolos a las fracciones molares.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.15,
                  color: "#ffc6ff"
                },
                {
                  title: "Benoît Clapeyron",
                  type: "moon",
                  notes: `# Benoît Paul Émile Clapeyron y la Termodinámica Gráfica

Benoît Clapeyron (1799-1864) fue un ingeniero y físico francés que formalizó matemáticamente el ciclo reversible de Sadi Carnot.

### Ecuación de Clapeyron
Clapeyron estableció en 1834 la relación fundamental para la pendiente de las curvas de coexistencia en el diagrama $P-T$:
$$\\frac{dP}{dT} = \\frac{L}{T \\Delta v}$$
Donde $L$ representa el calor latente de transición molar y $\\Delta v$ el cambio de volumen específico.

### Diagramas P-V
Fue el creador de los diagramas de presión-volumen (Diagramas de Clapeyron), permitiendo visualizar geométricamente el trabajo mecánico como el área encerrada en una curva cerrada de un ciclo.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff"
                },
                {
                  title: "Rudolf Clausius",
                  type: "moon",
                  notes: `# Rudolf Clausius y la Entropía

Rudolf Clausius (1822-1888) fue un físico matemático alemán que definió el concepto termodinámico de Entropía y formuló la segunda ley de forma rigurosa.

### Ecuación de Clausius-Clapeyron
Clausius refinó la ecuación de Clapeyron para el equilibrio líquido-vapor asumiendo comportamiento de gas ideal en el vapor y volumen molar despreciable en la fase condensada líquida, deduciendo la ecuación integrada:
$$\\ln\\left(\\frac{P_2}{P_1}\\right) = -\\frac{L_{\\text{vap}}}{R} \\left( \\frac{1}{T_2} - \\frac{1}{T_1} \\right)$$

### Definición de Entropía
Clausius introdujo el término en 1865 a partir de la integral cíclica de la desigualdad de Clausius:
$$\\oint \\frac{\\delta Q}{T} \\leq 0 \\implies dS \\equiv \\frac{\\delta Q_{\\text{rev}}}{T}$$`,
                  orbitRadius: 90,
                  orbitSpeed: 0.1,
                  color: "#ffc6ff"
                },
                {
                  title: "Thomas Andrews",
                  type: "moon",
                  notes: `# Thomas Andrews y el Descubrimiento del Punto Crítico

Thomas Andrews (1813-1885) fue un químico y físico irlandés que descubrió la existencia del punto crítico y la continuidad de los estados líquido y gaseoso.

### Experimentos de Licuación de $CO_2$
Andrews comprimió dióxido de carbono ($CO_2$) a diferentes presiones y temperaturas constantes, encontrando que a $31.1^\\circ\\text{C}$ la frontera de separación de fases líquida y gaseosa desaparecía por completo.
- **Continuidad del Estado**: Demostró que el líquido y el gas son extremos de una misma propiedad física continua de la materia.
- **Fluido Supercrítico**: Definió por primera vez este estado de alta densidad y baja viscosidad.`,
                  orbitRadius: 115,
                  orbitSpeed: -0.09,
                  color: "#ff70a6"
                },
                {
                  title: "van der Waals",
                  type: "moon",
                  notes: `# Johannes Diderik van der Waals y las Fuerzas Intermoleculares

J. D. van der Waals (1837-1923) fue un físico teórico holandés que formuló la primera ecuación de estado capaz de modelar de forma continua la transición de fase líquido-vapor.

### Ecuación de Estado de Van der Waals
Modificó la ley de los gases ideales agregando términos de fuerzas atractivas intermoleculares ($a$) y volumen propio excluido de las moléculas ($b$):
$$\\left(P + \\frac{an^2}{V^2}\\right)(V - nb) = nRT$$

### Ley de Estados Correspondientes
Demostró que al reescribir la presión, volumen y temperatura en función de sus valores en el punto crítico (variables reducidas $P_r, V_r, T_r$), todas las sustancias obedecen a una misma ecuación de comportamiento universal:
$$\\left(P_r + \\frac{3}{V_r^2}\\right)(3V_r - 1) = 8T_r$$

<div style="text-align: center; margin: 15px 0;">
  <img src="images/ciclo_carnot.png" alt="Ciclo de Carnot Diagrama P-V" style="max-width: 80%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);" />
  <p style="font-size: 10px; color: #a8afb8; margin-top: 5px;">Diagrama P-V del ciclo de Carnot, analizado por Clapeyron y Clausius para definir la escala de entropía.</p>
</div>`,
                  orbitRadius: 140,
                  orbitSpeed: 0.08,
                  color: "#70d6ff"
                }
              ]
            },
            {
              title: "Coeficientes Físicos",
              type: "planetoid",
              notes: `# Coeficientes del Estado y Relación entre Capacidades Caloríficas

Los coeficientes de dilatación y compresibilidad determinan de forma fenomenológica la respuesta de los sistemas a cambios térmicos y mecánicos.

### Compresibilidad Isotérmica ($\\kappa_T$)
$$\\kappa_T \\equiv -\\frac{1}{V} \\left(\\frac{\\partial V}{\\partial P}\\right)_T$$

### Dilatación Volumétrica ($\\alpha$)
$$\\alpha \\equiv \\frac{1}{V} \\left(\\frac{\\partial V}{\\partial T}\\right)_P$$

### Diferencia de Capacidades Caloríficas
$$C_p - C_v = \\frac{T V \\alpha^2}{\\kappa_T}$$
Garantiza matemáticamente que $C_p \\geq C_v$ para cualquier material estable.`,
              orbitRadius: 110,
              orbitSpeed: 0.04,
              color: "#edf2f4"
            }
          ]
        }
      ]
    }
  },
  {
    name: "Psicología Social y Relaciones Humanas",
    tasks: [
      "Analizar los sesgos y modelos de Atribución Causal",
      "Evaluar la obediencia en el Experimento de Milgram",
      "Estudiar la Teoría de Identidad Social en experimentos de Grupo Mínimo"
    ],
    sun: {
      title: "Psicología Social",
      type: "sun",
      notes: `# Psicología Social Científica (Nivel Universitario)

La psicología social es una disciplina científica que estudia la manera en que los pensamientos, sentimientos y comportamientos de los individuos son influidos por la presencia real, imaginada o implícita de otras personas. Utiliza el método experimental cuantitativo para desentrañar las fuerzas sociales que rigen las interacciones humanas y la cognición social.

### El Concepto de Situacionismo
Postulado principalmente por Kurt Lewin (padre de la psicología social experimental), la conducta humana ($C$) es una función interactiva del espacio vital individual o personalidad ($P$) y el ambiente o situación social ($A$):
$$C = f(P, A)$$
Este postulado desafía la tendencia instintiva de las personas a explicar los actos humanos apelando únicamente a rasgos internos de carácter o personalidad.`,
      color: "#ff00aa",
      children: [
        {
          title: "Cognición y Atribución",
          type: "planet",
          notes: `# Cognición Social y Modelos de Atribución Causal

La cognición social analiza cómo codificamos, almacenamos y procesamos la información sobre otras personas y situaciones sociales. La atribución causal es el proceso mediante el cual las personas interpretan las causas de las conductas propias y ajenas.

### La Metáfora del Científico Ingenuo
Propuesta por Fritz Heider (1958), sugiere que las personas actúan de forma analógica a científicos amateurs, formulando hipótesis causales constantes para predecir el entorno social y reducir la incertidumbre. Heider clasificó las atribuciones en dos categorías:
1. **Internas (Disposicionales)**: La causa de la conducta se atribuye a rasgos, motivos o habilidades de la persona.
2. **Externas (Situacionales)**: La causa se atribuye a circunstancias del entorno, presión de otros o suerte.`,
          orbitRadius: 130,
          orbitSpeed: 0.035,
          color: "#00f2fe",
          children: [
            {
              title: "Atribución de Heider",
              type: "planetoid",
              notes: `# La Teoría del Científico Ingenuo de Fritz Heider (1958)

Fritz Heider sentó las bases de las teorías de atribución moderna al proponer que los seres humanos necesitan atribuir causas estables a los comportamientos que perciben para poder hacer que el mundo social sea predecible y controlable.

### Fuerzas Personales vs. Ambientales
La atribución de una conducta se realiza evaluando la combinación de:
- **Capacidad**: Aptitud física e intelectual del actor para realizar el acto.
- **Intención**: Motivación consciente u objetivo del actor.
- **Dificultad de la tarea**: Dureza externa u obstáculos del ambiente.
- **Suerte**: Azar circunstancial incontrolable.

Q: ¿Cómo se equilibra la fuerza del actor con el ambiente?
A: Si la dificultad de la tarea es extremadamente alta y el actor tiene éxito, la inferencia de capacidad es mucho mayor (efecto de aumento). Si el ambiente facilita la tarea, la atribución de capacidad personal disminuye (efecto de descuento).`,
              orbitRadius: 75,
              orbitSpeed: -0.06,
              color: "#ff7b00",
              children: [
                {
                  title: "Inferencia Correspondiente",
                  type: "moon",
                  notes: `# Teoría de la Inferencia Correspondiente (Jones y Davis, 1965)

Explica bajo qué condiciones las personas deciden que una acción ajena corresponde directamente a una disposición o rasgo de carácter estable del actor.

### Los Tres Criterios de Evaluación
1. **Libre Elección**: Si la conducta fue forzada por coerción externa, la atribución disposicional se descarta.
2. **Deseabilidad Social**: Los actos que violan las expectativas y normas sociales (baja deseabilidad) revelan mucho más del carácter interno que los actos socialmente aprobados.
3. **Efectos No Comunes**: Comparando la alternativa elegida con las rechazadas, los resultados específicos únicos (efectos no comunes) revelan la intención particular del actor.`,
                  orbitRadius: 50,
                  orbitSpeed: 0.12,
                  color: "#e8c4ff",
                  children: [
                    {
                      title: "Deseabilidad Social",
                      type: "satellite",
                      notes: `# Deseabilidad Social e Inferencia de Rasgos

La deseabilidad social actúa como un filtro reductor de información disposicional.

### Comportamiento Normativo
Cuando una persona se comporta de acuerdo con la norma social esperada (ej. saludar educadamente), su conducta es explicada por la situación. No podemos inferir si la persona es genuinamente educada o si solo sigue el protocolo.

### Comportamiento Desviado
Si una persona insulta en público (baja deseabilidad), la conducta destaca. El observador realiza una inferencia correspondiente directa de personalidad agresiva, ignorando posibles disparadores del entorno.`,
                      orbitRadius: 26,
                      orbitSpeed: -0.25,
                      color: "#a8afb8"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: "Estudios de Influencia",
          type: "planet",
          notes: `# Experimentos Clásicos sobre Influencia Social y Obediencia

La influencia social estudia los cambios en el comportamiento, actitud u opiniones de un individuo bajo la presión explícita o implícita del entorno grupal o figuras de poder.

### El Conformismo y la Obediencia
- **Conformismo**: El sujeto se alinea con la mayoría de sus pares iguales por temor al aislamiento o deseo de veracidad.
- **Obediencia**: El sujeto responde a las órdenes jerárquicas directas de una autoridad percibida como legítima.`,
          orbitRadius: 210,
          orbitSpeed: 0.02,
          color: "#00b4d8",
          children: [
            {
              title: "Solomon Asch",
              type: "planetoid",
              notes: `# El Experimento de Solomon Asch sobre Conformismo Grupal (1951)

Diseñado para evaluar hasta qué punto la presión de un grupo unánime puede forzar a una persona a dar un veredicto falso en un juicio visual obvio.

### Diseño Experimental
Un participante real junto a 7 confederados cómplices debían comparar la longitud de una línea patrón con otras tres líneas. Los cómplices daban respuestas unánimemente incorrectas en 12 de los 18 ensayos.
- **Resultados**: El 75% de los participantes cedió al menos una vez al grupo.
- **Justificación**: Se identificaron la **influencia normativa** (deseo de evitar el rechazo grupal) y la **influencia informativa** (dudar de los propios sentidos).`,
              orbitRadius: 65,
              orbitSpeed: 0.08,
              color: "#3a86c8"
            },
            {
              title: "Stanley Milgram",
              type: "planetoid",
              notes: `# Obediencia a la Autoridad de Stanley Milgram (1963)

Estudio experimental que midió la disposición de ciudadanos comunes a infligir castigos físicos dolorosos (descargas eléctricas simuladas hasta 450V) a un alumno indefenso por órdenes de un experimentador científico.

### Metodología y Resultados
El maestro (participante real) administraba descargas crecientes ante errores de memoria del alumno (cómplice).
- El 65% de los participantes llegó a la descarga máxima de 450V ("Peligro: Descarga Severa").
- La cercanía física a la víctima y la contradicción de la autoridad reducían la obediencia.

<div style="text-align: center; margin: 15px 0;">
  <img src="images/influencia_social.png" alt="Experimento de Obediencia de Milgram" style="max-width: 80%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);" />
  <p style="font-size: 10px; color: #a8afb8; margin-top: 5px;">Esquema del experimento de obediencia a la autoridad de Stanley Milgram.</p>
</div>`,
              orbitRadius: 90,
              orbitSpeed: 0.07,
              color: "#4ea8de"
            },
            {
              title: "Prisión de Stanford",
              type: "planetoid",
              notes: `# Experimento de la Cárcel de Stanford (Zimbardo, 1971)

Zimbardo evaluó el poder de la asignación de roles sociales extremos (guardias vs prisioneros) en un entorno simulado desprovisto de personalidad previa.

### Resultados y Cancelación
Los guardias desarrollaron conductas sádicas deshumanizadoras. Los prisioneros presentaron brotes de llanto, estrés agudo y sumisión patológica. El estudio debió cancelarse de urgencia al sexto día.
- **Efecto Lucifer**: Cómo situaciones extremas moldean a personas comunes hacia la maldad.`,
              orbitRadius: 115,
              orbitSpeed: 0.06,
              color: "#8338ec"
            },
            {
              title: "Robbers Cave",
              type: "planetoid",
              notes: `# Experimento de Robbers Cave de Muzafer Sherif (1954)

Estudió el origen y reducción del conflicto intergrupal en niños divididos en un campamento de verano.
- **Fase de Conflicto**: La competencia directa por recursos limitados generó prejuicio, hostilidad y violencia intergrupal espontánea.
- **Fase de Resolución**: El contacto pasivo falló. Solo el establecimiento de **Metas Supraordenadas** (reparar el suministro de agua del campamento) redujo drásticamente el prejuicio intergrupal.`,
              orbitRadius: 140,
              orbitSpeed: 0.05,
              color: "#ff006e"
            },
            {
              title: "Disonancia de Festinger",
              type: "planetoid",
              notes: `# Teoría de la Disonancia Cognitiva (Leon Festinger, 1957)

Estado de tensión psicológica displacentera que surge cuando un individuo sostiene dos cogniciones contradictorias o su conducta no coincide con sus creencias.

### Experimento de $1 vs $20 (Festinger y Carlsmith, 1959)
Los sujetos debían realizar una tarea aburrida y luego mentir diciendo que fue divertida.
- Los pagados con $20 tenían justificación externa suficiente y no cambiaron de actitud.
- Los pagados con $1 experimentaron disonancia cognitiva y cambiaron su actitud real, autoconvenciéndose de que la tarea sí fue divertida para conciliar su moral con la mentira.`,
              orbitRadius: 165,
              orbitSpeed: 0.045,
              color: "#ffca3a"
            }
          ]
        },
        {
          title: "Identidad e Intergrupos",
          type: "planet",
          notes: `# Relaciones Intergrupales, Categorización e Identidad Social

Las dinámicas intergrupales describen los comportamientos y dinámicas que emergen cuando las personas interactúan como miembros de grupos (Endogrupo vs Exdogrupo).

### El Prejuicio Intergrupal
Surge de forma espontánea mediante el sesgo endogrupal, donde el cerebro categoriza a los individuos para estructurar la realidad social, favoreciendo sistemáticamente al propio colectivo para aumentar la autoestima.`,
          orbitRadius: 310,
          orbitSpeed: 0.015,
          color: "#90e0ef",
          children: [
            {
              title: "Teorías de Identidad",
              type: "planetoid",
              notes: `# Teorías del Conflicto Intergrupal e Identidad Social

Las explicaciones empíricas e históricas de la formación de prejuicios, discriminación y resolución de disputas entre grupos humanos fueron deducidas por cinco investigadores eminentes de la psicología social.`,
              orbitRadius: 85,
              orbitSpeed: -0.06,
              color: "#a2d2ff",
              children: [
                {
                  title: "Henri Tajfel",
                  type: "moon",
                  notes: `# Henri Tajfel y los Experimentos del Grupo Mínimo

Henri Tajfel (1919-1982) fue un psicólogo social británico de origen polaco, célebre por formular la Teoría de la Identidad Social.

### Experimento del Grupo Mínimo (1971)
Tajfel dividió a escolares utilizando criterios sin valor (preferencia de cuadros de Klee o Kandinsky). Descubrió que el mero hecho de etiquetarlos activó el favoritismo endogrupal: los estudiantes elegían matrices de **Máxima Diferencia** para perjudicar al exdogrupo en el reparto de dinero, incluso si implicaba ganar menos en valor absoluto.

### Proceso de Identificación
1. **Categorización**: Clasificar a las personas en grupos.
2. **Identificación**: Adoptar la identidad de ese grupo.
3. **Comparación**: Comparar sesgadamente al endogrupo para lograr estatus positivo.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.15,
                  color: "#ffc6ff"
                },
                {
                  title: "Muzafer Sherif",
                  type: "moon",
                  notes: `# Muzafer Sherif y el Conflicto del Campamento de Verano

Muzafer Sherif (1906-1988) fue uno de los pioneros de la psicología social experimental.

### Experimento de Robbers Cave (1954)
Dividió a niños sanos en dos facciones aisladas ("Águilas" y "Cascabeles") en un campamento de verano.
- **Teoría del Conflicto Realista**: Demostró que el prejuicio y hostilidad mutuos surgen de forma espontánea al competir por recursos físicos reales.
- **Metas Supraordenadas**: El conflicto solo pudo resolverse forzando a ambos bandos a colaborar para reparar una tubería rota, estableciendo un objetivo vital común inalcanzable de forma individual.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff"
                },
                {
                  title: "Leon Festinger",
                  type: "moon",
                  notes: `# Leon Festinger y la Disonancia Cognitiva

Leon Festinger (1919-1989) fue un psicólogo social estadounidense que revolucionó el estudio del cambio de actitudes.

### Teoría de la Disonancia Cognitiva (1957)
Postuló que sostener dos creencias contradictorias o realizar un acto opuesto a las convicciones genera una tensión psicológica insoportable que obliga a modificar la actitud interna.
- **Teoría de Comparación Social**: Propuso que las personas evalúan sus propias opiniones y habilidades comparándose sistemáticamente con otros, buscando validar su autoconcepto.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.1,
                  color: "#ffc6ff"
                },
                {
                  title: "Stanley Milgram",
                  type: "moon",
                  notes: `# Stanley Milgram y el Estado Agéntico

Stanley Milgram (1933-1984) analizó la influencia destructiva de las figuras de autoridad legítimas.

### Teoría del Estado Agéntico
Explicó las altísimas tasas de obediencia (65% administrando descargas letales) argumentando que el participante experimenta un cambio de estado cognitivo: pasa del **estado autónomo** (donde se responsabiliza moralmente de sus actos) al **estado agéntico** (donde se define como un instrumento que ejecuta directrices externas).

### El Experimento del Mundo Pequeño
Aportó las bases sociométricas de la teoría de los "seis grados de separación" en redes humanas.`,
                  orbitRadius: 115,
                  orbitSpeed: -0.09,
                  color: "#ff70a6"
                },
                {
                  title: "Philip Zimbardo",
                  type: "moon",
                  notes: `# Philip Zimbardo y el Efecto Lucifer

Philip Zimbardo (1933-2024) fue un psicólogo estadounidense, famoso por el Experimento de la Prisión de Stanford (1971).

### Desindividualización y Situacionismo
Demostró que al otorgar uniformes, anonimato y roles de poder arbitrarios a personas sanas, estas cometen abusos sádicos de forma sistemática.
- **El Efecto Lucifer**: Analizó el comportamiento sádico en la prisión iraquí de Abu Ghraib, concluyendo que la maldad surge de las variables situacionales e institucionales extremas, y no únicamente de personalidades perversas o psicopáticas.`,
                  orbitRadius: 140,
                  orbitSpeed: 0.08,
                  color: "#70d6ff"
                }
              ]
            },
            {
              title: "Sesgos de Atribución",
              type: "planetoid",
              notes: `# Sesgos y Distorsiones de Atribución Causal

Los sesgos cognitivos asimétricos desvían la atribución racional de causas.

### Error Fundamental de Atribución
Sobrevalorar factores disposicionales internos al explicar la conducta errónea de otros, ignorando presiones situacionales del contexto.

### Sesgo de Autoservicio
- Éxitos propios: Atribución a capacidad interna ("Soy brillante").
- Fracasos propios: Atribución a causas externas ("La tarea era injusta").`,
              orbitRadius: 110,
              orbitSpeed: 0.04,
              color: "#edf2f4"
            }
          ]
        }
      ]
    }
  },
  {
    name: "Historia del Arte Contemporáneo",
    tasks: [
      "Estudiar la evolución de las Vanguardias del siglo XX",
      "Analizar la desmaterialización del objeto en el Dadaísmo",
      "Evaluar la semiótica en el Conceptualismo y Minimalismo"
    ],
    sun: {
      title: "Arte Contemporáneo",
      type: "sun",
      notes: `# Historia del Arte Contemporáneo (Nivel Universitario)

La historia del arte contemporáneo abarca las rupturas conceptuales, estéticas y filosóficas iniciadas a finales del siglo XIX y desarrolladas a lo largo del siglo XX y XXI. Se caracteriza por cuestionar la definición misma del objeto artístico, transitando desde la representación mimética de la realidad hacia la abstracción pura, la desmaterialización y la primacía del concepto sobre la técnica formal.

### Del Objeto de Culto al Concepto
Desde el Renacimiento hasta el Academicismo decimonónico, el valor del arte residía en la maestría técnica y la mímesis de la naturaleza. El advenimiento de la fotografía liberó a la pintura de la función documental. Las vanguardias artísticas (los *ismos*) redefinieron el lienzo como un campo autónomo de expresión formal y debate filosófico, pavimentando el camino para el fin de la manualidad en el arte.`,
      color: "#ffd600",
      children: [
        {
          title: "Fauvismo y Color",
          type: "planet",
          notes: `# Fauvismo: La Liberación Expresiva del Color

El fauvismo (1905-1908) representó la primera ruptura radical con la mimesis cromática tradicional de la naturaleza.

### Autonomía del Color
El color se libera del dibujo y del modelado tridimensional. El lienzo fauvista se compone de colores puros vibrantes aplicados de forma intuitiva sobre el soporte bidimensional, buscando transmitir la emoción directa por encima de la luz real.`,
          orbitRadius: 130,
          orbitSpeed: 0.035,
          color: "#00f2fe",
          children: [
            {
              title: "Salón de Otoño 1905",
              type: "planetoid",
              notes: `# La Exposición del Salón de Otoño de 1905

El Salón de Otoño de 1905 en París fue el catalizador del fauvismo. Las obras de Henri Matisse, André Derain y Maurice de Vlaminck causaron un escándalo estético por la intensidad brutal de su paleta cromática.

### La Crítica de Louis Vauxcelles
Al ver una escultura clásica rodeada por las telas de color salvaje de estos autores, exclamó: *"Donatello entre las fieras"* (fauves), bautizando de forma satírica el movimiento. Las fieras del color habían nacido.`,
              orbitRadius: 75,
              orbitSpeed: -0.06,
              color: "#ff7b00",
              children: [
                {
                  title: "Matisse y el Color",
                  type: "moon",
                  notes: `# Henri Matisse y la Armonía del Color Puro

Matisse buscó una pintura de equilibrio, pureza y tranquilidad, libre de temáticas deprimentes, utilizando el color como una fuerza autónoma decorativa.

### Estilo Formal
Rechazaba el claroscuro tradicional por ensuciar la luz del color. Construía el volumen del cuadro yuxtaponiendo planos complementarios saturados, con líneas de contorno gruesas y expresivas.`,
                  orbitRadius: 50,
                  orbitSpeed: 0.12,
                  color: "#e8c4ff",
                  children: [
                    {
                      title: "La Alegría de Vivir",
                      type: "satellite",
                      notes: `# Análisis de La alegría de vivir de Henri Matisse (1906)

Matisse pintó esta colosal tela pastoral donde figuras humanas desnudas se funden en una danza cromática libre.
- **Ruptura de Luces**: No hay una fuente de luz coherente ni sombras. El modelado se logra mediante el contorno de color y las transiciones tonales.
- **Perspectiva**: Se anula el punto de fuga renacentista, aplanando la profundidad mediante curvas decorativas abstractas.`,
                      orbitRadius: 26,
                      orbitSpeed: -0.25,
                      color: "#a8afb8"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: "Vanguardias Modernas",
          type: "planet",
          notes: `# Vanguardias Históricas del Siglo XX

Movimientos de ruptura que dinamitaron la perspectiva tradicional e integraron la subjetividad emocional en el soporte plástico.

### La Fragmentación y la Expresión
Desde la angustia del expresionismo alemán hasta la fragmentación geométrica y los collages del cubismo analítico y sintético, el arte dejó de ser una ventana al mundo físico para convertirse en un objeto matérico autónomo.`,
          orbitRadius: 210,
          orbitSpeed: 0.02,
          color: "#00b4d8",
          children: [
            {
              title: "Die Brücke",
              type: "planetoid",
              notes: `# Expresionismo Alemán: Die Brücke (El Puente)

Fundado en Dresde en 1905, buscaba tender un puente hacia el arte libre del futuro.
- **Estilo**: Formas angulosas agresivas, colores disonantes ácidos (verdes, morados) y temáticas de alienación urbana, prostitución y miseria existencial en la ciudad industrializada.
- **Técnica**: Grabado en madera (xilografía), forzando contornos rústicos toscos de gran fuerza expresiva.`,
              orbitRadius: 65,
              orbitSpeed: 0.08,
              color: "#3a86c8",
              children: [
                {
                  title: "Ernst Ludwig Kirchner",
                  type: "moon",
                  notes: `# Ernst Ludwig Kirchner y la Tensión de la Urbe

Ernst Ludwig Kirchner (1880-1938) fue uno de los fundadores del grupo Die Brücke, catalizador del expresionismo alemán.

### Estilo y Temática
Kirchner retrató la aceleración, alienación y vitalidad cruda de la vida urbana moderna, especialmente en el Berlín de antes de la Primera Guerra Mundial. Su estilo destaca por:
- **Deformación Formal**: Siluetas extremadamente alargadas, rostros angulosos y picudos que semejan máscaras talladas, y perspectivas distorsionadas.
- **Colores Ácidos**: Paletas disonantes no realistas (verdes enfermizos, violetas, amarillos chillones) que expresan tensiones psicológicas internas.
- **Líneas Agresivas**: Contornos marcados y duros inspirados en la técnica de la xilografía (grabado en madera), que le otorgaban una vibración nerviosa a sus lienzos.

### Obra Destacada: *Calle con buscona de rojo* (1914)
En esta obra, Kirchner plasmó la prostitución y el desapego en las avenidas berlinesas, donde hombres de negro y mujeres de rostros afilados andan como autómatas sin mirarse, en un entorno de ángulos claustrofóbicos y colores febriles.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.12,
                  color: "#ffc6ff",
                  attachments: [
                    {
                      name: "Ernst Ludwig Kirchner.png",
                      type: "image/png",
                      data: "images/kirchner.png"
                    }
                  ]
                },
                {
                  title: "Emil Nolde",
                  type: "moon",
                  notes: `# Emil Nolde y la Expresión Mística del Color

Emil Nolde (Hans Emil Hansen, 1867-1956) formó parte brevemente de Die Brücke, destacando por su uso profundamente instintivo y emocional de la materia pictórica.

### La Primacía del Color
Para Nolde, los colores tenían vida propia y poseían cualidades místicas y espirituales:
- **Pintura Directa**: Aplicaba gruesas capas de óleo directamente sobre el soporte, a menudo extendiendo la pintura con los dedos o espátulas sin dibujo previo preciso.
- **Temáticas Religiosas y Grotescas**: A diferencia de Kirchner, Nolde se refugió en la naturaleza indómita (paisajes marinos dramáticos) y en visiones bíblicas distorsionadas por un fervor místico casi primitivo.
- **Máscaras y Exotismo**: Influenciado por visitas a museos etnográficos y viajes por Oceanía, Nolde pintó naturalezas muertas con máscaras tribales que revelaban impulsos psicológicos ocultos tras la fachada social.

### Obra Destacada: *La danza alrededor del becerro de oro* (1910)
Representa una celebración extática donde figuras desnudas bailan frenéticamente con movimientos primitivos, plasmadas con un amarillo y rojo incandescentes en un torbellino de pinceladas caóticas.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff",
                  attachments: [
                    {
                      name: "Emil Nolde.png",
                      type: "image/png",
                      data: "images/nolde.png"
                    }
                  ]
                },
                {
                  title: "Karl Schmidt-Rottluff",
                  type: "moon",
                  notes: `# Karl Schmidt-Rottluff y el Vigor Monumental

Karl Schmidt-Rottluff (1884-1976) fue quien propuso el nombre "Die Brücke" para el movimiento, inspirándose en un pasaje de Nietzsche sobre el puente hacia el superhombre.

### Estilo Formal y Primitivismo
Su obra se caracteriza por una monumentalidad vigorosa y un fuerte sentido de la síntesis geométrica:
- **Planitud y Contraste**: Redujo las formas a planos amplios y macizos de colores saturados y puros. Evitaba los detalles minuciosos para centrarse en la energía estructural del lienzo.
- **Xilografía Monumental**: Fue un grabador incansable. Sus xilografías presentan cortes directos y toscos con grandes contrastes de blanco y negro, lo que influyó fuertemente en su posterior estilo pictórico.
- **Arte Africano**: Su interés por las tallas de madera de África y Oceanía se tradujo en una simplificación radical y rígida de los rasgos faciales y las anatomías en sus paisajes y retratos.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.09,
                  color: "#70d6ff",
                  attachments: [
                    {
                      name: "Karl Schmidt-Rottluff.png",
                      type: "image/png",
                      data: "images/schmidt_rottluff.png"
                    }
                  ]
                }
              ]
            },
            {
              title: "Cubismo Sintético",
              type: "planetoid",
              notes: `# Cubismo Sintético y Colores (Picasso y Braque)

Segunda etapa del movimiento cubista iniciada en 1912, caracterizada por la síntesis de formas legibles y coloridas y la inserción de la realidad directa.
- **Collage**: Utilización de objetos de desecho cotidianos (hules de cocina, cajetillas de tabaco, recortes de periódicos) pegados directamente en el soporte del lienzo, dinamitando la manualidad ilusionista pictórica tradicional de imitar texturas.`,
              orbitRadius: 90,
              orbitSpeed: 0.07,
              color: "#4ea8de",
              children: [
                {
                  title: "Pablo Picasso (Sintético)",
                  type: "moon",
                  notes: `# Pablo Picasso y el Retorno del Objeto mediante Signos

La fase sintética del cubismo (1912-1919) fue iniciada por Picasso al percatarse de que el cubismo analítico había fragmentado tanto el espacio que se aproximaba peligrosamente a la abstracción pura, perdiendo legibilidad.

### El Concepto Sintético
En lugar de deconstruir un objeto real visto desde múltiples ángulos, el artista ahora sintetiza el objeto combinando diferentes texturas, planos planos y signos visuales:
- **La Invención del Collage**: Picasso pegó un trozo de hule que imitaba rejilla de silla de mimbre y enmarcó el lienzo con una cuerda real en *Naturaleza muerta con silla de rejilla* (1912). Esto redefinió el lienzo: ya no era una ventana ilusionista que imitaba la realidad, sino un plano matérico que contenía la realidad misma.
- **Significación Plana**: Formas recortadas de papel periódico, partituras o cartones se convierten en equivalentes de guitarras, vasos o botellas mediante la simple colocación de sus siluetas esenciales.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.12,
                  color: "#ffc6ff",
                  attachments: [
                    {
                      name: "Pablo Picasso.png",
                      type: "image/png",
                      data: "images/picasso.png"
                    }
                  ]
                },
                {
                  title: "Georges Braque (Sintético)",
                  type: "moon",
                  notes: `# Georges Braque y la Invención del Papier Collé

Georges Braque desempeñó un papel fundamental en la transición al Cubismo Sintético al introducir elementos materiales tridimensionales y de diseño gráfico en el lienzo plano.

### Aportes Técnicos
- **Papier Collé (Papel Pegado)**: Braque compró un rollo de papel pintado que imitaba vetas de madera de pino y lo pegó directamente en una composición al carboncillo, creando *Plato de fruta y vaso* (1912). Esta técnica separaba por primera vez el color (el papel pegado) del dibujo (las líneas de carboncillo).
- **Tipografías y Texturas**: Mezclaba arena, aserrín y yeso con el óleo para dar relieve táctil al cuadro. Además, pintaba letras de molde con plantillas industriales para enfatizar que la pintura era un objeto plano bidimensional autónomo.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff",
                  attachments: [
                    {
                      name: "Georges Braque.png",
                      type: "image/png",
                      data: "images/braque.png"
                    }
                  ]
                },
                {
                  title: "Juan Gris (Sintético)",
                  type: "moon",
                  notes: `# Juan Gris y el Cubismo Arquitectónico y Deductivo

Juan Gris se convirtió en el gran maestro del Cubismo Sintético gracias a su aproximación racional, geométrica e impecable a la estructura pictórica.

### Método Deductivo
Gris explicaba su proceso diciendo: *"Yo voy de lo general a lo particular; de la geometría al objeto"*. Su pintura se construye mediante:
- **La Rejilla Formal**: Primero disponía una rígida retícula geométrica plana sobre el lienzo, dividiendo el espacio en secciones armónicas. Luego, deducía los objetos (botellas, guitarras, naipes) integrándolos en dicha retícula.
- **Colores Planos y Brillantes**: A diferencia del colorido monocromático o apagado de la fase analítica, Gris utilizó planos de colores vivos muy delimitados y precisos.
- **Collage de Precisión**: Sus collages introducían elementos como fragmentos de espejos reales y grabados de periódicos recortados con exactitud de cirujano, logrando un equilibrio plástico perfecto entre abstracción y realidad.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.09,
                  color: "#70d6ff",
                  attachments: [
                    {
                      name: "Juan Gris.png",
                      type: "image/png",
                      data: "images/gris.png"
                    }
                  ]
                }
              ]
            },
            {
              title: "Dadaísmo y Anti-Arte",
              type: "planetoid",
              notes: `# Dadaísmo y la Reinvención del Concepto de Arte (1916)

Nació en Zurich como reacción nihilista intelectual contra el absurdo destructivo de la Primera Guerra Mundial.
- **Readymade**: Marcel Duchamp introduce objetos industriales prefabricados firmados y desprovistos de función utilitaria (ej. "La Fuente") para demostrar que la obra de arte reside en la selección de la idea, no en el hacer manual.`,
              orbitRadius: 115,
              orbitSpeed: 0.06,
              color: "#8338ec",
              children: [
                {
                  title: "Marcel Duchamp",
                  type: "moon",
                  notes: `# Marcel Duchamp y la Destrucción de la Pintura Retinal

Marcel Duchamp (1887-1968) es considerado el artista más influyente del siglo XX por dinamitar el concepto tradicional de la práctica artística y fundar el arte conceptual.

### La Crítica al "Arte Retinal"
Duchamp despreciaba el arte que apelaba únicamente al placer visual del ojo ("retinal"). Buscaba que el arte volviera a estar al servicio de la mente y las ideas:
- **El Readymade**: Seleccionó objetos de producción industrial masiva, los descontextualizó de su función práctica y los elevó a la categoría de arte mediante el simple acto de su elección y firma (ej: *Rueda de bicicleta sobre taburete*, 1913; *La Fuente*, un urinario firmado como "R. Mutt" en 1917).
- **El Papel del Espectador**: Duchamp argumentó que el acto creador no es realizado únicamente por el artista; es el espectador quien completa la obra al descodificar su significado y contexto.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.12,
                  color: "#ffc6ff",
                  attachments: [
                    {
                      name: "Marcel Duchamp.png",
                      type: "image/png",
                      data: "images/duchamp.png"
                    }
                  ]
                },
                {
                  title: "Hannah Höch",
                  type: "moon",
                  notes: `# Hannah Höch y el Fotomontaje Político Dadaísta

Hannah Höch (1889-1978) fue la única mujer miembro del influyente y politizado grupo de Dadaístas de Berlín, pionera absoluta de la técnica del fotomontaje.

### La Técnica y su Crítica Social
Höch recortaba imágenes de periódicos de moda, retratos de políticos de Weimar y recortes industriales para reensamblarlos en caóticas pero precisas composiciones:
- **La Nueva Mujer**: Sus montajes cuestionaban los roles tradicionales de género y la imagen comercializada de la mujer moderna de posguerra, yuxtaponiendo rostros femeninos con cuerpos de muñecas de porcelana o engranajes mecánicos.
- **Sátira de Weimar**: Denunciaba el militarismo alemán y el fracaso de la socialdemocracia burguesa en composiciones plagadas de ironía y yuxtaposición satírica de poder militar y desorden civil.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff",
                  attachments: [
                    {
                      name: "Hannah Höch.png",
                      type: "image/png",
                      data: "images/hoch.png"
                    }
                  ]
                },
                {
                  title: "Tristan Tzara",
                  type: "moon",
                  notes: `# Tristan Tzara y la Poesía del Azar Dadaísta

Tristan Tzara (Samuel Rosenstock, 1896-1963) fue un escritor y poeta rumano, fundador y principal redactor de los manifiestos del dadaísmo en el Cabaret Voltaire de Zúrich.

### Manifiestos y Anti-Literatura
Tzara promovió la rebelión literaria contra la lógica racionalista del lenguaje burgués, a la que culpaba de legitimar las masacres de la Primera Guerra Mundial:
- **El Poema de Azar**: En su manifiesto de 1920, Tzara describió cómo hacer un poema dadaísta: recortar palabras de un artículo de periódico, meterlas en una bolsa, sacarlas una a una en orden aleatorio y copiarlas. El resultado revelaba un "escritor de una sensibilidad infinita, aunque incomprendido por el vulgo".
- **Provocación Escénica**: Organizaba lecturas poéticas simultáneas y conciertos de ruido cacofónico diseñados para escandalizar a las audiencias burguesas y destruir el pedestal sacralizado del arte literario tradicional.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.09,
                  color: "#70d6ff",
                  attachments: [
                    {
                      name: "Tristan Tzara.png",
                      type: "image/png",
                      data: "images/tzara.png"
                    }
                  ]
                }
              ]
            },
            {
              title: "Surrealismo e Inconsciente",
              type: "planetoid",
              notes: `# Surrealismo y la Pintura del Onirismo (1924)

Movimiento literario y plástico que plasmó el inconsciente y las teorías freudianas de los sueños.
- **Técnicas**: Automatismo psíquico puro, cadáveres exquisitos y la pintura de realismo fotográfico de escenas oníricas imposibles (Dalí, Tanguy).`,
              orbitRadius: 140,
              orbitSpeed: 0.05,
              color: "#ff006e",
              children: [
                {
                  title: "Salvador Dalí",
                  type: "moon",
                  notes: `# Salvador Dalí y el Método Paranoico-Crítico

Salvador Dalí (1904-1989) llevó la pintura surrealista a su cúspide ilusionista mediante una técnica de dibujo académico hiperrealista aplicada a contenidos irracionales.

### El Método Paranoico-Crítico
Dalí definió su método como un *"método espontáneo de conocimiento irracional basado en la objetivación crítica y sistemática de asociaciones y delirios delirantes"*:
- **Imágenes Dobles**: Capacidad de pintar figuras que, al ser observadas, revelan de forma simultánea otra imagen totalmente distinta sin alterar sus trazos físicos (ej: un busto de Voltaire formado por dos monjas francesas).
- **Ilusionismo Onírico**: Utilizaba un pincel fino y técnica de miniatura académica para pintar paisajes de su Cataluña natal invadidos por relojes blandos, hormigas devoradoras y cuerpos sostenidos por muletas, dotando a los sueños de una inquietante verosimilitud fotográfica.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.12,
                  color: "#ffc6ff",
                  attachments: [
                    {
                      name: "Salvador Dalí.png",
                      type: "image/png",
                      data: "images/dali.png"
                    }
                  ]
                },
                {
                  title: "René Magritte",
                  type: "moon",
                  notes: `# René Magritte y la Traición de las Imágenes

René Magritte (1898-1967) fue un pintor belga que exploró los límites del lenguaje visual, la semiótica de la pintura y el extrañamiento de la realidad cotidiana.

### Estilo Conceptual y Semiótico
A diferencia del ilusionismo morboso o de pesadilla de Dalí, Magritte trabajaba como un filósofo visual, pintando con un estilo plano, casi publicitario y sobrio:
- **La Traición de las Imágenes** (*Ceci n'est pas une pipe*, 1929): Al pintar una pipa con esa frase debajo, Magritte demostró de forma contundente que la imagen de una pipa no es una pipa real (uno no puede rellenarla de tabaco ni fumarla), cuestionando la mímesis tradicional.
- **Yuxtaposiciones Imposibles**: Colocaba objetos ordinarios (manzanas, sombreros de copa, rocas gigantes) en contextos totalmente incompatibles (una roca flotando en el cielo, o una manzana verde gigante ocupando toda una habitación), forzando al espectador a cuestionar la lógica del mundo que le rodea.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff",
                  attachments: [
                    {
                      name: "René Magritte.png",
                      type: "image/png",
                      data: "images/magritte.png"
                    }
                  ]
                },
                {
                  title: "Joan Miró",
                  type: "moon",
                  notes: `# Joan Miró y la Abstracción Biomórfica

Joan Miró (1893-1983) representó la vertiente del Surrealismo basada en el automatismo psíquico puro y la deconstrucción infantil y libre de la pintura tradicional.

### El Asesinato de la Pintura
Miró declaró su deseo de "asesinar la pintura", refiriéndose a destruir el ilusionismo figurativo de las bellas artes académicas burguesas:
- **Automatismo Orgánico**: Iniciaba sus cuadros haciendo manchas fortuitas sobre el lienzo y dejando que su mano trazara líneas rápidas de forma subconsciente, liberando formas biomórficas que semejaban amebas, ojos y extremidades flotantes.
- **Alfabeto de Signos**: Creó un lenguaje caligráfico de signos poéticos recurrentes: estrellas de ocho puntas, líneas cruzadas representando constelaciones, lunas crecientes y escaleras de mano que simbolizaban la huida de la realidad hacia el cosmos.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.09,
                  color: "#70d6ff",
                  attachments: [
                    {
                      name: "Joan Miró.png",
                      type: "image/png",
                      data: "images/miro.png"
                    }
                  ]
                }
              ]
            },
            {
              title: "Action Painting",
              type: "planetoid",
              notes: `# Expresionismo Abstracto: Action Painting (Jackson Pollock)

Movimiento de posguerra estadounidense que trasladó el foco artístico de París a Nueva York.
- **Action Painting**: El lienzo deja de ser un espacio representativo y pasa a ser una "arena de acción". Pollock utiliza el goteo y salpicadura (*dripping*) de pintura industrial, registrando el movimiento físico de su cuerpo en el espacio real.`,
              orbitRadius: 165,
              orbitSpeed: 0.045,
              color: "#ffca3a",
              children: [
                {
                  title: "Jackson Pollock",
                  type: "moon",
                  notes: `# Jackson Pollock y el Lienzo como Arena de Acción

Jackson Pollock (1912-1956) fue el líder del Expresionismo Abstracto americano y creador del Action Painting.

### La Técnica del Dripping (Goteo)
Pollock abandonó el caballete, los pinceles y la paleta tradicional:
- **El Lienzo en el Suelo**: Extendía grandes rollos de lienzo crudo directamente en el suelo de su estudio, lo que le permitía caminar alrededor y literalmente "estar dentro" de la pintura.
- **Pintura Industrial**: Utilizaba lacas y esmaltes sintéticos líquidos de secado rápido, dejándolos gotear y salpicar sobre el lienzo mediante palos, espátulas o latas perforadas. Su pintura registraba el movimiento y la energía física de todo su cuerpo en el espacio.
- **Composición All-Over**: Sus obras carecían de un punto focal o jerarquía. El trazo se extendía de forma uniforme hasta los bordes, disolviendo la dualidad tradicional de fondo y figura.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.12,
                  color: "#ffc6ff",
                  attachments: [
                    {
                      name: "Jackson Pollock.png",
                      type: "image/png",
                      data: "images/pollock.png"
                    }
                  ]
                },
                {
                  title: "Willem de Kooning",
                  type: "moon",
                  notes: `# Willem de Kooning y la Figuración Gestual Agresiva

Willem de Kooning (1904-1997) fue un pintor de origen holandés que representó la vertiente gestual y figurativa del expresionismo abstracto estadounidense.

### La Fusión de Abstracción y Figurativo
A diferencia de Pollock, de Kooning nunca abandonó del todo la figura humana:
- **Serie de Mujeres (Women)**: En la década de 1950, pintó retratos de mujeres con pinceladas violentas, colores estridentes y anatomías distorsionadas de forma agresiva y colosal, con sonrisas desmesuradas sacadas de anuncios publicitarios.
- **El Proceso Acumulativo**: Raspaba y pintaba la superficie del lienzo continuamente durante meses. El cuadro final era una acumulación de capas de pintura que revelaban la lucha del artista con la materia pictórica. Sentenció que *"la carne es la razón por la cual se inventó la pintura al óleo"*.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff",
                  attachments: [
                    {
                      name: "Willem de Kooning.png",
                      type: "image/png",
                      data: "images/de_kooning.png"
                    }
                  ]
                },
                {
                  title: "Franz Kline",
                  type: "moon",
                  notes: `# Franz Kline y la Fuerza del Trazo Monumental

Franz Kline (1910-1962) destacó en el expresionismo abstracto por sus imponentes composiciones monocromáticas de gran fuerza arquitectónica.

### Estilo y Tensión Espacial
Kline es famoso por sus lienzos pintados exclusivamente con grandes trazos negros de pintura industrial sobre fondos blancos:
- **Estructura Caligráfica**: Sus trazos recuerdan a caracteres de caligrafía oriental amplificados a escala monumental, transmitiendo una sensación de andamiajes, puentes e infraestructuras industriales de hierro.
- **Tensión Blanco-Negro**: Insistía en que el color blanco de fondo no era espacio vacío o negativo, sino pintura activa que interactuaba y colisionaba con los trazos negros en los bordes, generando una fuerte tensión dinámica en la superficie.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.09,
                  color: "#70d6ff",
                  attachments: [
                    {
                      name: "Franz Kline.png",
                      type: "image/png",
                      data: "images/kline.png"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: "Vanguardias y Cubismo",
          type: "planet",
          notes: `# Deconstrucción Formal de las Vanguardias del Siglo XX

El cubismo deconstruyó el espacio plano tridimensional dinamitando las nociones estáticas de la perspectiva. Las figuras de este movimiento redefinieron los lenguajes estéticos.`,
          orbitRadius: 310,
          orbitSpeed: 0.015,
          color: "#90e0ef",
          children: [
            {
              title: "Cubismo Analítico",
              type: "planetoid",
              notes: `# Exponentes Máximos del Cubismo Analítico y su Fragmentación

El cubismo analítico (1909-1912) fragmentó el espacio real en múltiples facetas y ángulos de visión simultáneos. Se presenta la investigación formal realizada por los cinco mayores representantes de esta vanguardia histórica.`,
              orbitRadius: 85,
              orbitSpeed: -0.06,
              color: "#a2d2ff",
              children: [
                {
                  title: "Pablo Picasso",
                  type: "moon",
                  notes: `# Pablo Picasso y el Origen de la Deconstrucción

Pablo Picasso (1881-1973) fue un pintor español, creador fundamental del cubismo y una de las figuras más determinantes de la modernidad.

### Las Señoritas de Avignon (1907)
Este lienzo inauguró el cubismo:
- **Aniquilación del Punto de Fuga**: Los rostros angulados y el bodegón del primer plano se superponen en planos planos cortantes que empujan hacia la superficie plana bidimensional.
- **Primitivismo**: Picasso deconstruyó la anatomía inspirándose en el esquematismo geométrico de las máscaras talladas del África Subsahariana estudiadas en el Trocadero.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.15,
                  color: "#ffc6ff"
                },
                {
                  title: "Georges Braque",
                  type: "moon",
                  notes: `# Georges Braque y la Textura Cubista

Georges Braque (1882-1963) co-fundó el cubismo junto a Picasso, colaborando de manera tan estrecha que a menudo sus lienzos analíticos de 1910 eran difíciles de distinguir.

### Innovaciones Estructurales
- **Tipografía e Insignias**: Braque fue el primero en pintar plantillas de letras de imprenta tipográficas y números en el lienzo, re-enfatizando el aplanamiento bidimensional.
- **Papiers Collés**: Introdujo el pegado directo de tiras de papel pintado imitando madera (*trompe l'oeil*) para explorar la textura matérica real del cuadro.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff"
                },
                {
                  title: "Juan Gris",
                  type: "moon",
                  notes: `# Juan Gris y el Cubismo Matemático

Juan Gris (José Victoriano González-Pérez, 1887-1927) fue un pintor español, clave en la consolidación del cubismo sintético.

### Método Estructural y Lógico
A diferencia de la intuición de Picasso y Braque, Gris teorizó un cubismo racional basado en proporciones matemáticas exactas y secciones áureas:
- **Retrato de Picasso (1912)**: Estructura la figura del maestro dividiendo el fondo en una rejilla geométrica cristalina regular de ocres, azules y grises.
- **El Collage de Precisión**: Introdujo espejos y fragmentos grabados con gran pulcritud arquitectónica.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.1,
                  color: "#ffc6ff"
                },
                {
                  title: "Fernand Léger",
                  type: "moon",
                  notes: `# Fernand Léger y la Estética Mecánica

Fernand Léger (1881-1955) fue un pintor francés que adaptó la fragmentación cubista a la iconografía de la era de la máquina industrial.

### Tubismo y Formas Metálicas
- **Desnudos en el bosque (1910)**: Léger fragmentó los árboles y los cuerpos humanos en cilindros y formas tubulares brillantes, lo que le valió el apodo despectivo de "Tubismo".
- **Dinamismo Urbano**: Celebraba el ritmo de la urbe moderna incorporando contrastes de colores puros y formas que imitaban andamiajes, engranajes y hélices metálicas.`,
                  orbitRadius: 115,
                  orbitSpeed: -0.09,
                  color: "#ff70a6"
                },
                {
                  title: "Robert Delaunay",
                  type: "moon",
                  notes: `# Robert Delaunay y el Cubismo Órfico (Orfismo)

Robert Delaunay (1885-1941) expandió el cubismo incorporando la teoría de los colores de Chevreul y las transiciones hacia la abstracción pura.

### El Contraste Simultáneo
- **Simultaneous Windows (1912)**: Delaunay descompuso la luz y las formas urbanas (como la torre Eiffel) en planos puros de color transparente prismático que generaban dinamismo espacial mediante el contraste de colores complementarios.
- **Orfismo**: Término acuñado por Guillaume Apollinaire al describir su pintura como una forma de poesía cromática musical abstracta.

<div style="text-align: center; margin: 15px 0;">
  <img src="images/timeline_arte.png" alt="Línea de Tiempo del Arte Moderno" style="max-width: 80%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);" />
  <p style="font-size: 10px; color: #a8afb8; margin-top: 5px;">Cronología de rupturas estilísticas y evolución de las vanguardias contemporáneas.</p>
</div>`,
                  orbitRadius: 140,
                  orbitSpeed: 0.08,
                  color: "#70d6ff"
                }
              ]
            },
            {
              title: "Suprematismo de Malevich",
              type: "planetoid",
              notes: `# Suprematismo de Kazimir Malevich y el Fin de la Representación

El Suprematismo fue el movimiento de vanguardia ruso fundado en 1915 por Kazimir Malevich que buscó la primacía de la pura sensibilidad artística por encima del naturalismo figurativo.

### El Cero de la Forma
Malevich buscó desvestir al arte de todo objeto representativo:
- **"Cuadrado Negro sobre Fondo Blanco" (1915)**: Representa la deconstrucción total de la pintura. No es un cuadrado geométrico perfecto, es una masa de pintura pura sobre un lienzo. Malevich lo llamó "el cero de la forma", el punto de partida desde el cual el arte se libera del ilusionismo representativo.`,
              orbitRadius: 110,
              orbitSpeed: 0.04,
              color: "#edf2f4"
            }
          ]
        }
      ]
    }
  },
  {
    name: "El Imperio Romano",
    tasks: [
      "Estudiar la transición política de la Tetrarquía de Diocleciano",
      "Analizar la economía de esclavitud y villas romanas",
      "Evaluar la química y reacciones del Hormigón Romano"
    ],
    sun: {
      title: "Imperio Romano",
      type: "sun",
      notes: `# El Imperio Romano: Instituciones, Ingeniería y Estructura Social (Nivel Universitario)

El estudio científico del Imperio Romano abarca el análisis de la evolución política desde el Principado hacia la Tetrarquía, la economía de conquista agraria sostenida por la esclavitud, el desarrollo del Derecho como marco jurisprudencial civil universal y las innovaciones estructurales en ingeniería militar y civil.

### El Legado del Poder y de las Estructuras de Control
Roma no basó su hegemonía únicamente en la fuerza de las legiones. La estabilidad imperial de varios siglos se logró mediante la asimilación legal y cultural de las élites locales provinciales ("romanización"), la creación de una densa red de calzadas para el comercio y transporte militar rápido, y la unificación jurídica que garantizó la propiedad privada y las transacciones mercantiles bajo el amparo de la Ley Romana.`,
      color: "#ff5400",
      children: [
        {
          title: "Evolución Política",
          type: "planet",
          notes: `# Evolución Política: Del Principado al Dominado

La estructura de gobernabilidad de Roma mutó de forma sustancial desde la fachada republicana instaurada por Augusto hasta la monarquía absoluta militar impuesta por Diocleciano.

### El Principado de Augusto (27 a.C. - 284 d.C.)
Octavio Augusto asumió el poder concentrando magistraturas clave bajo el título constitucional de *Princeps* (Primer Ciudadano). Mantuvo las apariencias de las instituciones republicanas (Senado, Cónsules), pero controlando directamente el tesoro militar y el mando de las legiones.

### El Dominado (284 d.C. - 476 d.C.)
Tras la anarquía militar del siglo III, Diocleciano eliminó la fachada republicana. El gobernante asumió el título de *Dominus et Deus* (Señor y Dios), gobernando con ceremonial de corte oriental y burocracia centralizada.`,
          orbitRadius: 130,
          orbitSpeed: 0.035,
          color: "#00f2fe",
          children: [
            {
              title: "Principado de Augusto",
              type: "planetoid",
              notes: `# Octavio Augusto y la Institucionalización del Principado

Augusto consolidó su hegemonía concentrando de forma legal magistraturas clave en su persona sin alterar formalmente las instituciones de la República.

### Imperium Maius y Potestad Tribunicia
- **Imperium Proconsulare Maius**: Control militar absoluto directo sobre las provincias fronterizas estratégicas donde estaban estacionadas las legiones.
- **Tribunicia Potestas**: Derecho a veto inviolable sobre cualquier ley del Senado y capacidad de convocar la asamblea de los plebeyos, protegiendo su figura bajo la sacrosanta protección popular.`,
              orbitRadius: 75,
              orbitSpeed: -0.06,
              color: "#ff7b00",
              children: [
                {
                  title: "Propaganda Dinástica",
                  type: "moon",
                  notes: `# La Propaganda y la Imagen del Poder en el Imperio de Augusto

Augusto utilizó la arquitectura, escultura y literatura clásica como sofisticadas herramientas de legitimación de su régimen dinástico.

### El Retrato Augusto de Prima Porta
Escultura de bulto redondo del emperador en actitud de arenga militar (*adlocutio*):
- **La Coraza**: Contiene relieves esculpidos detallando la devolución de los estandartes legionarios por parte de los partos, presentándose como el pacificador del mundo romano.
- **Cupido sobre el delfín**: Alusión mítica a Eneas y la diosa Venus, de quien la dinastía Julio-Claudia reclamaba descendencia directa divina.`,
                  orbitRadius: 50,
                  orbitSpeed: 0.12,
                  color: "#e8c4ff",
                  children: [
                    {
                      title: "El Ara Pacis",
                      type: "satellite",
                      notes: `# El Altar Ara Pacis Augustae (9 a.C.)

Monumento conmemorativo erigido en el Campo de Marte de Roma para celebrar la Pax Romana establecida tras las campañas militares en Hispania y Galia.
- **Relieves Procesionales**: Retratan a la familia imperial de Augusto marchando de forma solemne junto a senadores y sacerdotes, ensalzando la piedad y la estabilidad del nuevo régimen moral tradicional.
- **Tellus**: Relieve alegórico de la diosa de la Tierra fértil rodeada de frutos y ganado, simbolizando la abundancia que surge tras el cese de las guerras civiles.`,
                      orbitRadius: 26,
                      orbitSpeed: -0.25,
                      color: "#a8afb8"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: "Infraestructura e Ingeniería",
          type: "planet",
          notes: `# Infraestructura, Logística Militar y Ingeniería Civil de Roma

La durabilidad monumental romana se fundamenta en la estandarización técnica de sus materiales de construcción y en una red logística sin parangón en el mundo antiguo.

### Calzadas y Puentes
La construcción de puentes de arcos de piedra y calzadas multicapa unificó el Imperio, garantizando la velocidad de las tropas y el flujo del comercio marítimo y terrestre continental.`,
          orbitRadius: 210,
          orbitSpeed: 0.02,
          color: "#00b4d8",
          children: [
            {
              title: "Opus Caementicium",
              type: "planetoid",
              notes: `# La Química del Hormigón Romano (Opus Caementicium)

El hormigón romano antiguo demuestra poseer una durabilidad y resistencia a la tracción marina superior a la de la mayoría de los cementos Portland modernos.

### Componentes de la Mezcla
1. **Cal Apagada**: Hidróxido de calcio ($Ca(OH)_2$) obtenido calcinando piedra caliza ($CaCO_3$).
2. **Ceniza Pozolánica**: Cenizas volcánicas ricas en sílice y alúmina procedentes de regiones cercanas al monte Vesubio (ej. Pozzuoli).
3. **Agua de Mar**: Aporta iones de sodio y cloro que aceleran y modifican los procesos de curado.
4. **Áridos (Caementa)**: Tacos de basalto, tufo volcánico o trozos de ladrillos de arcilla cocida.

### Reacción Pozolánica y Cristalización de Al-tobermorita
Al mezclar la cal con la ceniza volcánica reactiva en presencia de agua, ocurre la reacción pozolánica de hidratación:
$$Ca(OH)_2 + \\text{SiO}_2 + \\text{H}_2\\text{O} \\implies Silicato de Calcio Hidratado$$
Cuando la estructura de hormigón está expuesta al agua de mar, los fluidos marinos disuelven parcialmente la cal y reaccionan con la ceniza volcánica restante, promoviendo el crecimiento de cristales de **Al-tobermorita de Aluminio** ($[Ca_4(Si_5.5Al_{0.5})O_{17}H_2] \\cdot Ca \\cdot 4H_2O$):
- Este mineral tiene una estructura cristalina en láminas entrelazadas muy resistente a la fractura.
- **Auto-reparación**: Si se genera una microfisura interna, el agua de mar que penetra disuelve compuestos de cal libre y promueve la cristalización de Al-tobermorita directamente en el interior de la fisura, sellándola de forma activa.`,
              orbitRadius: 65,
              orbitSpeed: 0.08,
              color: "#3a86c8"
            },
            {
              title: "Calzadas Romanas (Viae)",
              type: "planetoid",
              notes: `# Las Calzadas Romanas (Viae) y Logística de Comunicación

Roma pavimentó más de 80,000 kilómetros de calzadas para garantizar el control militar imperial.

### Estructura de Capas
1. **Statumen**: Bloques de piedra grandes para el cimiento.
2. **Rudus**: Grava y pedregal mezclado con cal para compactar.
3. **Nucleus**: Arena gruesa y grava fina para drenaje.
4. **Summum Dorsum**: Losas de basalto lisas encajadas que facilitaban la marcha.
Esta ingeniería permitía el tránsito en invierno de carros de suministros y legiones a marcha rápida (hasta 30 kilómetros diarios).`,
              orbitRadius: 90,
              orbitSpeed: 0.07,
              color: "#4ea8de"
            },
            {
              title: "Acueductos y Sifones",
              type: "planetoid",
              notes: `# Ingeniería Hidráulica: Acueductos y Red de Distribución

Roma suministraba millones de litros de agua diarios a las termas y fuentes urbanas de las provincias.

### El Control de Pendiente
Los acueductos salvaban kilómetros manteniendo pendientes extremadamente sutiles y estables (de 0.1% a 0.5%) mediante arquerías de piedra.
- **Sifón Invertido**: Tuberías de plomo cerradas herméticamente que superaban valles profundos mediante el principio de vasos comunicantes, aprovechando la presión hidrostática del agua acumulada.`,
              orbitRadius: 115,
              orbitSpeed: 0.06,
              color: "#8338ec"
            },
            {
              title: "Legiones y Reformas",
              type: "planetoid",
              notes: `# Las Reformas del Ejército de Cayo Mario (107 a.C.)

Las reformas del cónsul Cayo Mario a finales del siglo II a.C. transformaron al ejército de Roma de una milicia de ciudadanos propietarios a una fuerza militar profesional altamente letal.

### Los Cambios Estructurales de Mario
1. **Admisión de los Proletarii**: Permitía alistarse a ciudadanos pobres sin tierras (*capite censi*), cuyos equipos y salarios eran provistos por el Estado.
2. **Profesionalización**: Contrato permanente de servicio militar por 16 o 25 años. Al jubilarse, el Estado les otorgaba parcelas de tierra fértil en provincias coloniales.
3. **Unificación Logística**: Cada soldado debía cargar su propia impedimenta, raciones y estacas de fortificación en una horca sobre la espalda (apodados "Las Mulas de Mario"), eliminando caravanas de equipaje lentas.
4. **La Cohorte como Unidad Táctica**: Reemplazó el manípulo republicano por la Cohorte (600 hombres), simplificando el mando y la flexibilidad táctica en combate.
5. **El Estandarte del Águila (Aquila)**: Entregó un estandarte de bronce o plata único para cada legión, fomentando la lealtad y el espíritu de cuerpo militar.

### El Impacto Político Indirecto
Al depender los soldados de la jubilación en tierras que debía conceder su propio general en el Senado, las legiones trasladaron su lealtad de la República al general del ejército, facilitando el camino hacia las dictaduras militares de Julio César, Pompeyo y el Imperio final.

<div style="text-align: center; margin: 15px 0;">
  <img src="images/mapa_roma.png" alt="Mapa de las Calzadas de Roma" style="max-width: 80%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);" />
  <p style="font-size: 10px; color: #a8afb8; margin-top: 5px;">Distribución de provincias, calzadas y límites del Imperio Romano.</p>
</div>`,
              orbitRadius: 140,
              orbitSpeed: 0.05,
              color: "#ff006e"
            },
            {
              title: "Ingeniería de Asedio",
              type: "planetoid",
              notes: `# Maquinaria de Guerra e Ingeniería de Asedio Romana

Roma adaptó la tecnología helenística para desarrollar máquinas de artillería que destruían las murallas de las ciudades sitiadas.
- **Catapulta y Balista**: Mecanismos de torsión utilizando cuerdas de tendones animales para lanzar flechas gigantes y rocas pesadas con gran precisión.
- **Onagro**: Lanzador de piedras de un solo brazo que utilizaba la fuerza acumulada en haces de cuerdas trenzadas.
- **Campamento Fortificado (Castra)**: Cada legión construía al final del día un foso, empalizada y cuadrícula de calles de forma idéntica, permitiendo una defensa óptima en territorio hostil.`,
              orbitRadius: 165,
              orbitSpeed: 0.045,
              color: "#ffca3a"
            }
          ]
        },
        {
          title: "Administración y Derecho",
          type: "planet",
          notes: `# Administración Provincial y el Derecho Romano

El Derecho Romano es el legado de mayor impacto histórico del Imperio, sirviendo como la columna vertebral de los de la Europa continental.

### Estructura Provincial
La división en provincias imperiales (dependientes del emperador y con legiones) y senatoriales (pacíficas, dependientes del senado) garantizó el control político y fiscal sobre millones de habitantes rurales de diversa índole cultural.`,
          orbitRadius: 310,
          orbitSpeed: 0.015,
          color: "#90e0ef",
          children: [
            {
              title: "Derecho e Jurisprudencia",
              type: "planetoid",
              notes: `# Derecho Romano: Compilaciones, Escritos y Grandes Juristas

La jurisprudencia y codificación de las leyes romanas evolucionaron desde el formalismo de la República hasta el Corpus unificado bajo Bizancio, gracias al desarrollo metodológico de cinco figuras clave.`,
              orbitRadius: 85,
              orbitSpeed: -0.06,
              color: "#a2d2ff",
              children: [
                {
                  title: "Justiniano I",
                  type: "moon",
                  notes: `# Justiniano I y la Compilación del Corpus Iuris Civilis

Justiniano I (482-565 d.C.) fue el emperador bizantino que ordenó la recopilación del derecho clásico romano para restaurar la unidad legal y administrativa del Imperio.

### Corpus Iuris Civilis
Esta monumental obra jurídica reunió siglos de jurisprudencia en cuatro textos unificados:
1. **Codex**: Compilación de leyes imperiales de emperadores precedentes.
2. **Digesta (Pandectas)**: Sumario del pensamiento y dictámenes de los grandes juristas clásicos de la era dorada imperial.
3. **Institutiones**: Compilación académica y pedagógica oficial para estudiantes de derecho.
4. **Novellae**: Las nuevas constituciones imperiales promulgadas por Justiniano.

Q: ¿Cuál fue el impacto del Corpus Iuris Civilis en el derecho moderno?
A: Sirvió como el cimiento para el desarrollo de la jurisprudencia civil en la Europa continental en el siglo XI (recepción del derecho romano), influyendo de forma decisiva en el Código Civil Napoleónico de 1804 y los códigos civiles modernos.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.15,
                  color: "#ffc6ff"
                },
                {
                  title: "Ulpiano",
                  type: "moon",
                  notes: `# Ulpiano y los Principios Generales del Derecho

Domicio Ulpiano (170-228 d.C.) fue uno de los juristas clásicos más fecundos e influyentes de Roma, cuyas citas representan cerca de un tercio de todo el contenido recopilado en el *Digesto*.

### Las Tres Máximas del Derecho de Ulpiano
Ulpiano sistematizó las bases éticas y civiles de la ley en tres mandamientos simples:
1. *Honeste vivere* (Vivir honestamente).
2. *Alterum non laedere* (No dañar al prójimo).
3. *Suum cuique tribuere* (Dar a cada uno lo suyo).

### Definición de Justicia
Definió la justicia como la voluntad constante y perpetua de dar a cada uno su propio derecho (*Iustitia est constans et perpetua voluntas ius suum cuique tribuendi*).`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff"
                },
                {
                  title: "Gayo",
                  type: "moon",
                  notes: `# Gayo y las Institutiones de Estructura Jurídica

Gayo (120-180 d.C.) fue un jurista clásico romano célebre por redactar las *Institutiones*, el primer libro de texto estructurado de educación legal de Roma.

### El Sistema de Gayo
Gayo dividió el Derecho Civil de forma metodológica en tres grandes campos de estudio:
- **Personae (Personas)**: Derechos de ciudadanía, estado familiar, matrimonio y estatus de libertad (libres vs esclavos).
- **Res (Cosas)**: Derechos reales de propiedad, usufructo, contratos mercantiles de compraventa y herencias.
- **Actiones (Acciones)**: El derecho procesal civil y las fórmulas legales para interponer demandas en los tribunales pretorios.
Esta tripartición del derecho sigue estructurando los códigos civiles de todo el mundo moderno.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.1,
                  color: "#ffc6ff"
                },
                {
                  title: "Papiniano",
                  type: "moon",
                  notes: `# Papiniano y la Integridad Moral en la Ley

Emilio Papiniano (142-212 d.C.) es catalogado históricamente como el más ilustre de los juristas clásicos romanos, admirado por su rigor metodológico y su inflexibilidad moral ante el poder político imperial.

### Aportes Doctrinales
Papiniano escribió las *Quaestiones* (37 libros) y *Responsa* (19 libros), donde abordaba casos prácticos complejos aplicando principios de equidad sobre el formalismo estricto de la ley escrita.
- **Su Muerte**: Fue ejecutado por orden del emperador Caracalla por negarse a redactar una justificación jurídica en el Senado que legitimara el asesinato de su hermano y co-emperador Geta. Papiniano sentenció: *"Es más fácil cometer un fratricidio que justificarlo"*.`,
                  orbitRadius: 115,
                  orbitSpeed: -0.09,
                  color: "#ff70a6"
                },
                {
                  title: "Salvio Juliano",
                  type: "moon",
                  notes: `# Salvio Juliano y el Edicto Perpetuo

Salvio Juliano (115-176 d.C.) fue un preeminente jurista y magistrado romano, cónsul del Imperio bajo Antonino Pío.

### Codificación del Edicto de los Pretores
El emperador Adriano le encargó la codificación definitiva del Edicto de los Pretores (131 d.C.):
- **Anulación de Arbitrariedades**: Antes de Juliano, cada pretor redactaba de forma subjetiva las normas procesales anuales.
- **Fijación de Jurisprudencia**: Juliano compiló y fijó el texto judicial para siempre de forma inmutable, centralizando de manera definitiva la creación del derecho en la corte y decretos del Emperador.`,
                  orbitRadius: 140,
                  orbitSpeed: 0.08,
                  color: "#70d6ff"
                }
              ]
            },
            {
              title: "Economía Esclavista",
              type: "planetoid",
              notes: `# La Economía Esclavista de Conquista y Latifundio

La riqueza romana de exportación de vino, aceite de oliva y trigo se concentró en grandes latifundios agrarios explotados mediante mano de obra esclava masiva.

### Las Rebeliones Serviles
Las duras condiciones en las minas y campos provocaron tres guerras serviles. La más destacada fue liderada por Espartaco en el 73 a.C., poniendo en jaque a la península itálica antes de ser derrotado por Craso y disuadida con la crucifixión de 6,000 esclavos.`,
              orbitRadius: 110,
              orbitSpeed: 0.04,
              color: "#edf2f4"
            }
          ]
        }
      ]
    }
  },
  {
    name: "Inteligencia Artificial",
    tasks: [
      "Estudiar el Algoritmo de Clustering K-Means",
      "Demostrar matemáticamente Backpropagation",
      "Analizar el mecanismo de Atención de los Transformers"
    ],
    sun: {
      title: "Inteligencia Artificial",
      type: "sun",
      notes: `# Inteligencia Artificial y Computación Neuronal (Nivel Universitario)

La Inteligencia Artificial moderna se centra en el paradigma del Machine Learning (Aprendizaje Automático) y el Deep Learning (Aprendizaje Profundo), donde algoritmos matemáticos infieren patrones y reglas a partir de volúmenes masivos de datos experimentales sin ser explícitamente programados mediante lógica algorítmica clásica.

### La Revolución del Procesamiento Estadístico
El éxito de la IA actual se fundamenta en tres pilares sinérgicos:
1. **Poder de Cómputo**: Uso de tarjetas de procesamiento gráfico acelerado (GPUs) capaces de realizar billones de operaciones de multiplicación de matrices por segundo en paralelo.
2. **Big Data**: Disponibilidad de corpus masivos de texto, imágenes y video digitalizados en internet para entrenamiento de redes del orden de miles de millones de parámetros.`,
      color: "#bd00ff",
      children: [
        {
          title: "Deep Learning y Redes",
          type: "planet",
          notes: `# Deep Learning y Redes Neuronales Artificiales

Las redes neuronales profundas de alimentación hacia adelante (feedforward) consisten en capas de neuronas interconectadas que transforman los datos de entrada en representaciones abstractas de salida.

### Formulación Básica de la Neurona
Cada neurona realiza un producto punto de las activaciones de la capa anterior por una matriz de pesos, suma un sesgo bias, y aplica una función de activación no lineal:
$$a_j^l = \sigma\left(\sum_k w_{jk}^l a_k^{l-1} + b_j^l\right)$$
- $\sigma(x)$: Función de activación no lineal (ReLU, Sigmoide, GeLU).`,
          orbitRadius: 130,
          orbitSpeed: 0.035,
          color: "#00f2fe",
          children: [
            {
              title: "Propagación y Redes",
              type: "planetoid",
              notes: `# Propagación de Errores y Optimización de Parámetros

El entrenamiento de una red neuronal consiste en encontrar los pesos y sesgos que minimicen una función de pérdida o coste $C$ mediante el gradiente descendente.

### Gradiente Descendente
Se calculan las derivadas parciales de $C$ respecto a cada peso $w_{jk}^l$. Los parámetros se actualizan en la dirección opuesta al gradiente para reducir la pérdida:
$$w_{jk}^l \leftarrow w_{jk}^l - \eta \frac{\partial C}{\partial w_{jk}^l}$$
Donde $\eta$ es la tasa de aprendizaje. El cálculo computacionalmente eficiente de estos gradientes es provisto por el algoritmo de retropropagación.`,
              orbitRadius: 75,
              orbitSpeed: -0.06,
              color: "#ff7b00",
              children: [
                {
                  title: "Backpropagation",
                  type: "moon",
                  notes: `# Algoritmo de Backpropagation y Flujo del Error

El algoritmo de backpropagation utiliza la regla de la cadena para propagar los errores de predicción desde la capa de salida hacia las capas iniciales de la red.

### Definición del Error Local
El error local $\delta_j^l$ de una neurona $j$ en la capa $l$ se define como:
$$\delta_j^l \equiv \frac{\partial C}{\partial z_j^l}$$
Donde $z_j^l = \sum_k w_{jk}^l a_k^{l-1} + b_j^l$.`,
                  orbitRadius: 50,
                  orbitSpeed: 0.12,
                  color: "#e8c4ff",
                  children: [
                    {
                      title: "Regla de la Cadena",
                      type: "satellite",
                      notes: `# Derivación de la Regla de la Cadena en Backpropagation

Deduciremos matemáticamente las cuatro ecuaciones fundamentales de backpropagation.

### 1. Error en la Capa de Salida ($L$)
$$\delta_j^L = \frac{\partial C}{\partial a_j^L} \frac{\partial a_j^L}{\partial z_j^L} = \frac{\partial C}{\partial a_j^L} \sigma'(z_j^L)$$
Para coste cuadrático: $\delta_j^L = (a_j^L - y_j) \sigma'(z_j^L)$.

### 2. Retropropagación a la Capa Oculta ($l$)
$$\delta_j^l = \frac{\partial C}{\partial z_j^l} = \sum_k \frac{\partial C}{\partial z_k^{l+1}} \frac{\partial z_k^{l+1}}{\partial z_j^l} = \sum_k \delta_k^{l+1} w_{kj}^{l+1} \sigma'(z_j^l)$$
En notación matricial:
$$\delta^l = \left( (W^{l+1})^T \delta^{l+1} \right) \odot \sigma'(z^l)$$

### 3. Gradientes de los Parámetros
$$\frac{\partial C}{\partial w_{jk}^l} = a_k^{l-1} \delta_j^l \quad \text{y} \quad \frac{\partial C}{\partial b_j^l} = \delta_j^l$$

<div style="text-align: center; margin: 15px 0;">
  <img src="images/red_neuronal.png" alt="Arquitectura de Red Neuronal y Backpropagation" style="max-width: 85%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);" />
  <p style="font-size: 10px; color: #a8afb8; margin-top: 5px;">Esquema de propagación hacia adelante y flujo inverso de gradientes de error.</p>
</div>`,
                      orbitRadius: 26,
                      orbitSpeed: -0.25,
                      color: "#a8afb8"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: "Algoritmos y Modelos",
          type: "planet",
          notes: `# Algoritmos de Machine Learning y NLP

La inteligencia artificial clásica y el desarrollo de arquitecturas de atención para procesamiento de texto.

### Clustering No Supervisado
El algoritmo K-Means agrupa datos multidimensionales buscando minimizar la inercia cuadrática intraclúster de forma iterativa y determinista.`,
          orbitRadius: 210,
          orbitSpeed: 0.02,
          color: "#00b4d8",
          children: [
            {
              title: "Clustering K-Means",
              type: "planetoid",
              notes: `# Algoritmo de Clustering K-Means e Inteligencia No Supervisada

El algoritmo de K-Means es un método clásico de particionamiento de datos no supervisado para agrupar un conjunto de $N$ observaciones multidimensionales en $K$ conglomerados (clusters) disjuntos.

### Formulación Matemática del Objetivo (Inercia)
El objetivo de K-Means es encontrar las ubicaciones óptimas de los centroides de los clusters $\\{\mu_1, \mu_2, ..., \mu_K\\}$ de manera que se minimice la suma de cuadrados de las distancias dentro de cada cluster (inercia intracluster):
$$J = \sum_{i=1}^K \sum_{x \in S_i} ||x - \mu_i||^2$$
Donde $S_i$ representa el conjunto de puntos asignados al cluster $i$, y $\mu_i$ es el centroide medio de dicho cluster.

### Pasos del Algoritmo Iterativo (Expectación-Maximización)
1. **Inicialización**: Se eligen $K$ centroides iniciales al azar en el espacio de datos.
2. **Paso de Asignación (Expectación)**: Se asigna cada punto de datos $x$ al centroide más cercano en base a la distancia euclidiana.
3. **Paso de Actualización (Maximización)**: Se recalculan las coordenadas de cada centroide promediando todos los puntos asignados a él.
Se repiten los pasos 2 y 3 de forma iterativa hasta lograr la convergencia.`,
              orbitRadius: 65,
              orbitSpeed: 0.08,
              color: "#3a86c8"
            },
            {
              title: "CNNs e Convolución",
              type: "planetoid",
              notes: `# Redes Convolucionales (CNNs) y Convolución 2D

Las CNNs procesan imágenes espaciales de forma local aplicando kernels de pesos compartidos.

### La Convolución de Imagen
Se desliza un filtro convolucional para detectar características visuales complejas independientes de su posición espacial:
$$S(i, j) = \sum_m \sum_n I(i-m, j-n) K(m, n)$$
- **Max-Pooling**: Submuestreo que extrae el valor máximo local para reducir parámetros y garantizar invarianza a pequeñas traslaciones.`,
              orbitRadius: 90,
              orbitSpeed: 0.07,
              color: "#4ea8de",
              children: [
                {
                  title: "Invarianza Espacial",
                  type: "moon",
                  notes: `# Invarianza Espacial y Pooling en Visión por Computador

La invarianza a traslaciones es una propiedad fundamental de las redes convolucionales que les permite detectar un objeto en una imagen sin importar en qué posición se encuentre.

### Compartición de Pesos y Pooling
Esta propiedad se logra mediante dos mecanismos combinados:
1. **Compartición de Pesos**: Al aplicar el mismo filtro convolucional sobre toda la imagen, si una característica (ej. un borde) se desplaza, la activación se desplaza de igual manera en el mapa de características.
2. **Max-Pooling**: Al tomar el valor máximo de cada subregión (ej. parches de 2x2), pequeños desplazamientos del objeto no alteran la salida del pooling, otorgando robustez ante variaciones espaciales y reduciendo el costo computacional.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.11,
                  color: "#f472b6"
                },
                {
                  title: "Arquitectura ResNet",
                  type: "moon",
                  notes: `# Redes Residuales (ResNet) y Conexiones de Salto

Las redes ResNet (He et al., 2015) resolvieron el problema de la degradación del gradiente en redes neuronales extremadamente profundas mediante la introducción de conexiones de salto (skip connections).

### Formulación Residual
En lugar de forzar a las capas a aprender una representación directa $H(x)$, las conexiones residuales las obligan a aprender una función de residuo $F(x) = H(x) - x$:
$$H(x) = F(x) + x$$
Matemáticamente, la señal de gradiente puede fluir directamente a través del término de identidad $+x$ sin atenuarse, permitiendo entrenar de forma estable arquitecturas de más de 100 o 1000 capas de profundidad.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.1,
                  color: "#fb7185"
                }
              ]
            },
            {
              title: "Transformers (NLP)",
              type: "planetoid",
              notes: `# NLP y la Arquitectura Transformer

La arquitectura Transformer (Vaswani et al., 2017) eliminó las limitaciones recurrentes de las RNNs/LSTMs permitiendo procesamiento paralelo en GPU.

### Autoatención de Producto Escalar Escalado
$$\text{Attention}(Q, K, V) = \text{softmax}\left( \frac{Q K^T}{\sqrt{d_k}} \right) V$$
- $Q, K, V$: Vectores proyectados linealmente representando Queries, Keys y Values.
- $\sqrt{d_k}$: Factor de amortiguación para evitar que los gradientes de la función softmax se saturen en dimensiones altas.`,
              orbitRadius: 115,
              orbitSpeed: 0.06,
              color: "#8338ec",
              children: [
                {
                  title: "Atención Multicabezal",
                  type: "moon",
                  notes: `# Mecanismo de Atención Multicabezal (Multi-Head Attention)

La atención multicabezal permite al Transformer prestar atención simultáneamente a información de diferentes subespacios de representación y posiciones del texto.

### Formulación Matemática
En lugar de realizar una única función de atención con queries, keys y values de dimensión completa, se realizan $h$ proyecciones lineales independientes:
$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h) W^O$$
$$\text{where } \text{head}_i = \text{Attention}(Q W_i^Q, K W_i^K, V W_i^V)$$
Esto otorga al modelo la capacidad de capturar relaciones gramaticales y semánticas complejas a diferentes distancias dentro de la oración.`,
                  orbitRadius: 45,
                  orbitSpeed: 0.12,
                  color: "#fb7185",
                  children: [
                    {
                      title: "Codificación Posicional",
                      type: "satellite",
                      notes: `# Codificación Posicional (Positional Encoding)

Debido a que el Transformer carece de recursividad o convoluciones, procesa todas las palabras en paralelo, perdiendo la noción de orden secuencial del texto. Para solucionar esto, se añaden codificaciones posicionales a las representaciones de entrada.

### Fórmulas de Senos y Cosenos
Vaswani et al. utilizaron funciones trigonométricas de diferentes frecuencias:
$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)$$
Donde $pos$ es la posición de la palabra en la secuencia e $i$ es el índice de dimensión. Esto permite al modelo aprender a atender por posición relativa de forma analítica.`,
                      orbitRadius: 26,
                      orbitSpeed: -0.2,
                      color: "#a8afb8"
                    }
                  ]
                },
                {
                  title: "Modelos GPT y BERT",
                  type: "moon",
                  notes: `# Modelos GPT vs. BERT: Decodificadores y Codificadores

El éxito de los modelos de lenguaje modernos se basa en arquitecturas pre-entrenadas con tareas auto-supervisadas, destacando dos paradigmas opuestos:

### GPT (Generative Pre-trained Transformer)
- **Tipo**: Solo Decodificador (Decoder-Only).
- **Mecanismo**: Atención enmascarada causal (unidireccional); una palabra solo puede atender a las palabras anteriores.
- **Objetivo**: Modelado de lenguaje causal (predecir la siguiente palabra). Ideal para tareas generativas.

### BERT (Bidirectional Encoder Representations)
- **Tipo**: Solo Codificador (Encoder-Only).
- **Mecanismo**: Atención bidireccional completa; cada palabra atiende a todas las de la secuencia.
- **Objetivo**: Modelado de lenguaje enmascarado (predecir palabras ocultas al azar). Ideal para tareas de clasificación, extracción y comprensión de textos.`,
                  orbitRadius: 75,
                  orbitSpeed: -0.09,
                  color: "#818cf8"
                }
              ]
            },
            {
              title: "MDPs y Refuerzo",
              type: "planetoid",
              notes: `# Procesos de Decisión de Markov (MDPs)

El aprendizaje por refuerzo formaliza el ciclo de toma de decisiones interactivas de un agente en un entorno mediante MDPs.

### La Tupla del MDP
Representada como $(S, A, P, R, \\gamma)$:
- $S$: Conjunto de estados.
- $A$: Conjunto de acciones de toma de decisión.
- $P(s' | s, a)$: Probabilidades de transición de estado.
- $R(s, a)$: Recompensas de retroalimentación inmediata.
- $\\gamma$: Factor de descuento de ganancias futuras a largo plazo.`,
              orbitRadius: 140,
              orbitSpeed: 0.05,
              color: "#ff006e"
            },
            {
              title: "Ecuaciones de Bellman",
              type: "planetoid",
              notes: `# Ecuaciones de Bellman y Optimización de Valor

Las ecuaciones de Bellman descomponen la función de valor óptima recursivamente en la ganancia inmediata más el valor acumulado descontado esperado del estado siguiente.

### Formulación de Bellman para $V^*(s)$
$$V^*(s) = \\max_{a} \\left[ R(s, a) + \\gamma \\sum_{s'} P(s' | s, a) V^*(s') \\right]$$
Esta formulación fundamenta algoritmos clásicos de programación dinámica en aprendizaje por refuerzo.`,
              orbitRadius: 165,
              orbitSpeed: 0.045,
              color: "#ffca3a"
            }
          ]
        },
        {
          title: "Pioneros del Deep Learning",
          type: "planet",
          notes: `# Pioneros de la Inteligencia Artificial y el Deep Learning

Los algoritmos de optimización profunda, redes neuronales y computación teórica fueron formulados por cinco científicos legendarios que transformaron el rumbo de la tecnología moderna.`,
          orbitRadius: 310,
          orbitSpeed: 0.015,
          color: "#90e0ef",
          children: [
            {
              title: "Pioneros de IA",
              type: "planetoid",
              notes: `# Pioneros del Deep Learning y la Computación Inteligente

Cinco investigadores célebres de la computación teórica y las redes neuronales cuyos algoritmos y teoremas estructuran las inteligencias artificiales modernas.`,
              orbitRadius: 85,
              orbitSpeed: -0.06,
              color: "#a2d2ff",
              children: [
                {
                  title: "Geoffrey Hinton",
                  type: "moon",
                  notes: `# Geoffrey Hinton y el Aprendizaje por Retropropagación

Geoffrey Hinton (1947-) es un psicólogo cognitivo e informático británico-canadiense, galardonado con el Premio Turing en 2018 (el "Nobel de la computación") y el Premio Nobel de Física en 2024.

### Backpropagation (1986)
Hinton co-publicó el algoritmo de retropropagación del error, demostrando que aplicar la regla de la cadena matemática permite a redes neuronales multicapa aprender de forma autónoma representaciones internas complejas de los datos.

### Máquinas de Boltzmann
Desarrolló modelos de redes neuronales estocásticas capaces de aprender distribuciones de probabilidad a nivel interno de forma no supervisada.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.15,
                  color: "#ffc6ff"
                },
                {
                  title: "Yann LeCun",
                  type: "moon",
                  notes: `# Yann LeCun y las Redes Convolucionales (CNNs)

Yann LeCun (1960-) es un científico de la computación francés, pionero de la visión artificial y Premio Turing en 2018.

### La Arquitectura LeNet-5 (1998)
LeCun combinó las redes neuronales con operaciones locales de convolución espacial de imágenes para el reconocimiento automático de caracteres manuscritos en cheques bancarios:
- **Convolución con Pesos Compartidos**: Demostró que forzar a la red a deslizar el mismo filtro de pesos reduce la cantidad de parámetros y garantiza invarianza espacial.
- **Pionero de Visión**: Estableció las bases del procesamiento visual moderno en conducción autónoma y medicina diagnóstica.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#e8c4ff"
                },
                {
                  title: "Yoshua Bengio",
                  type: "moon",
                  notes: `# Yoshua Bengio y los Modelos Secuenciales de Lenguaje

Yoshua Bengio (1964-) es un informático canadiense, Premio Turing en 2018 por sus contribuciones cruciales al aprendizaje profundo.

### Embeddings y Modelos de Lenguaje Neuronales (2003)
Bengio formuló los primeros modelos de lenguaje que utilizaban redes neuronales feedforward para aprender representaciones vectoriales densas y continuas de palabras (embeddings), capturando similitud semántica.
- **Desvanecimiento de Gradiente**: Investigó de forma matemática por qué las redes recurrentes tradicionales pierden memoria en secuencias largas, pavimentando el camino para las soluciones de puertas de las redes LSTM y posteriores Transformers.`,
                  orbitRadius: 90,
                  orbitSpeed: 0.1,
                  color: "#ffc6ff"
                },
                {
                  title: "Alan Turing",
                  type: "moon",
                  notes: `# Alan Turing y los Límites del Cálculo Inteligente

Alan Turing (1912-1954) fue un matemático y criptógrafo británico, catalogado como el padre de la informática teórica y de la Inteligencia Artificial.

### Computabilidad y Máquina de Turing (1936)
Turing formuló el modelo formal de la Máquina de Turing, estableciendo de forma matemática los límites absolutos del cálculo y resolviendo el problema de decisión (*Entscheidungsverfahren*).

### El Test de Turing (1950)
En su artículo "Computing Machinery and Intelligence", propuso el "Juego de la Imitación" (Test de Turing) como un criterio operacional para evaluar si una máquina puede exhibir comportamiento inteligente indistinguible de un ser humano.`,
                  orbitRadius: 115,
                  orbitSpeed: -0.09,
                  color: "#ff70a6"
                },
                {
                  title: "Arthur Samuel",
                  type: "moon",
                  notes: `# Arthur Samuel y el Coincidiendo del Machine Learning

Arthur Samuel (1901-1990) fue un informático estadounidense, pionero en el campo de la computación y los juegos de ordenador.

### Machine Learning (1959)
Samuel acuñó el término "Machine Learning" (Aprendizaje Automático) al definirlo como: *"El campo de estudio que da a los ordenadores la capacidad de aprender sin ser programados explícitamente"*.
- **Programa de Damas**: Diseñó uno de los primeros programas auto-aprendidos del mundo que jugaba a las damas, optimizando una función de evaluación que medía la ventaja de posición a partir de miles de partidas jugadas contra sí mismo.`,
                  orbitRadius: 140,
                  orbitSpeed: 0.08,
                  color: "#70d6ff"
                }
              ]
            },
            {
              title: "Generalización",
              type: "planetoid",
              notes: `# Métricas de Generalización y Optimización

Para garantizar que un modelo sea útil en el mundo real, debe generalizar bien frente a datos nuevos.

### Overfitting y Regularización
Ocurre cuando la red memoriza el ruido de entrenamiento en lugar de aprender el patrón subyacente. Se combate mediante:
- **Dropout**: Apagar aleatoriamente neuronas durante el entrenamiento.
- **Regularización L2 (Weight Decay)**: Penalizar pesos de gran magnitud en la función de coste.`,
              orbitRadius: 110,
              orbitSpeed: 0.04,
              color: "#edf2f4"
            }
          ]
        },
        {
          title: "Ética y Futuro de la IA",
          type: "planet",
          notes: `# Ética, Alineación y Regulación de la Inteligencia Artificial

Con la rápida aceleración de los modelos generativos y la búsqueda de la Inteligencia Artificial General (AGI), la ética y la regulación se han convertido en pilares fundamentales para garantizar que estos sistemas se desarrollen de manera segura, transparente y alineada con los valores y leyes de la humanidad.

### Desafíos Socio-Técnicos
1. **Alineación**: Asegurar que las metas de un agente autónomo coincidan con las intenciones humanas (evitar efectos colaterales imprevistos).
2. **Explicabilidad**: Romper la opacidad de los modelos de Deep Learning de millones de parámetros para hacer sus decisiones auditables.
3. **Regulación**: Establecer límites legales para el uso de datos protegidos y mitigar sesgos discriminatorios automatizados.`,
          orbitRadius: 410,
          orbitSpeed: 0.012,
          color: "#10b981",
          children: [
            {
              title: "Alineación y Seguridad",
              type: "planetoid",
              notes: `# Alineación de Sistemas Autónomos y Seguridad Técnica

La alineación de la IA es el campo científico que busca que los objetivos de las inteligencias artificiales converjan de forma exacta con las preferencias, valores e intenciones éticas de los seres humanos.

### Métodos de Alineación
- **RLHF (Reinforcement Learning from Human Feedback)**: Entrenamiento de modelos alineando su comportamiento en base a recompensas y valoraciones provistas por jueces humanos.
- **Seguridad en AGI**: Investigación de salvaguardas y mecanismos de parada de emergencia (red buttons) para evitar la pérdida de control de sistemas autónomos avanzados.`,
              orbitRadius: 85,
              orbitSpeed: -0.05,
              color: "#f59e0b",
              children: [
                {
                  title: "Problema de Alineación",
                  type: "moon",
                  notes: `# El Problema de la Alineación y Escenarios de Riesgo

El problema de la alineación surge de la dificultad de especificar metas humanas complejas de forma matemática en funciones de pérdida o recompensas.

### La Fábula del Clip de Bostrom
Nick Bostrom expone el escenario de una superinteligencia cuyo único objetivo es fabricar clips de papel. Si no está alineada éticamente con la preservación humana, el sistema podría decidir recolectar todos los átomos del planeta (incluyendo a la humanidad) para transformarlos en clips, siguiendo su meta de forma estrictamente lógica pero catastrófica.`,
                  orbitRadius: 40,
                  orbitSpeed: 0.15,
                  color: "#f43f5e"
                },
                {
                  title: "IA Explicable (XAI)",
                  type: "moon",
                  notes: `# Inteligencia Artificial Explicable (XAI)

La Inteligencia Artificial Explicable (eXplainable AI) busca dotar de interpretabilidad a los modelos complejos (como redes de Deep Learning profundas), permitiendo a expertos humanos comprender, auditar y confiar en sus predicciones.

### Técnicas de Explicabilidad
- **SHAP (SHapley Additive exPlanations)**: Método basado en la teoría de juegos cooperativos para asignar a cada característica del dato un valor de importancia en la predicción final.
- **LIME (Local Interpretable Model-agnostic Explanations)**: Aproxima localmente el modelo de caja negra mediante un clasificador lineal simple alrededor del dato de interés.
- **Mapas de Activación (Grad-CAM)**: En visión artificial, resalta las regiones de píxeles de la imagen en las que la CNN basó su decisión de clasificación.`,
                  orbitRadius: 65,
                  orbitSpeed: -0.11,
                  color: "#a855f7"
                }
              ]
            },
            {
              title: "Regulación y Sesgos",
              type: "planetoid",
              notes: `# Regulación de la IA y Sesgos Algorítmicos

El despliegue global de la inteligencia artificial requiere la creación de marcos regulatorios de gobernanza para evitar discriminaciones y garantizar los derechos fundamentales.

### Auditoría y Mitigación de Sesgos
El sesgo algorítmico se hereda de los datos de entrenamiento históricos que contienen prejuicios humanos. Los marcos reguladores obligan a auditar la imparcialidad (*fairness*) de los modelos antes de su comercialización.`,
              orbitRadius: 110,
              orbitSpeed: 0.03,
              color: "#3b82f6",
              children: [
                {
                  title: "Sesgo Algorítmico",
                  type: "moon",
                  notes: `# Sesgos Algorítmicos y Discriminación Automatizada

El sesgo algorítmico ocurre cuando un modelo de machine learning genera predicciones sistemáticamente desfavorables hacia un grupo demográfico específico (basado en raza, género, edad, etc.).

### Origen de los Sesgos en los Datos
- **Sesgo de Representación**: El dataset de entrenamiento no contiene suficientes muestras del grupo afectado.
- **Sesgo Histórico**: Los datos recopilados reflejan injusticias pasadas de la sociedad (ej: algoritmos de contratación filtrando currículums femeninos porque históricamente la mayoría de los contratados eran hombres).
Mitigar esto requiere técnicas de balanceo en la pérdida y regularización para imponer restricciones de equidad demográfica.`,
                  orbitRadius: 45,
                  orbitSpeed: 0.13,
                  color: "#a855f7"
                },
                {
                  title: "Ley de IA de la UE",
                  type: "moon",
                  notes: `# La Ley de Inteligencia Artificial de la Unión Europea (AI Act)

La Ley de IA de la Unión Europea es el primer marco regulatorio integral del mundo sobre IA, diseñado con un enfoque basado en niveles de riesgo para proteger los derechos fundamentales y la seguridad.

### Clasificación de Riesgos
1. **Riesgo Inaceptable**: Sistemas prohibidos (ej: puntuación social del gobierno, reconocimiento facial biométrico masivo en tiempo real en espacios públicos).
2. **Riesgo Alto**: Sujetos a evaluaciones estrictas y auditorías de datos (ej: IA en cirugía médica, reclutamiento laboral, evaluación de créditos financieros, justicia).
3. **Riesgo Limitado/Mínimo**: Obligación simple de transparencia (ej: chatbots informando que el usuario habla con una máquina, filtros de spam).`,
                  orbitRadius: 75,
                  orbitSpeed: -0.09,
                  color: "#3b82f6"
                }
              ]
            }
          ]
        }
      ]
    }
  }
];
