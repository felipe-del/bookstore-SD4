CREATE TABLE IF NOT EXISTS authors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT
);
CREATE TABLE IF NOT EXISTS publishers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT
);
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author_id INT REFERENCES authors(id) ON DELETE SET NULL,
  publisher_id INT REFERENCES publishers(id) ON DELETE SET NULL,
  year INT
);
INSERT INTO authors (name, country) VALUES ('Gabriel García Márquez','Colombia'),('Carmen Lyra','Costa Rica');
INSERT INTO publishers (name, city) VALUES ('Alfaguara','Madrid'),('EUNED','San José');
INSERT INTO books (title, author_id, publisher_id, year) VALUES ('Cien años de soledad',1,1,1967),('Cuentos de mi tía Panchita',2,2,1920);
