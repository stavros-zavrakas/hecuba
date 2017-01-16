--- Create and use the keyspace

CREATE KEYSPACE hecuba WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': '1'
};

USE hecuba;

--- Create the users table and seed the users table

CREATE TABLE users (
  user_id timeuuid,
  first_name text,
  last_name text,
  age int,
  is_confirmed boolean,
  PRIMARY KEY ((user_id), last_name)
);

INSERT INTO users (user_id, first_name, last_name, age, is_confirmed) VALUES (5151df1c-d931-11e6-bf26-cec0c932ce01, 'Stavros', 'Zavrakas', 28, true);

--- Create the books table

CREATE TABLE books (
  book_id timeuuid,
  title text,
  description text,
  isbn text,
  PRIMARY KEY (book_id)
);

--- Create the products table and seed the products table

CREATE TABLE products (
  store_id timeuuid,
  price int,
  product_id timeuuid,
  title text,
  description text,
  PRIMARY KEY ((store_id), price, product_id)
) WITH CLUSTERING ORDER BY (price DESC);

INSERT INTO products (store_id, price, product_id, description, title) 
VALUES (2bf51c4a-da5b-11e6-bf26-cec0c932ce01, 100, eaacafe4-da57-11e6-bf26-cec0c932ce01, 'description', 'title') ;

INSERT INTO products (store_id, price, product_id, description, title) 
VALUES (2bf51c4a-da5b-11e6-bf26-cec0c932ce01, 200, eaacafe4-da57-11e6-bf26-cec0c932ce02, 'description1', 'title2') ;

--- Create the videos table and seed the videos table

CREATE TABLE videos (
  video_id timeuuid,
  name text,
  runtime int,
  year int,
  PRIMARY KEY ((year), name)
) WITH CLUSTERING ORDER BY (name DESC);

INSERT INTO videos (video_id, name, runtime, year) VALUES (5151df1c-d931-11e6-bf26-cec0c932ce01, 'Interstellar', 120, 2016);
INSERT INTO videos (video_id, name, runtime, year) VALUES (5151df1c-d931-11e6-bf26-cec0c932ce02, 'Ionic', 130, 2016);

--- Create the timeline table and seed the timeline table

CREATE TABLE timeline (
  day text,
  hour int,
  min int,
  sec int,
  value text,
  PRIMARY KEY (day, hour, min, sec)
);
   
INSERT INTO timeline (day, hour, min, sec, value)
VALUES ('12 Jan 2014', 3, 43, 12, 'event1');
INSERT INTO timeline (day, hour, min, sec, value)
VALUES ('12 Jan 2014', 3, 52, 58, 'event2');
INSERT INTO timeline (day, hour, min, sec, value)
VALUES ('12 Jan 2014', 4, 37, 01, 'event3');
INSERT INTO timeline (day, hour, min, sec, value)
VALUES ('12 Jan 2014', 4, 37, 41, 'event3');
INSERT INTO timeline (day, hour, min, sec, value)
VALUES ('12 Jan 2014', 6, 00, 34, 'event4');

SELECT * FROM timeline;

SELECT * FROM timeline WHERE day='12 Jan 2014'
   AND (hour, min) >= (3, 50)
   AND (hour, min, sec) <= (4, 37, 30);