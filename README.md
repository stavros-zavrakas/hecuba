# Overview

Hecuba is an Apache Cassandra ORM for Node.js

Documentation.. coming soon..!

## Find

Available where queries:

```
{
  field_name: 'Stav',
  field_name: {
    $in: ['5151df1c-d931-11e6-bf26-cec0c932ce01']
  },
  field_name: {
    $gte: 50,
    $lte: 250
  },
  $orderBy: {
    $desc: 'field_name'
  },
  $limit: 1
}
```

There is a plan to support more complex in queries like:

- Complex IN queries:

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/useQueryIN.html

```
{
  $in: {
    fields: [
      'field_name_start_date',
      'field_name_end_date'
    ],
    values: [
      ['2015-05-09', '2015-05-31'],
      ['2015-05-06', '2015-05-31']
    ]
  }
}
```

- Slicing queries:

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



## @todo:

- Support select as queries instead of providing always everything

- Support complex IN queries

    @see: https://docs.datastax.com/en/cql/3.1/cql/cql_using/useQueryIN.html

```
{
  $in: {
    fields: [
      'event_start_date',
      'event_end_date'
    ],
    values: [
      ['2015-05-09', '2015-05-31'],
      ['2015-05-06', '2015-05-31']
    ]
  }
}
```

Example:

```
calendarModel.find({
  $in: {
    fields: [
      'event_start_date',
      'event_end_date'
    ],
    values: [
      ['2015-05-09', '2015-05-31'],
      ['2015-05-06', '2015-05-31']
    ]
  }
}, (err, data) => {
  if (err) {
    logger.error('Error finding events using an IN query', err);
  }

  logger.info('Find by using in query on calendar', data);
});
```

It must produce this query:

```
SELECT * FROM calendar WHERE event_id IN (100, 101, 102) 
  AND (event_start_date, event_end_date) IN (('2015-05-09', '2015-05-31'), ('2015-05-06', '2015-05-31'));

```

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

Example:

```
timelineModel.find({
  day: '12 Jan 2014',
  $slice: [{
    operator: '$gte',
    fields: ['hours', 'minute'],
    values: [3, 50]
  }, {
    operator: '$lte',
    fields: ['hours', 'minute', 'second'],
    values: [3, 50]
  }],
  $limit: 10
}, (err, data) => {
  if (err) {
    logger.error('Error finding timelines using a slice query', err);
  }

  logger.info('Find by timeline by slicing', data);
});
```

It must produce this query:

```
SELECT * FROM timeline WHERE day='12 Jan 2014'
  AND (hour, min) >= (3, 50)
  AND (hour, min, sec) <= (4, 37, 30);
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
