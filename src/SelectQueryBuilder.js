'use strict';

const _ = require('lodash');

const C = require('./constants');

const QueryBuilder = require('./QueryBuilder');

class SelectQueryBuilder extends QueryBuilder {
  constructor(table, where, options = {}) {
    super(where);

    this.table = table;
    this.where = where;
    this.whereFields = Object.keys(this.where);
    this.options = options;
  }

  /**
   * Validates the where clause. All the fields that exist in the
   * where clause MUST exist either in the partitionKey or in the
   * clusteringColumn or in the indexes
   *
   * @param  partitionKeys the partitionKeys of the model that we
   *         are trying to query
   * @param  clusteringColumns the clusteringColumns of the model 
   *         that we are trying to query
   * @param  indexes the indexes of the model that we are trying 
   *         to query
   * @return A boolean that indecates if the where clause make sense
   *         depending on the defined partitionKeys, clusteringColumns
   *         and indexes of the model
   */
  _isValidWhereClause(imports) {
    const { partitionKeys, clusteringColumns, indexes } = imports;

    return this.whereFields.every(field => {
      // Exclude from validation the fields with the keys $orderby and $limit
      // @todo: we have to validate the $in query
      if (field === C.ORDER_BY_KEY || field === C.LIMIT_KEY || C.IN_KEY) {
        return true;
      }

      let isPartOfPartitionKey = partitionKeys.indexOf(field) > -1;
      let isPartOfClusteringColumn = clusteringColumns.indexOf(field) > -1;
      let isPartOfIndex = indexes.indexOf(field) > -1;

      return isPartOfPartitionKey || isPartOfClusteringColumn || isPartOfIndex;
    });
  }

  _generateFilters(filters) {
    let filter = '';

    if (filters.orderBy) {
      filter += filters.orderBy;
    }

    if (filters.limit) {
      filter += filters.limit;
    }

    return filter;
  }

  /**
   * Validates and crunches the whereClause. Finally returns an object
   * that will be used from the cassandra driver.
   *
   * @param  partitionKeys the partitionKeys of the model that we
   *         are trying to query
   * @param  clusteringColumns the clusteringColumns of the model 
   *         that we are trying to query
   * @param  indexes the indexes of the model that we are trying 
   *         to query
   *
   * @return An object with the query string (having placeholders)
   *         and the values that will be substituted in the query
   *         string
   */
  getSelectQuery(imports) {
    let string = `${C.SELECT} * ${C.FROM} ${this.table}`;
    let queryObject = {};

    if (!_.isEmpty(this.where)) {
      const isValid = this._isValidWhereClause(imports);

      if (!isValid) {
        throw new Error(`Some elements of the where clause are not part of the schema (${this.table})`);
      }

      queryObject = super._analyzeWhereObject(this.where);

      string += super._generateWhereClause(queryObject.fields);

      string += this._generateFilters(queryObject.filters);
    }

    return {
      string: string,
      values: queryObject.values || []
    };
  }

}

module.exports = SelectQueryBuilder;