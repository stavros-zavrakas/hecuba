CREATE KEYSPACE hecuba WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': '1'
};

USE hecuba;

CREATE TABLE user (
  user_id timeuuid,
  first_name text,
  last_name text,
  is_confirmed boolean,
  PRIMARY KEY ((user_id), last_name)
);

CREATE TABLE book (
  book_id timeuuid,
  title text,
  description text,
  isbn text,
  PRIMARY KEY (book_id)
);

INSERT INTO user (user_id, first_name, last_name, is_confirmed) VALUES (5151df1c-d931-11e6-bf26-cec0c932ce01, 'Stavros', 'Zavrakas', true);