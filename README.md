# Overview

Hecuba is an Apache Cassandra ORM for Node.js

Documentation.. coming soon..!

@todo:

- Updates and delete queries support

- Support select as queries instead of providing always

- Support complex IN queries

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/useQueryIN.html

- Add support for slice partition queries

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/use-slice-partition.html

```
    {
      $slice: {
        operator: '$gte',
        fields: ['minute', 'hours'],
        values: [3, 50]
      }
    } 
```

- Add support for custom data types queries

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/cqlUseUDT.html

- Support TTL for inserts and updates

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/use_expire_t.html

- Support the writetime function on select queries

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/use_writetime.html

- Support lightweight transactions (IF NOT EXISTS)

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/use_ltweight_transaction_t.html

- Counter support

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/use_counter_t.html

- Materialized view support

    @see: https://docs.datastax.com/en/cql/3.3/cql/cql_using/useCreateMV.html
