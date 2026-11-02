# Ejemplos originales; ejecutar desde la raíz del proyecto.
# Las rutas de datos son la única adaptación técnica. No se ejecutan al renderizar.

# Cargamos la muestra de ocurrencias de los géneros de Europa entre 750 y 550 m.a

genus <- read.csv("data/chapter01/genus-europe-750-550.csv")  # Leer el archivo CSV y asignarlo a "genus"



# Transformamos "genus" en un vector

genus <- as.vector(genus[, 1])  # Extraer la primera columna y convertirla en un vector



# Extraemos el número total de especímenes en la muestra

num_specimens <- length(genus)  # Contar el número total de elementos en el vector

print(num_specimens)  # Imprimir el número total de especímenes

# Extraemos el número total de especies en la muestra

num_species <- length(unique(genus))  # Contar el número de especies únicas

print(num_species)  # Imprimir el número total de especies

# ¿Cuántos especímenes esperaríamos en una submuestra de 250 especímenes?

# Número de especímenes en la submuestra

n_sub <- 250  # Establecer el tamaño de la submuestra



# Generamos la submuestra (muestreo aleatorio sin reemplazo)

subsample <- sample(genus, n_sub, replace = FALSE)  # Realizar el muestreo aleatorio



# Extraemos las especies en la submuestra

unique_species <- unique(subsample)  # Obtener las especies únicas en la submuestra

print(unique_species)  # Imprimir las especies únicas de la submuestra

# Contamos el número de especies únicas en la submuestra

num_unique_species <- length(unique_species)  # Contar el número de especies únicas

print(num_unique_species)  # Imprimir el número de especies únicas en la submuestra

# Cargamos los datos de ocurrencias de géneros

genus <- read.csv("data/chapter01/genus-europe-750-550.csv")  # Cargar archivo CSV y asignarlo a la variable "genus"



# Convertimos la columna de géneros en un vector para su análisis

genus <- as.vector(genus[,1])  # Extraer solo la primera columna (géneros) y convertirla en un vector



# Definimos una secuencia de tamaños de muestra para realizar la curva de rarefacción

seq <- seq(0, length(genus), by = length(genus) / 100)  # Secuencia que va de 0 al total de especímenes, en 100 pasos



# Inicializamos un vector vacío para almacenar el número de especies únicas en cada submuestra

subsamples <- c()  

for (i in 1:length(seq)) {

  # Realizamos una submuestra aleatoria sin reemplazo y contamos las especies únicas

  subsamples[i] <- length(unique(sample(genus, seq[i], replace = FALSE)))

}



# Graficamos la curva de rarefacción para Europa entre 750 y 550 m.a.

plot(seq, subsamples, main = "Curva de Rarefacción para Europa (750-550 m.a.)",

     xlab = "Número de especímenes", ylab = "Número de especies", pch = 19)

# Repetimos el mismo proceso para Europa entre 200 y 0 m.a.

genus <- read.csv("data/chapter01/genus-europe-200-0.csv")  # Cargar el archivo de datos de géneros entre 200-0 m.a.

genus <- as.vector(genus[,1])  # Convertir en vector de géneros

seq <- seq(0, length(genus), by = length(genus) / 100)  # Crear secuencia de 100 submuestras

subsamples <- c()  

for (i in 1:length(seq)) {

  # Submuestra aleatoria y cálculo de especies únicas

  subsamples[i] <- length(unique(sample(genus, seq[i], replace = FALSE)))

}



# Graficamos la curva de rarefacción para Europa entre 200 y 0 m.a.

plot(seq, subsamples, main = "Curva de Rarefacción para Europa (200-0 m.a.)",

     xlab = "Número de especímenes", ylab = "Número de especies", pch = 19)

# Comparación de ambas curvas de rarefacción en una sola gráfica



# Datos para Europa entre 750 y 550 m.a.

genus1 <- read.csv("data/chapter01/genus-europe-750-550.csv")

genus1 <- as.vector(genus1[,1])

seq1 <- seq(0, length(genus1), by = length(genus1) / 100)

subsamples1 <- c()

for (i in 1:length(seq1)) {

  subsamples1[i] <- length(unique(sample(genus1, seq1[i], replace = FALSE)))

}



# Datos para Europa entre 200 y 0 m.a.

genus2 <- read.csv("data/chapter01/genus-europe-200-0.csv")

genus2 <- as.vector(genus2[,1])

seq2 <- seq(0, length(genus2), by = length(genus2) / 100)

subsamples2 <- c()

for (i in 1:length(seq2)) {

  subsamples2[i] <- length(unique(sample(genus2, seq2[i], replace = FALSE)))

}



# Creación del dataframe para graficar ambas curvas

df <- data.frame(

  Numero_de_Especimenes = c(1:101,1:101),

  Numero_de_Especies = c(subsamples1 / max(subsamples1), subsamples2 / max(subsamples2)),

  Periodo = as.factor(c(rep("750-550 m.a.", length(seq1)), rep("200-0 m.a.", length(seq2))))

)



# Graficamos ambas curvas de rarefacción en la misma gráfica con plot()

# Separamos los datos por período

df_750_550 <- subset(df, Periodo == "750-550 m.a.")

df_200_0 <- subset(df, Periodo == "200-0 m.a.")



# Establecemos los límites del gráfico basados en el rango de datos

plot(range(df$Numero_de_Especimenes), range(df$Numero_de_Especies), type = "n",  # Gráfico vacío para establecer los límites

     xlab = "Número de especímenes (% sobre el total)", 

     ylab = "Número de especies (normalizado)",

     main = "Comparación de Curvas de Rarefacción en Europa")



# Añadimos los puntos para cada período en diferentes colores

points(df_750_550$Numero_de_Especimenes, df_750_550$Numero_de_Especies, col = "black", pch = 19)

points(df_200_0$Numero_de_Especimenes, df_200_0$Numero_de_Especies, col = "grey", pch = 19)



# Opcionalmente, añadimos una leyenda para mayor claridad

legend("bottomright", legend = c("750-550 m.a.", "200-0 m.a."), col = c("black", "grey"), pch = 19)

# NOTA: La diferencia entre ambas curvas de rarefacción refleja que, en el período Precámbrico (750-550 m.a.), 

# Europa está relativamente pobremente muestreada en comparación con el Meso-Cenozoico (200-0 m.a.).
