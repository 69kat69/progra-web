-- =====================================================================
-- RAMPIFY - Script de base de datos v2 (MySQL 8.0.16 o superior)
-- 18 tablas: 5 catálogos, 5 de cuentas, 5 de reportes y 3 de soporte.
-- Las restricciones CHECK solo se aplican desde MySQL 8.0.16.
--
-- CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR
--  1. Se elimina asociacion_civil y usuario.id_asociacion (una sola asociación).
--  2. Se elimina el estado de cuenta "Pendiente de eliminación": la cuenta
--     sigue Activa y la eliminación se programa en fecha_eliminacion_programada.
--  3. La imagen se guarda en la base: nueva tabla imagen_reporte (MEDIUMBLOB)
--     y se elimina reporte.ruta_imagen.
--  4. criterio_invalido agrega el valor "Solicitud del autor" (RF_12).
--  5. solicitud_eliminacion_reporte: estados Pendiente/Aprobada/Rechazada,
--     motivo de rechazo, administrador y fecha de resolución (RF_12).
--  6. codigo_verificacion: contador de intentos incorrectos (RF_02, RF_17).
--  7. usuario: fecha_aceptacion_aviso (aviso de privacidad, RF_03 a RF_05).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS rampify
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE rampify;

-- =====================================================================
-- 1. CATÁLOGOS
-- =====================================================================

CREATE TABLE rol (
  id_rol  TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(30)      NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE estado_cuenta (
  id_estado_cuenta  TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(30)      NOT NULL,
  PRIMARY KEY (id_estado_cuenta),
  UNIQUE KEY uq_estado_cuenta_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE estado_reporte (
  id_estado_reporte  TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre             VARCHAR(20)      NOT NULL,
  PRIMARY KEY (id_estado_reporte),
  UNIQUE KEY uq_estado_reporte_nombre (nombre)
) ENGINE=InnoDB;

-- Criterios de reporte inválido (RF_13) y motivos de eliminación (RF_12).
-- "Solicitud del autor" solo se usa al eliminar un reporte, no al rechazarlo.
CREATE TABLE criterio_invalido (
  id_criterio  TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(60)      NOT NULL,
  PRIMARY KEY (id_criterio),
  UNIQUE KEY uq_criterio_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE tipo_problema (
  id_tipo_problema  INT          NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(60)  NOT NULL,
  activo            BOOLEAN      NOT NULL DEFAULT 1,
  fecha_creacion    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tipo_problema),
  UNIQUE KEY uq_tipo_problema_nombre (nombre),
  CONSTRAINT ck_tipo_problema_nombre CHECK (CHAR_LENGTH(nombre) BETWEEN 2 AND 60)
) ENGINE=InnoDB;

-- =====================================================================
-- 2. CUENTAS
-- =====================================================================

-- Los campos nombre, correo y contrasena_hash aceptan NULL porque se
-- vacían al eliminar los datos personales (RF_15 y RF_29).
-- fecha_eliminacion_programada: fecha de ejecución de la eliminación de la
-- cuenta propia (RF_15); la cuenta sigue Activa durante el periodo de gracia.
-- fecha_aceptacion_aviso: NULL solo en el primer administrador creado por script.
CREATE TABLE usuario (
  id_usuario                    INT               NOT NULL AUTO_INCREMENT,
  id_rol                        TINYINT UNSIGNED  NOT NULL,
  id_estado_cuenta              TINYINT UNSIGNED  NOT NULL,
  nombre                        VARCHAR(100)      NULL,
  correo                        VARCHAR(254)      NULL,
  contrasena_hash               VARCHAR(255)      NULL,
  intentos_fallidos             TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  bloqueo_hasta                 DATETIME          NULL,
  ultimo_acceso                 DATETIME          NULL,
  fecha_registro                DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_aceptacion_aviso        DATETIME          NULL,
  fecha_eliminacion_programada  DATETIME          NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_correo (correo),
  KEY ix_usuario_rol (id_rol),
  KEY ix_usuario_estado (id_estado_cuenta),
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol),
  CONSTRAINT fk_usuario_estado_cuenta
    FOREIGN KEY (id_estado_cuenta) REFERENCES estado_cuenta (id_estado_cuenta),
  CONSTRAINT ck_usuario_nombre
    CHECK (nombre IS NULL OR CHAR_LENGTH(nombre) BETWEEN 2 AND 100),
  CONSTRAINT ck_usuario_intentos CHECK (intentos_fallidos <= 5)
) ENGINE=InnoDB;

-- Códigos de 6 dígitos para recuperar la contraseña y actualizar el correo.
-- Vigencia de 10 minutos, hasta 5 intentos incorrectos por código y máximo
-- 3 reenvíos en cualquier periodo de 60 minutos (se cuentan las filas con
-- fecha_creacion dentro de los últimos 60 minutos; el envío inicial no cuenta).
CREATE TABLE codigo_verificacion (
  id_codigo            INT           NOT NULL AUTO_INCREMENT,
  id_usuario           INT           NOT NULL,
  tipo                 ENUM('Recuperación','Cambio de correo') NOT NULL,
  correo_destino       VARCHAR(254)  NOT NULL,
  codigo_hash          VARCHAR(255)  NOT NULL,
  intentos_incorrectos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  fecha_creacion       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion     DATETIME      NOT NULL,
  usado                BOOLEAN       NOT NULL DEFAULT 0,
  PRIMARY KEY (id_codigo),
  KEY ix_codigo_usuario_tipo_fecha (id_usuario, tipo, fecha_creacion),
  CONSTRAINT fk_codigo_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_codigo_vigencia CHECK (fecha_expiracion > fecha_creacion),
  CONSTRAINT ck_codigo_intentos CHECK (intentos_incorrectos <= 5)
) ENGINE=InnoDB;

CREATE TABLE invitacion_admin (
  id_invitacion      INT           NOT NULL AUTO_INCREMENT,
  id_admin           INT           NOT NULL,
  correo             VARCHAR(254)  NOT NULL,
  token_hash         VARCHAR(255)  NOT NULL,
  fecha_creacion     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion   DATETIME      NOT NULL,
  usada              BOOLEAN       NOT NULL DEFAULT 0,
  id_usuario_creado  INT           NULL,
  PRIMARY KEY (id_invitacion),
  UNIQUE KEY uq_invitacion_token (token_hash),
  KEY ix_invitacion_admin (id_admin),
  KEY ix_invitacion_correo (correo),
  KEY ix_invitacion_usuario_creado (id_usuario_creado),
  CONSTRAINT fk_invitacion_admin
    FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_invitacion_usuario_creado
    FOREIGN KEY (id_usuario_creado) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_invitacion_vigencia CHECK (fecha_expiracion > fecha_creacion)
) ENGINE=InnoDB;

CREATE TABLE decision_registro (
  id_decision     INT           NOT NULL AUTO_INCREMENT,
  id_usuario      INT           NOT NULL,
  id_admin        INT           NOT NULL,
  decision        ENUM('Aprobar','Rechazar') NOT NULL,
  motivo          VARCHAR(200)  NULL,
  fecha_decision  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_decision),
  KEY ix_decision_usuario (id_usuario),
  KEY ix_decision_admin (id_admin),
  CONSTRAINT fk_decision_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_decision_admin
    FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_decision_motivo
    CHECK (decision = 'Aprobar' OR (motivo IS NOT NULL AND CHAR_LENGTH(motivo) BETWEEN 10 AND 200))
) ENGINE=InnoDB;

CREATE TABLE sancion_cuenta (
  id_sancion    INT           NOT NULL AUTO_INCREMENT,
  id_usuario    INT           NOT NULL,
  id_admin      INT           NOT NULL,
  tipo          ENUM('Suspensión','Baneo') NOT NULL,
  motivo        VARCHAR(60)   NOT NULL,
  comentario    VARCHAR(300)  NULL,
  dias          SMALLINT UNSIGNED NULL,
  fecha_inicio  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin     DATETIME      NULL,
  activa        BOOLEAN       NOT NULL DEFAULT 1,
  PRIMARY KEY (id_sancion),
  KEY ix_sancion_usuario (id_usuario),
  KEY ix_sancion_admin (id_admin),
  CONSTRAINT fk_sancion_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_sancion_admin
    FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_sancion_dias CHECK (dias IS NULL OR dias BETWEEN 1 AND 365),
  CONSTRAINT ck_sancion_tipo CHECK (
    (tipo = 'Suspensión' AND dias IS NOT NULL AND fecha_fin IS NOT NULL)
    OR (tipo = 'Baneo' AND dias IS NULL AND fecha_fin IS NULL)
  )
) ENGINE=InnoDB;

-- =====================================================================
-- 3. REPORTES
-- =====================================================================

-- Eliminación lógica (RF_12): eliminado = 1 con fecha y motivo.
CREATE TABLE reporte (
  id_reporte               INT               NOT NULL AUTO_INCREMENT,
  folio                    CHAR(12)          NOT NULL,
  id_usuario               INT               NOT NULL,
  id_tipo_problema         INT               NOT NULL,
  id_estado_reporte        TINYINT UNSIGNED  NOT NULL DEFAULT 1,
  descripcion              VARCHAR(500)      NOT NULL,
  latitud                  DECIMAL(9,6)      NOT NULL,
  longitud                 DECIMAL(9,6)      NOT NULL,
  fecha_creacion           DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminado                BOOLEAN           NOT NULL DEFAULT 0,
  fecha_eliminacion        DATETIME          NULL,
  id_criterio_eliminacion  TINYINT UNSIGNED  NULL,
  PRIMARY KEY (id_reporte),
  UNIQUE KEY uq_reporte_folio (folio),
  KEY ix_reporte_usuario (id_usuario),
  KEY ix_reporte_tipo (id_tipo_problema),
  KEY ix_reporte_estado (id_estado_reporte),
  KEY ix_reporte_criterio (id_criterio_eliminacion),
  KEY ix_reporte_fecha (fecha_creacion),
  KEY ix_reporte_ubicacion (latitud, longitud),
  CONSTRAINT fk_reporte_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_reporte_tipo_problema
    FOREIGN KEY (id_tipo_problema) REFERENCES tipo_problema (id_tipo_problema),
  CONSTRAINT fk_reporte_estado
    FOREIGN KEY (id_estado_reporte) REFERENCES estado_reporte (id_estado_reporte),
  CONSTRAINT fk_reporte_criterio
    FOREIGN KEY (id_criterio_eliminacion) REFERENCES criterio_invalido (id_criterio),
  CONSTRAINT ck_reporte_folio
    CHECK (CHAR_LENGTH(folio) = 12 AND folio LIKE 'RMP-%'),
  CONSTRAINT ck_reporte_descripcion
    CHECK (CHAR_LENGTH(descripcion) BETWEEN 10 AND 500),
  CONSTRAINT ck_reporte_latitud  CHECK (latitud  BETWEEN -90  AND 90),
  CONSTRAINT ck_reporte_longitud CHECK (longitud BETWEEN -180 AND 180),
  CONSTRAINT ck_reporte_eliminacion CHECK (
    (eliminado = 0 AND fecha_eliminacion IS NULL AND id_criterio_eliminacion IS NULL)
    OR (eliminado = 1 AND fecha_eliminacion IS NOT NULL AND id_criterio_eliminacion IS NOT NULL)
  )
) ENGINE=InnoDB;

-- Imagen del reporte guardada en la base (JPG o PNG, máximo 5 MB).
-- Se consulta solo en el detalle del reporte; no usar SELECT * en las listas.
-- Si el servidor lo requiere, subir max_allowed_packet a 8 MB o más.
CREATE TABLE imagen_reporte (
  id_reporte   INT          NOT NULL,
  imagen       MEDIUMBLOB   NOT NULL,
  tipo_mime    ENUM('image/jpeg','image/png') NOT NULL,
  fecha_carga  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_reporte),
  CONSTRAINT fk_imagen_reporte
    FOREIGN KEY (id_reporte) REFERENCES reporte (id_reporte),
  CONSTRAINT ck_imagen_tamano CHECK (OCTET_LENGTH(imagen) <= 5242880)
) ENGINE=InnoDB;

CREATE TABLE historial_estado_reporte (
  id_historial        INT               NOT NULL AUTO_INCREMENT,
  id_reporte          INT               NOT NULL,
  id_estado_anterior  TINYINT UNSIGNED  NULL,
  id_estado_nuevo     TINYINT UNSIGNED  NOT NULL,
  id_responsable      INT               NOT NULL,
  id_criterio         TINYINT UNSIGNED  NULL,
  comentario          VARCHAR(300)      NULL,
  fecha_cambio        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_historial),
  KEY ix_historial_reporte (id_reporte, fecha_cambio),
  KEY ix_historial_anterior (id_estado_anterior),
  KEY ix_historial_nuevo (id_estado_nuevo),
  KEY ix_historial_responsable (id_responsable),
  KEY ix_historial_criterio (id_criterio),
  CONSTRAINT fk_historial_reporte
    FOREIGN KEY (id_reporte) REFERENCES reporte (id_reporte),
  CONSTRAINT fk_historial_estado_anterior
    FOREIGN KEY (id_estado_anterior) REFERENCES estado_reporte (id_estado_reporte),
  CONSTRAINT fk_historial_estado_nuevo
    FOREIGN KEY (id_estado_nuevo) REFERENCES estado_reporte (id_estado_reporte),
  CONSTRAINT fk_historial_responsable
    FOREIGN KEY (id_responsable) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_historial_criterio
    FOREIGN KEY (id_criterio) REFERENCES criterio_invalido (id_criterio)
) ENGINE=InnoDB;

CREATE TABLE denuncia_usuario (
  id_denuncia     INT           NOT NULL AUTO_INCREMENT,
  id_reporte      INT           NOT NULL,
  id_denunciante  INT           NOT NULL,
  id_denunciado   INT           NOT NULL,
  motivo          ENUM('Mal uso de la app','Incumple Términos y Condiciones') NOT NULL,
  comentario      VARCHAR(300)  NULL,
  fecha_denuncia  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_denuncia),
  UNIQUE KEY uq_denuncia_reporte_denunciante (id_reporte, id_denunciante),
  KEY ix_denuncia_denunciante (id_denunciante),
  KEY ix_denuncia_denunciado (id_denunciado),
  CONSTRAINT fk_denuncia_reporte
    FOREIGN KEY (id_reporte) REFERENCES reporte (id_reporte),
  CONSTRAINT fk_denuncia_denunciante
    FOREIGN KEY (id_denunciante) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_denuncia_denunciado
    FOREIGN KEY (id_denunciado) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_denuncia_distintos CHECK (id_denunciante <> id_denunciado)
) ENGINE=InnoDB;

-- Solicitud de eliminación de un reporte propio (RF_14). El Administrador
-- la aprueba (elimina el reporte) o la rechaza con motivo (RF_12).
CREATE TABLE solicitud_eliminacion_reporte (
  id_solicitud      INT           NOT NULL AUTO_INCREMENT,
  id_reporte        INT           NOT NULL,
  id_usuario        INT           NOT NULL,
  motivo            VARCHAR(300)  NOT NULL,
  estado            ENUM('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  motivo_rechazo    VARCHAR(200)  NULL,
  id_admin          INT           NULL,
  fecha_solicitud   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion  DATETIME      NULL,
  PRIMARY KEY (id_solicitud),
  KEY ix_solicitud_reporte (id_reporte, estado),
  KEY ix_solicitud_usuario (id_usuario),
  KEY ix_solicitud_admin (id_admin),
  CONSTRAINT fk_solicitud_reporte
    FOREIGN KEY (id_reporte) REFERENCES reporte (id_reporte),
  CONSTRAINT fk_solicitud_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_solicitud_admin
    FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_solicitud_motivo CHECK (CHAR_LENGTH(motivo) BETWEEN 10 AND 300),
  CONSTRAINT ck_solicitud_resolucion CHECK (
    (estado = 'Pendiente' AND id_admin IS NULL AND fecha_resolucion IS NULL AND motivo_rechazo IS NULL)
    OR (estado = 'Aprobada' AND id_admin IS NOT NULL AND fecha_resolucion IS NOT NULL AND motivo_rechazo IS NULL)
    OR (estado = 'Rechazada' AND id_admin IS NOT NULL AND fecha_resolucion IS NOT NULL
        AND motivo_rechazo IS NOT NULL AND CHAR_LENGTH(motivo_rechazo) BETWEEN 10 AND 200)
  )
) ENGINE=InnoDB;

-- =====================================================================
-- 4. SOPORTE
-- =====================================================================

CREATE TABLE alerta_usuario (
  id_alerta    INT           NOT NULL AUTO_INCREMENT,
  id_usuario   INT           NOT NULL,
  id_admin     INT           NOT NULL,
  mensaje      VARCHAR(300)  NOT NULL,
  fecha_envio  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_alerta),
  KEY ix_alerta_usuario (id_usuario),
  KEY ix_alerta_admin (id_admin),
  CONSTRAINT fk_alerta_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_alerta_admin
    FOREIGN KEY (id_admin) REFERENCES usuario (id_usuario),
  CONSTRAINT ck_alerta_mensaje CHECK (CHAR_LENGTH(mensaje) BETWEEN 10 AND 300)
) ENGINE=InnoDB;

CREATE TABLE preferencia_notificacion (
  id_usuario                 INT      NOT NULL,
  notif_estado_reporte       BOOLEAN  NOT NULL DEFAULT 1,
  notif_eliminacion_reporte  BOOLEAN  NOT NULL DEFAULT 1,
  PRIMARY KEY (id_usuario),
  CONSTRAINT fk_preferencia_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bitacora (
  id_bitacora  BIGINT            NOT NULL AUTO_INCREMENT,
  id_usuario   INT               NOT NULL,
  id_rol       TINYINT UNSIGNED  NOT NULL,
  accion       VARCHAR(60)       NOT NULL,
  entidad      VARCHAR(40)       NULL,
  id_entidad   INT               NULL,
  detalle      VARCHAR(255)      NULL,
  fecha_hora   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bitacora),
  KEY ix_bitacora_usuario (id_usuario),
  KEY ix_bitacora_rol (id_rol),
  KEY ix_bitacora_fecha (fecha_hora),
  CONSTRAINT fk_bitacora_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_bitacora_rol
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. DATOS INICIALES DE LOS CATÁLOGOS FIJOS
-- =====================================================================

INSERT INTO rol (id_rol, nombre) VALUES
  (1, 'Usuario de la app'),
  (2, 'Empleado de la asociación'),
  (3, 'Administrador del sistema');

INSERT INTO estado_cuenta (id_estado_cuenta, nombre) VALUES
  (1, 'Activa'),
  (2, 'Pendiente de autorización'),
  (3, 'Suspendida'),
  (4, 'Baneada'),
  (5, 'Eliminada');

INSERT INTO estado_reporte (id_estado_reporte, nombre) VALUES
  (1, 'Pendiente'),
  (2, 'En proceso'),
  (3, 'Solucionado'),
  (4, 'Rechazado');

INSERT INTO criterio_invalido (id_criterio, nombre) VALUES
  (1, 'Incumple Términos y Condiciones'),
  (2, 'Sin barrera de accesibilidad en la imagen'),
  (3, 'Descripción ilegible'),
  (4, 'Solicitud del autor');

-- =====================================================================
-- 6. PRIMER ADMINISTRADOR (RT-05)
-- El primer administrador se crea solo por script, no desde la interfaz.
-- Descomenta el bloque, cambia el correo y pega un hash real generado
-- con bcrypt o Argon2 (nunca una contraseña en texto plano).
-- =====================================================================

-- INSERT INTO usuario (id_rol, id_estado_cuenta, nombre, correo, contrasena_hash)
-- VALUES (3, 1, 'Administrador inicial', 'admin@ejemplo.com', '<HASH_BCRYPT_AQUI>');