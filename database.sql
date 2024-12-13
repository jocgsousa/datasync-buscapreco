CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE, -- Reduzido para 100 caracteres
    senha VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE, -- Reduzido para 11 caracteres
    telefone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codprod INT(10) NOT NULL,
    codauxiliar VARCHAR(20) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    pvenda FLOAT(10, 2) NOT NULL,
    descontofidelidade FLOAT(10, 2) NOT NULL DEFAULT 0,
    pvendafidelidade FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filial_2 FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filial_3 FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filial_4 FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filial_5 FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filial_6 FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filial_7 FLOAT(10, 2) NOT NULL DEFAULT 0,
    oferta_filiais_offers INT(10) NOT NULL DEFAULT 0
);

CREATE TABLE aparelhos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codaparelho VARCHAR(200) NOT NULL,
    autorized BOOLEAN
);

CREATE TABLE pcativi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codativi VARCHAR(200) NOT NULL,
    ramo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
); 

CREATE TABLE pccidade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codcidade VARCHAR(200) NOT NULL,
    nomecidade VARCHAR(255) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
); 

INSERT INTO
  `usuarios` (
    `id`,
    `nome`,
    `email`,
    `senha`,
    `cpf`,
    `telefone`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'ADMIN',
    'admin@gmail.com',
    '$2y$10$EhvQdSAYHUrfUdGVllKIju9QuIcflj/AzAC61mbjIStf9F/ekEDgK',
    '12345678910',
    '94981111111',
    '2024-11-06 12:48:53',
    '2024-11-06 14:27:47'
  );