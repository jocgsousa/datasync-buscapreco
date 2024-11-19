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
    pvenda FLOAT(10, 2) NOT NULL
);

CREATE TABLE aparelhos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codaparelho VARCHAR(200) NOT NULL,
    autorized BOOLEAN
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