
CREATE DATABASE IF NOT EXISTS rampify
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE rampify;

CREATE TABLE IF NOT EXISTS rol (
  id_rol TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estado_cuenta (
  id_estado_cuenta TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_estado_cuenta),
  UNIQUE KEY uq_estado_cuenta_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  id_rol TINYINT UNSIGNED NOT NULL,
  id_estado_cuenta TINYINT UNSIGNED NOT NULL,
  nombre VARCHAR(100) NULL,
  correo VARCHAR(254) NULL,
  contrasena_hash VARCHAR(255) NULL,
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueo_hasta DATETIME NULL,
  ultimo_acceso DATETIME NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_correo (correo),
  CONSTRAINT fk_login_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol),
  CONSTRAINT fk_login_estado FOREIGN KEY (id_estado_cuenta) REFERENCES estado_cuenta (id_estado_cuenta),
  CONSTRAINT ck_login_intentos CHECK (intentos_fallidos <= 5)
) ENGINE=InnoDB;

INSERT IGNORE INTO rol (id_rol, nombre) VALUES
  (1, 'Usuario de la app'),
  (2, 'Empleado de la asociación'),
  (3, 'Administrador del sistema');

INSERT IGNORE INTO estado_cuenta (id_estado_cuenta, nombre) VALUES
  (1, 'Activa'),
  (2, 'Pendiente de autorización'),
  (3, 'Suspendida'),
  (4, 'Baneada'),
  (5, 'Eliminada');
