# Modelo neutro diploide de Wright–Fisher para docencia.
# N es el tamaño efectivo constante; p0 la frecuencia inicial.
simular_deriva <- function(N = 50L, p0 = 0.5, generaciones = 100L, replicas = 12L, semilla = 1849L) {
  stopifnot(N > 0, N == as.integer(N), p0 >= 0, p0 <= 1, generaciones >= 1, replicas >= 1)
  set.seed(semilla)
  frecuencias <- matrix(NA_real_, nrow = generaciones + 1L, ncol = replicas)
  frecuencias[1L, ] <- p0
  for (t in seq_len(generaciones)) {
    frecuencias[t + 1L, ] <- rbinom(replicas, size = 2L * N, prob = frecuencias[t, ]) / (2L * N)
  }
  frecuencias
}
trayectorias <- simular_deriva()
matplot(0:(nrow(trayectorias) - 1L), trayectorias, type = "l", lty = 1,
        xlab = "Generaciones", ylab = "Frecuencia del alelo", ylim = c(0, 1))
