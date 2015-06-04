(function ($, shield, window, undefined) {
    "use strict";

    var Class = shield.Class,
        Dispatcher = shield.Dispatcher,

        mathMin = Math.min,
        mathMax = Math.max,

        is = shield.is,
        to = shield.to,
        get = shield.get,
        set = shield.set,
        support = shield.support,
        shieldType = shield.type,
        noop = function () { },

        extend = $.extend,
        proxy = $.proxy,
        each = $.each,
        grep = $.grep,
		inArray = $.inArray,
        Deferred = $.Deferred,

        FUNCTION = "function",
        ARRAY = "array",
        OBJECT = "object",
        STRING = "string",
        CHANGE = "change",
        ERROR = "error",
        START = "start",
        COMPLETE = "complete",
        SAVE = "save",
		AFTERSET = "afterset",

        LocalClient,
        RemoteClient,
        Cache,
        DataQuery,
        QuerySort,
        QueryFilter,
        QueryAggregate,
        DataSource,
        Schema,
        XmlSchema,
        HtmlTableSchema,
		HtmlSelectSchema,
        ChangeTracker,
        Model;


    // a custom map function
    function map(array, callback) {
        var mapped = [],
            i,
            len;

        if (array.map) {
            return array.map(callback);
        }

        for (i = 0, len = array.length; i < len; i++) {
            mapped[i] = callback(array[i], i, array);
        }

        return mapped;
    }

    // calls get and if type set, converts to it
    // making default values
    function getWithType(obj, path, type, def, nullable) {
        var value = get(obj, path);

        if (value === undefined) {
            if (type) {
                value = Model.def(type, def, nullable !== false);
            }
        }
        else {
            value = Model.convert(value, type);
        }

        return value;
    }

    // LocalClient class
    // a dummy local client class
    LocalClient = Class.extend({
        init: function (data) {
            this.data = data;
        },

        read: function (params, success, error) {
            return success(this.data);
        },

        modify: function (changes, success, error) {
            success();
        }
    });

    // RemoteClient class
    RemoteClient = Class.extend({
        init: function (options, cache) {
            this.options = options;
            this.cache = cache;
        },

        read: function (params, success, error) {
            var options = this.options,
                readOptions = options.read,
                cache = this.cache,
                cached;

            if (is.func(readOptions)) {
                readOptions(params, success, error);
                return;
            }

            readOptions = is.string(readOptions) ? {url: readOptions} : extend(true, {}, readOptions);

            if (is.func(readOptions.data)) {
                params = readOptions.data(params);
            }

            cached = cache.get(params);

            if (cached !== undefined) {
                success(cached, true);
            }
            else {
                readOptions.data = params;
                readOptions.error = error;

                readOptions.success = function (result) {
                    cache.set(params, result);
                    success(result);
                };

                $.ajax(readOptions);
            }
        },

        modify: function (changes, success, error) {
            var options = this.options,
                modifyOptions = options.modify || {},
                optionFields = ["create", "update", "remove"],
                changesFields = ["added", "edited", "removed"],
                deferreds = [],
                deferred,
                currentOptions,
                optionKey,
                changesKey,
                i,
                getModelDataFunc = function (model) { return model.data; };

            if (is.func(modifyOptions)) {
                modifyOptions(changes, success, error);
                return;
            }

            for (i = 0; i < optionFields.length; i++) {
                optionKey = optionFields[i];
                changesKey = changesFields[i];

                currentOptions = modifyOptions[optionKey];

                if (!changes[changesKey].length) {
                    deferred = deferreds[i] = new Deferred();
                    deferred.resolve();

                    continue;
                }

                if (is.string(currentOptions)) {
                    currentOptions = {url: currentOptions, type: "POST"};
                }

                if (is.func(currentOptions)) {
                    deferred = deferreds[i] = new Deferred();

                    currentOptions(
                        changes[changesKey],
                        proxy(deferred.resolve, deferred),
                        proxy(deferred.reject, deferred)
                    );
                }
                else if (is.object(currentOptions)) {
                    currentOptions = extend(true, {}, currentOptions);
                    
                    if (is.func(currentOptions.data)) {
                        currentOptions.data = currentOptions.data(changes[changesKey]);
                    }
                    else {
                        currentOptions.data = {};
                        currentOptions.data[changesKey] = map(changes[changesKey], getModelDataFunc);
                    }

                    deferred = deferreds[i] = $.ajax(currentOptions);
                }
                else {
                    deferred = deferreds[i] = new Deferred();
                    deferred.resolve();
                }
            }

            $.when.apply($, deferreds).then(success, error);
        }
    });

    // Cache class
    Cache = Class.extend({
        init: function () {
            this.values = {};
        },
        get: function (key) {
            return this.values[to.key(key)];
        },
        set: function (key, value) {
            this.values[to.key(key)] = value;
            return value;
        },
        remove: function (key) {
            var hash = to.key(key),
                value = this.values[hash];

            delete this.values[hash];

            return value;
        },
        clear: function () {
            this.values = [];
        }
    });
    Cache.noop = {
        get: noop,
        set: noop
    };

    // QuerySort class 
    QuerySort = Class.extend({
        init: function (expr, desc) {
            if (is.object(expr)) {
                expr = to.array(expr);
            }
            else if (is.string(expr)) {
                expr = [{ path: expr, desc: !!desc }];
            }

            this._expr = expr;
        },

        build: function () {
            var expression = this._expr,
                cache = QuerySort.cache;

            if (is.func(expression)) {
                // wrap the sort function because the items are wrapped
                // as dictionaries containing item and index
                return (function (func) {
                    return function (a, b) {
                        var result = func(a.item, b.item);
                        return result !== 0 ? result : a.index - b.index;
                    };
                })(expression);
            }

            if (is.array(expression)) {
                return cache.get(expression) || cache.set(expression, (function (expression) {
                    return function (a, b) {
                        var expr,
                            path,
                            mul,
                            i,
                            len,
                            valA,
                            valB,
                            result;

                        for (i = 0, len = expression.length; i < len; i++) {
                            valA = a.item;
                            valB = b.item;

                            expr = expression[i] || {};
                            path = expr.path;
                            mul = !!expr.desc ? -1 : 1;

                            if (is.string(path)) {
                                valA = get(valA, path);
                                valB = get(valB, path);
                            }
                            else if (is.func(path)) {
                                valA = path(valA);
                                valB = path(valB);
                            }

                            if (is.date(valA)) {
                                valA = valA.getTime();
                            }
                            if (is.date(valB)) {
                                valB = valB.getTime();
                            }

                            //treat null and undefined equal when sorting
                            if (valA === valB || (valA == null && valB == null)) {
                                continue;
                            }

                            if (valA == null) {
                                return -1 * mul;
                            }
                            if (valB == null) {
                                return 1 * mul;
                            }

                            if (!is.number(valA) || !is.number(valB)) {
                                valA = valA.toString();
                                valB = valB.toString();
                            }

                            if (valA.localeCompare) {
                                result = valA.localeCompare(valB);

                                if (result === 0) {
                                    continue;
                                }
                                else {
                                    return result * mul;
                                }
                            }

                            if (valA > valB) {
                                return 1 * mul;
                            }
                            if (valA < valB) {
                                return -1 * mul;
                            }
                        }

                        // this will preserve the position
                        return a.index - b.index;
                    };
                })(expression));
            }
        }
    });
    QuerySort.cache = new Cache();

    // QueryFilter class
    QueryFilter = Class.extend({
        init: function (expression) {
            this._expr = expression || [];
        },

        build: function () {
            var that = this,
                cache = QueryFilter.cache,
                expression = that._expr,
                func = that._func || (that._func = cache.get(expression));

            if (!func) {
                func = that._buildRecursive(expression, true);
                if (func) {
                    cache.set(expression, func);
                }
            }

            return func;
        },

        _single: function (expr) {
            var filter;

            if (expr) {
                if (is.func(expr.filter)) {
                    return expr.filter;
                }
                else {
                    filter = QueryFilter.filters[QueryFilter.filterAliases[expr.filter]];
                    if (filter) {
                        return (function (path, filter, value, sensitive) {
                            return function (data) {
                                return filter(get(data, path), value, sensitive);
                            };
                        })(expr.path, filter, expr.value, expr.sensitive);
                    }
                }
            }
        },

        _multiple: function (filters, logicAnd) {
            return function (data) {
                var valid = true,
                    i,
                    len = filters.length;

                for (i = 0; i < len; i++) {
                    valid = filters[i](data);

                    if (logicAnd) {
                        if (!valid) {
                            break;
                        }
                    }
                    else if (valid) {
                        break;
                    }
                }

                return valid;
            };
        },

        _buildRecursive: function (expr, logicAnd) {
            var that = this, 
                i, 
                len, 
                funcs = [];

            if (is.array(expr)) {
                for (i = 0, len = expr.length; i < len; i++) {
                    funcs.push(that._buildRecursive(expr[i]));
                }

                return funcs.length > 1 ? that._multiple(funcs, logicAnd) : funcs[0];
            }
            else if (expr.and || expr.or) {
                return that._buildRecursive(expr.and || expr.or, !!expr.and);
            }
            else {
                return that._single(expr);
            }
        }
    });
    QueryFilter.cache = new Cache();
    QueryFilter.normalize = {
        equatable: function (a, b, sensitive) {
            if (is.date(a)) {
                return {
                    a: a.getTime(),
                    b: new Date(b).getTime()
                };
            }

            return QueryFilter.normalize.string(a, b, sensitive);
        },

        string: function (a, b, sensitive) {
            return {
                a: sensitive ? a + "" : (a + "").toLowerCase(),
                b: sensitive ? b + "" : (b + "").toLowerCase()
            };
        },

        scalar: function (a, b) {
            if (is.date(a)) {
                return {
                    a: a.getTime(),
                    b: new Date(b).getTime()
                };
            }
            else if (!isNaN(parseFloat(a))) {
                return {
                    a: parseFloat(a),
                    b: parseFloat(b)
                };
            }

            return { a: a, b: b };
        }
    };
    QueryFilter.filters = {
        eq: function (a, b, sensitive) {
            var normal = QueryFilter.normalize.equatable(a, b, sensitive);
            return normal.a === normal.b;
        },
        neq: function (a, b, sensitive) {
            var normal = QueryFilter.normalize.equatable(a, b, sensitive);
            return normal.a !== normal.b;
        },
        con: function (a, b, sensitive) {
            var normal = QueryFilter.normalize.string(a, b, sensitive);
            return normal.a.indexOf(normal.b) > -1;
        },
        notcon: function (a, b, sensitive) {
            var normal = QueryFilter.normalize.string(a, b, sensitive);
            return normal.a.indexOf(normal.b) < 0;
        },
        starts: function (a, b, sensitive) {
            var normal = QueryFilter.normalize.string(a, b, sensitive);
            return normal.a.indexOf(normal.b) === 0;
        },
        ends: function (a, b, sensitive) {
            var normal = QueryFilter.normalize.string(a, b, sensitive);
            return normal.a.indexOf(normal.b) === (normal.a.length - normal.b.length);
        },
        gt: function (a, b) {
            var normal = QueryFilter.normalize.scalar(a, b);
            return normal.a > normal.b;
        },
        lt: function (a, b) {
            var normal = QueryFilter.normalize.scalar(a, b);
            return normal.a < normal.b;
        },
        gte: function (a, b) {
            var normal = QueryFilter.normalize.scalar(a, b);
            return normal.a >= normal.b;
        },
        lte: function (a, b) {
            var normal = QueryFilter.normalize.scalar(a, b);
            return normal.a <= normal.b;
        },
        isnull: function (a) {
            return a == null;
        },
        notnull: function (a) {
            return a != null;
        }
    };
    QueryFilter.filterAliases = {
        "eq": "eq",
        "equal": "eq",
        "equals": "eq",
        "==": "eq",
        "neq": "neq",
        "ne": "neq",
        "doesnotequal": "neq",
        "notequal": "neq",
        "notequals": "neq",
        "!=": "neq",
        "con": "con",
        "contains": "con",
        "notcon": "notcon",
        "doesnotcontain": "notcon",
        "notcontains": "notcon",
        "starts": "starts",
        "startswith": "starts",
        "ends": "ends",
        "endswith": "ends",
        "gt": "gt",
        "greaterthan": "gt",
        ">": "gt",
        "lt": "lt",
        "lessthan": "lt",
        "<": "lt",
        "gte": "gte",
		"ge": "gte",
        "greaterthanorequal": "gte",
        ">=": "gte",
        "lte": "lte",
		"le": "lte",
        "lessthanorequal": "lte",
        "<=": "lte",
        "isnull": "isnull",
        "null": "isnull",
        "notnull": "notnull",
        "isnotnull": "notnull"
    };

    // QueryAggregate class
    QueryAggregate = Class.extend({
        init: function() {},

        // returns a function that takes a data list and 
        // returns the aggregate based on the aggregate expression
        build: function(expression) {
            var that = this,
                cache = QueryAggregate.cache,
                func = cache.get(expression);

            if (!func) {
                func = that._build(expression);
                if (func) {
                    cache.set(expression, func);
                }
            }

            return func;
        },

        _build: function(expression) {
            if (!expression) {
                return null;
            }

            var that = this,
                field = expression.field,
                aggregate = expression.aggregate,
                type = expression.type || Number,
                convertResultFunc = function(val) {
                    if (val === undefined) {
                        return Model.def(type);
                    }
                    else {
                        return Model.convert(val, type);
                    }
                };

            if (is.func(aggregate)) {
                return aggregate;
            }
            else if (aggregate == "count") {
                return function(data) {
                    return data.length;
                };
            }
            else if (aggregate == "sum") {
                return function(data) {
                    var sum = 0,
                        length = data.length,
                        i,
                        val;

                    for (i=0; i<length; i++) {
                        val = getWithType(data[i], field, type);
                        // fix for the date, although sum of dates does not make any sense
                        sum += type == Date && is.date(val) ? val.getTime() : val;
                    }

                    return convertResultFunc(sum);
                };
            }
            else if (aggregate == "average") {
                return function(data) {
                    var sum = 0,
                        length = data.length,
                        i,
                        val;

                    for (i=0; i<length; i++) {
                        val = getWithType(data[i], field, type);
                        // fix for the date, although sum of dates does not make any sense
                        sum += type == Date && is.date(val) ? val.getTime() : val;
                    }

                    return convertResultFunc(sum / length);
                };
            }
            else if (aggregate == "min") {
                return function(data) {
                    return convertResultFunc(mathMin.apply(null, map(data, function(item) {
                        return getWithType(item, field, type);
                    })));
                };
            }
            else if (aggregate == "max") {
                return function(data) {
                    return convertResultFunc(mathMax.apply(null, map(data, function(item) {
                        return getWithType(item, field, type);
                    })));
                };
            }

            return undefined;
        }
    });
    QueryAggregate.cache = new Cache();

    // DataQuery class
    DataQuery = Class.extend({
        init: function (data, total, aggregates, groups, indices) {
            var that = this;

            that.data = data;
            that.total = total != null ? total : (data ? data.length : 0);
            that.aggregates = aggregates;
            that.groups = groups;
            that.indices = is.array(indices) ? indices.slice(0) : map(data || [], function(item, index) {
                return index;
            });
        },

        filter: function (expressions) {
            var that = this,
                filterFunction = new QueryFilter(expressions).build(),
                data = that.data,
                result = [], 
                i, 
                len, 
                item,
				newIndices = [];

            if (filterFunction) {
                for (i = 0, len = data.length; i < len; i++) {
                    item = data[i];

                    if (filterFunction(item)) {
                        result.push(item);
                        newIndices.push(that.indices[i]);
                    }
                }
				that.indices = newIndices;
            }
            else {
                result = data.slice(0);
            }

            return new DataQuery(result, result.length, that.aggregates, that.groups, that.indices);
        },

        aggregate: function(expressions) {
            var that = this,
                queryAggregate = new QueryAggregate(),
                data = that.data,
                i,
                expression,
                aggregateFunc,
                value;

            if (!is.array(expressions)) {
                expressions = [expressions];
            }

            that.aggregates = [];

            // apply each aggregate, setting the value in it
            // each one has the format:
            // { field: "xxx", aggregate: "min|max|sum|count|average|function(data){}" }
            for (i=0; i<expressions.length; i++) {
                expression = expressions[i];

                aggregateFunc = queryAggregate.build(expression);

                if (aggregateFunc) {
                    value = aggregateFunc(data, expression);
                }

                that.aggregates.push(extend({}, expression, {value: value}));
            }

            return new DataQuery(data.slice(0), that.total, that.aggregates, that.groups, that.indices);
        },

        // performs aggregation on grouped data
        // gathers the items from the lowest level groups and performs aggregation on them
        aggregateGroups: function(expressions) {
            var that = this,
                data = that.data.slice(0),
                // build a query to calculate aggregates on the inner most items
                query = new DataQuery(that._getInnerMostItems(data), null, null, null, null)
                    .aggregate(expressions);

            // return a new query with aggregates taken from the execute query above
            return new DataQuery(data, that.total, query.aggregates, that.groups, that.indices);
        },

        // returns the items from all inner-most groups within the given groups
        _getInnerMostItems: function(groups) {
            var result = [];
            each(this._getInnerMostGroups(groups), function(i, group) {
                result = result.concat(group.items);
            });
            return result;
        },

        // returns the inner-most groups
        _getInnerMostGroups: function(groups) {
            var that = this,
                result = [];

            each(groups || [], function(i, group) {
                result = result.concat(that._hasInnerGroups(group) ? that._getInnerMostGroups(group.items) : group);
            });

            return result;
        },

        // returns true if the given group has other groups as items
        _hasInnerGroups: function(group) {
            if (group && group.items && group.items.length > 0) {
                // WARNING: the below check whether the first item is a group is bad - 
                // other data structures can have the same structure and then it will be 
                // considered as a group... maybe we can add a special field to the groups

                // if the first item has items, field
                return group.items[0].field && is.array(group.items[0].items);
            }

            return false;
        },

        group: function(expressions) {
            var that = this,
                data = that.data.slice(0),
                result,
                indices,
                info;

            if (!is.array(expressions)) {
                expressions = [expressions];
            }

            if (expressions.length > 0) {
                info = that._groupData(expressions, data, that.indices);
                data = info[0];
                that.indices = info[1];
            }

            return new DataQuery(data, that.total, that.aggregates, that.groups, that.indices);
        },

        _groupData: function(_expressions, data, indices) {
            var that = this,
                result = [],
                newIndices = [],
                expressions = _expressions.slice(0),
                expression = expressions.shift(),
                field = expression.field,
                aggregate = expression.aggregate,
                aggregates,
                order = expression.order,
                comparer,
                value,
                valueGroupIndices = {},
                groupIndex,
                i,
                j;

            // works with wrapped items in order to track original indices

            // group by the first expression
            each(data, function(i, item) {
                value = get(item, field);
                groupIndex = valueGroupIndices[value];

                if (is.defined(groupIndex)) {
                    // append the wrapped item to the specified group position
                    result[groupIndex].items.push({item: item, index: indices[i]});
                }
                else {
                    // a group for this value hasn't been added yet
                    valueGroupIndices[value] = result.length;
                    result.push(extend({}, expression, {value: value, items: [{item: item, index: indices[i]}]}));
                }
            });

            // apply order - sort the groups by their value
            if (order) {
                comparer = new QuerySort("value", order == "desc").build();
                if (comparer) {
                    // wrap the groups
                    for (i=0; i<result.length; i++) {
                        result[i] = {
                            item: result[i],
                            index: i
                        };
                    }

                    result.sort(comparer);

                    // unwrap the groups
                    for (i=0; i<result.length; i++) {
                        result[i] = result[i].item;
                    }
                }
            }

            // unwrap the groups' items, recalculating the new indices
            for (i=0; i<result.length; i++) {
                for (j=0; j<result[i].items.length; j++) {
                    newIndices.push(result[i].items[j].index);
                    result[i].items[j] = result[i].items[j].item;
                }
            }

            // apply aggregates
            if (aggregate) {
                each(result, function(i, group) {
                    result[i].aggregate = new DataQuery(group.items).aggregate(aggregate).aggregates;
                });
            }            

            // if more expressions, group the items in each group
            if (expressions && expressions.length > 0) {
                var groupStart = 0,
                    newIndices2 = [];

                for (i=0; i<result.length; i++) {
                    var currentGroup = result[i],
                        groupIndices = newIndices.slice(groupStart, groupStart + (currentGroup.items ? currentGroup.items.length : 0)),
                        groupData = that._groupData(expressions, currentGroup.items, groupIndices);

                    result[i].items = groupData[0];

                    // add the returned indices to the new set of indices
                    newIndices2 = newIndices2.concat(groupData[1]);

                    groupStart += currentGroup.items ? currentGroup.items.length : 0;
                }

                newIndices = newIndices2;
            }

            return [result, newIndices];
        },

        sort: function (expr, desc) {
            var that = this,
                comparer = new QuerySort(expr, desc).build(),
                data = that.data.slice(0),
                wrappedData = [],
                length = data ? data.length : 0,
                indices = that.indices,
                i;

            if (comparer) {
                // wrap each item in a dictionary, containing its index too,
                // then sort it and finally extract the resulting indexes
                for (i=0; i<length; i++) {
                    wrappedData.push({
                        index: indices[i],
                        item: data[i]
                    });
                }

                // sort the wrapped data
                wrappedData.sort(comparer);

                // get the data and indices
                for (i=0; i<length; i++) {
                    data[i] = wrappedData[i].item;
                    that.indices[i] = wrappedData[i].index;
                }
            }

            return new DataQuery(data, that.total, that.aggregates, that.groups, that.indices);
        },

        // sort the lowest level groups' items arrays using the given sort arguments
        // adjusts indices accordingly
        sortGroups: function(expr, desc) {
            var that = this,
                data = that.data.slice(0),
                newIndices = [],
                indexStart = 0,
                processGroupFunction;

            // function to process all inner-most groups - for each one,
            // sorts its items by the given params and appends the new indices
            processGroupFunction = function(group) {
                if (that._hasInnerGroups(group)) {
                    // if group is not inner-most, recurse to its children
                    each(group.items, function(i, grp) {
                        processGroupFunction(grp);
                    });
                }
                else {
                    // group is inner-most, so sort its items
                    var sorted = new DataQuery(group.items, null, null, null, that.indices.slice(indexStart, indexStart+(group.items ? group.items.length : 0)))
                        .sort(expr, desc);

                    // replace the group item list with the sorted list
                    group.items = sorted.data;

                    // appened the indices to the new indices list - this should be OK
                    newIndices = newIndices.concat(sorted.indices);

                    // increment the start count for the next indices slice
                    indexStart += group.items ? group.items.length : 0;
                }
            };

            // call the processing function for each top-level group
            each(data, function(i, group) {
                processGroupFunction(group);
            });

            // return a new query
            return new DataQuery(data, that.total, that.aggregates, that.groups, newIndices);
        },

        // slices grouped data - all items are in the inner-most groups
        _sliceGroups: function(data, indices, start, end) {
            var that = this,
                processGroupFunction,
                addedItemsCount = 0,
                processedItemsCount = 0,
                result = [],
                newIndices = [],
                endDefined = is.defined(end);

            // if start is 0 and end is not defined - return all items
            if (start === 0 && !endDefined) {
                return [data.slice(0), indices.slice(0)];
            }

            // declare a function to find and process inner-most groups
            processGroupFunction = function(group) {
                if (that._hasInnerGroups(group)) {
                    var groupItems = [],
                        groupsItemCount = 0;

                    // if group is not inner-most, recurse to its children
                    each(group.items, function(i, grp) {
                        var itemsCount = processGroupFunction(grp);
                        if (itemsCount > 0) {
                            groupItems.push(grp);
                            groupsItemCount += itemsCount;
                        }
                    });
                    group.items = groupItems;

                    return groupsItemCount;
                }
                else {
                    // group is an inner-most group, so intelligently slice its items

                    var groupStartIndex = processedItemsCount,
                        groupItemsLength = group.items.length,
                        groupEndIndex = groupStartIndex + groupItemsLength - 1,
                        sliceStart,
                        sliceEnd;

                    if (!endDefined) {
                        if (start <= groupStartIndex) {
                            // take the whole group
                            sliceStart = 0;
                            sliceEnd = groupItemsLength;
                        }
                        else if (start >= groupStartIndex && start <= groupEndIndex) {
                            // take from start till the end of the group
                            sliceStart = mathMax(0, start - groupStartIndex);
                            sliceEnd = groupItemsLength;
                        }
                    }
                    else {  // end is defined
                        if (end - 1 >= groupEndIndex) {
                            if (start <= groupEndIndex) {
                                // take from start till the end of group
                                sliceStart = mathMax(0, start - groupStartIndex);
                                sliceEnd = groupItemsLength;
                            }
                        }
                        else if (end - 1 >= groupStartIndex) {
                            if (start <= groupEndIndex) {
                                // take from start till the specified end
                                sliceStart = mathMax(0, start - groupStartIndex);
                                sliceEnd = mathMin(groupItemsLength, end - groupStartIndex);
                            }
                        }
                    }

                    if (is.defined(sliceStart) && is.defined(sliceEnd) && sliceEnd > sliceStart) {
                        group.items = group.items.slice(sliceStart, sliceEnd);
                        newIndices = newIndices.concat(indices.slice(groupStartIndex + sliceStart, groupStartIndex + sliceEnd));
                    }
                    else {
                        group.items = [];
                    }

                    processedItemsCount += groupItemsLength;

                    return group.items.length;
                }
            };

            // call the processing function for each top-level group
            // add the group only if there are items inside it
            each(data, function(i, group) {
                var itemsCount = processGroupFunction(group);
                if (itemsCount > 0) {
                    result.push(group);
                }
            });

            return [result, newIndices];
        },

        skip: function (count) {
            var that = this;
            return new DataQuery(that.data.slice(count), that.total, that.aggregates, that.groups, that.indices.slice(count));
        },

        skipGroups: function(count) {
            var that = this,
                sliced = that._sliceGroups(that.data, that.indices, count);
            return new DataQuery(sliced[0], that.total, that.aggregates, that.groups, sliced[1]);
        },

        take: function (count) {
            var that = this;
            return new DataQuery(that.data.slice(0, count), that.total, that.aggregates, that.groups, that.indices.slice(0, count));
        },

        takeGroups: function(count) {
            var that = this,
                sliced = that._sliceGroups(that.data, that.indices, 0, count);
            return new DataQuery(sliced[0], that.total, that.aggregates, that.groups, sliced[1]);
        }
    });
    DataQuery.create = function (data, options, total, aggregates, groups) {
        options = options || {};

        var query = new DataQuery(data, total, aggregates, groups),
            remoteOperations = options.remoteOperations || [],
            remoteOperationsString = remoteOperations.join(" "),
            remoteGrouping = remoteOperationsString.indexOf("group") > -1;

		// apply grouping if needed to be applied locally or grouped data was passed 
        // as remote operation
		// group the items one or more times, creating a hierrarchy of groups if more than one;
        // when done, calculate the aggregates for each group
        // { field: "name", order: "asc|desc", aggregate: [] }
        // adds to group dict: { value: "xxx", items: [] }, also fills aggregates
		if (options.group || remoteGrouping) {
            // grouping is in place - data will be a list of groups with items in them
            // multiple nested groups is possible too

            if (options.group) {
                // we have local (client) grouping

                // apply filtering
                if (options.filter) {
                    query = query.filter(options.filter);
                }

                // apply local grouping
                query = query.group(options.group);
            }
            else {
                // remote grouping

                // NOTE: in remote grouping the grouped data returned from the server
                // must also contain any server-side fildering applied too, so we 
                // will not apply any filtering becuase it will mess up the 
                // groups already returned from the server

                // copy the passed groups as data
                query.data = query.groups;
            }

            // apply the rest of the operations on groups

            // apply aggregates on the groups
            if (options.aggregate) {
                query = query.aggregateGroups(options.aggregate);
            }

            // apply sorting
            if (options.sort) {
                query = query.sortGroups(options.sort);
            }

            // apply offset
            if (options.skip) {
                query = query.skipGroups(options.skip);
            }

            // apply limit
            if (options.take) {
                query = query.takeGroups(options.take);
            }
		}
        else {
            // no grouping - data is a list of items
            // continue with the normal operations

            // apply filtering
            if (options.filter) {
                query = query.filter(options.filter);
            }

            // apply aggregates
            if (options.aggregate) {
                query = query.aggregate(options.aggregate);
            }

            // apply sorting
            if (options.sort) {
                query = query.sort(options.sort);
            }

            // apply offset
            if (options.skip) {
                query = query.skip(options.skip);
            }

            // apply limit
            if (options.take) {
                query = query.take(options.take);
            }
        }

        return query;
    };

    // DataSource class
    DataSource = Dispatcher.extend({
        init: function (userOptions) {
            var that = this,
                options = that.options = is.array(userOptions) ? {data: userOptions} : userOptions || {},
                schemaOptions = options.schema || {},
                SchemaClass = DataSource.schemas[schemaOptions.type || "json"];

            that.data = null;

            that.filter = options.filter;
            that.sort = options.sort;
            that.skip = options.skip;
            that.take = options.take;
            that.group = options.group;
            that.aggregate = options.aggregate;

            that.schema = new SchemaClass(schemaOptions);
            that.remote = options.remote;

            that.cache = new Cache();

            Dispatcher.fn.init.call(that, options);
        },

        trigger: shield.ui.Widget.fn.trigger,

        _client: function () {
            var that = this,
                remoteOptions = that.remote;

            // based on the remote options, construct a remote client or a local one
            return is.object(remoteOptions) ?
                new RemoteClient(remoteOptions, remoteOptions.cache ? that.cache : Cache.noop) :
                new LocalClient(that.options.data);
        },

        // this function returns local and remote params for the configured operations
        _params: function () {
            var that = this,
                // all possible operations
                all = ["filter", "aggregate", "group", "sort", "skip", "take"],
                remote = that.remote,
                operations = that._remoteOperations().join(" "),
                params = {
                    local: {}, 
                    remote: {}
                },
                value;

            each(all, function (i, key) {
                value = that[key];

                if (value != null) {
                    if (remote && operations.indexOf(key) > -1) {
                        params.remote[key] = value;
                    }
                    else {
                        params.local[key] = value;
                    }
                }
            });

            return params;
        },

        // returns a list of remote operations
        _remoteOperations: function() {
            var remote = this.remote;
            return remote && remote.read ? remote.read.operations || remote.operations || [] : [];
        },

        _success: function (deferred, params, result, fromCache) {
            var that = this,
                schema = that.schema,
                processed = schema.process(result);

            that.data = processed.data;

            that._createView(processed.data, params, processed.total, processed.aggregates, processed.groups);
 
            deferred.resolve(that.view, !!fromCache);

            that.trigger(COMPLETE);

            that.trigger(CHANGE, { fromCache: !!fromCache });
        },

        _createView: function(data, params, total, aggregates, groups) {
            var that = this,
                query = DataQuery.create(
                    data, 
                    extend({}, params || that._params().local, {remoteOperations: that._remoteOperations()}),
                    total,
                    aggregates,
                    groups
                );
 
            that.view = query.data;
            that.total = query.total;
            that._indices = query.indices;
            that.aggregates = query.aggregates;
        },

        _error: function (deferred, triggerComplete, operation, error) {
            var that = this;

            deferred.reject(error);

            if (triggerComplete) {
                that.trigger(COMPLETE);
            }

            that.trigger(ERROR, {errorType: "transport", error: error, operation: operation});
        },

        read: function () {
            var that = this,
                deferred = new Deferred(),
                params = that._params(),
                evt = that.trigger(START, { params: params });

            if (!evt.isDefaultPrevented()) {
                that.cancel();

                that._client().read(
                    params.remote,
                    proxy(that._success, that, deferred, params.local),
                    proxy(that._error, that, deferred, true, "read")
                );
            }
            else {
                deferred.resolve();
            }

            return deferred.promise();
        },

        // initialize a tracker object, if required, that will track any changes made during editing
        _ensureTracker: function () {
            var that = this,
                tracker = that.tracker,
                data = that.data;

            if (tracker) {
                return;
            }

            if (!data || !is.array(data)) {
                throw new Error("shield.DataSource: cannot modify when no data array is available.");
            }

            tracker = that.tracker = new ChangeTracker({
                data: data,
                model: that.schema.model,
                events: {
                    change: function (e) {
						// recreate the view
                        that._createView(that.data);

                        // if no event passed or an event with no afterset set, 
						// trigger change on the data source
						if (!e || !e.afterset) {
							that.trigger(CHANGE);
						}
                    },
                    error: function (e) {
                        that.trigger(ERROR, {
                            errorType: "tracker",
                            path: e ? e.path : "undefined path",
                            value: e ? e.value : "undefined value",
                            error: e ? e.reason : "undefined error",
                            model: e ? e.target : "undefined target model"
                        });
                    }
                }
            });

            that.data = tracker.data;
        },

        // add a new object at the end of the data array and return an editable model for it
        add: function (obj) {            
            this._ensureTracker();
            return this.tracker.add(obj);
        },

        // insert a new object at the specified data index in the data array and return an editable model for it
        insert: function (index, obj) {            
            this._ensureTracker();
            return this.tracker.insert(index, obj);
        },

        // remove an object from the data array
        remove: function (obj) {
            this._ensureTracker();
            return this.tracker.remove(obj);
        },

        // remove an object from the data array at the specified data index
        removeAt: function (index) {
            this._ensureTracker();
            return this.tracker.removeAt(index);
        },

        // return an editable model for an object from the data array at the specified data index
        edit: function (index) {
            this._ensureTracker();
            return this.tracker.edit(index);
        },

        // insert a new object at the specified view index in the data array and return an editable model for it
        // NOTE: uses the index of the items in the view
        insertView: function (index, obj) {            
            this._ensureTracker();
            // convert the index from view to data index
            return this.tracker.insert(this._indices[index], obj);
        },

        // remove an object from the data array at the specified view index
        // NOTE: uses the index of the items in the view
        removeAtView: function (index) {
            this._ensureTracker();
            // convert the index from view to data index
            return this.tracker.removeAt(this._indices[index]);
        },

        // return an editable model for an object from the data array at the specified view index
        // NOTE: uses the index of the items in the view
        editView: function (index) {
            this._ensureTracker();
            // convert the index from view to data index
            return this.tracker.edit(this._indices[index]);
        },

        // save any changes during editing to the local data array
        // will trigger the change event by default
        save: function (triggerChange/*=true*/) {
            var that = this,
                tracker = that.tracker,
                changes = tracker ? tracker.changes : {added: [], edited: [], removed: []},
                evt = tracker && that.trigger(SAVE, {changes: changes}),
                deferred = new Deferred(),
                data,
                modified,
                i,
                triggerChangeFunc;

            // triggerChange param is true by default
            triggerChange = is.defined(triggerChange) ? !!triggerChange : true;

            if (evt && !evt.isDefaultPrevented()) {
                // replace the current DataSource data with the 
                // modified data coming from the tracker
                data = that.data = tracker.original;
                modified = tracker.data;

                data.length = 0;

                for (i = 0; i < modified.length; i++) {
                    data[i] = modified[i];
                }

                // synchronize the DS.data to DS.options.data  if the data is local
                // if the DS.options.data is defined and is not a function
                if (that.options.data && !is.func(that.options.data)) {
                    deferred.done(proxy(that._syncLocalData, that));
                }

                // call the client modify
                that._client().modify(
                    changes,
                    proxy(deferred.resolve, deferred),
                    proxy(that._error, that, deferred, false, "save")
                );

                // destroy the tracker
                tracker.destroy();
                tracker = that.tracker = null;
            }
            else {
                deferred.resolve(changes);
            }

            if (triggerChange) {
                // recreate view and trigger change 
                // after the modify operation is done
                triggerChangeFunc = function() {
                    that._createView(that.data);
                    that.trigger(CHANGE);
                };
                deferred.then(triggerChangeFunc, triggerChangeFunc);
            }

            return deferred.promise();
        },

        _syncLocalData: function() {
            var that = this,
                schema = that.schema,
                schemaFields = schema.options.fields,
                data = that.data,
                optionsData = that.options.data,
                rawItems = [],
                i,
                // determine if the first item of the options.data list is a list or not
                // take the first item from the schema, which will apply reverse mapping
                rawDataItemIsList = is.array(schema.getReverseDataFirstItem(that.options.data));

            // convert each item in the DataSource's current data list
            // from schema/model to raw format
            for (i=0; i<data.length; i++) {
                rawItems[i] = rawDataItemIsList ? [] : {};
                schema.reverseFields(data[i], rawItems[i]);
            }

            // put the converted items in raw format on the proper place, 
            // based on the schema mapping option
            // WARNING: this will replace the original data items and 
            // any properties not described in the schema will be lost
            schema.reverseData(rawItems, that.options.data);
        },

        // cancel any changes made during editing and restore the data array to its original state
        cancel: function () {
            var that = this,
                tracker = that.tracker,
                hasChanges = tracker && (tracker.changes.added.length || tracker.changes.edited.length || tracker.changes.removed.length);
            
            if (!tracker) {
                return;
            }
            
            that.data = tracker.original;

            tracker.destroy();

            tracker = that.tracker = null;
            
            if (hasChanges) {
                that._createView(that.data);
                that.trigger(CHANGE);
            }
        },

        destroy: function () {
            var that = this,
                props = ["options", "data", "total", "aggregates", "filter", "sort", "aggregate", "group", "skip", "take", "schema", "remote", "view", "cache"],
                i;

            that.cancel();

            that.cache.clear();

            for (i = 0 ; i < props.length; i++) {
                delete that[props[i]];
            }

            Dispatcher.fn.destroy.call(that);
        }
    });
    DataSource.create = function (options, additionalOptions) {
        // create a DataSource instance from an existing instance or a configuration dictionary
        // additionalOptions will be merged with the configuration options only if they are both dicts
        return options instanceof DataSource ? options : new DataSource(extend({}, options, additionalOptions));
    };

    // Schema class
    Schema = Class.extend({
        init: function (options) {
            this.options = options;
        },

        parse: function (data) {
            var optionsParse = this.options.parse;

            if (is.func(optionsParse)) {
                return optionsParse(data);
            }

            if (is.string(data)) {
                try {
                    data = $.parseJSON(data);
                }
                catch (e) { }
            }

            return data;
        },

        // extracts the proper data, based on a mapping function
        // or a string
        data: function (data) {
            var optionsData = this.options.data;

            if (is.func(optionsData)) {
                return optionsData(data);
            }
            else if (is.string(optionsData)) {
                return get(data, optionsData);
            }

            return data;
        },

		// extract any aggregates information from the schema
		aggregates: function(data) {
			var optionsAggregates = this.options.aggregates;

            if (is.func(optionsAggregates)) {
                return optionsAggregates(data);
            }
            else if (is.string(optionsAggregates)) {
                return get(data, optionsAggregates);
            }

            return undefined;
		},

		// extract any groups from the schema
		groups: function(data) {
			var optionsGroups = this.options.groups;

            if (is.func(optionsGroups)) {
                return optionsGroups(data);
            }
            else if (is.string(optionsGroups)) {
                return get(data, optionsGroups);
            }

            return undefined;
		},

        // puts the data into an object on the proper place,
        // identified by the mapping function or a string
        reverseData: function(data, target) {
            var optionsData = this.options.data,
                i;

            if (is.func(optionsData)) {
                optionsData(data, target);
            }
            else if (is.string(optionsData)) {
                set(target, optionsData, data);
            }
            else if (is.array(target)) {
                // no mapping - just copy the data items over to the target
                target.length = 0;
                for (i=0; i<data.length; i++) {
                    target[i] = data[i];
                }
            }
        },

        // return the first data item of the reversed mapping
        getReverseDataFirstItem: function(data) {
            var d = this.data(data);
            return is.array(d) && d.length > 0 ? d[0] : undefined;
        },

        total: function (data, result) {
            var optionsTotal = this.options.total;

            data = data || [];
            result = result || [];

            if (is.func(optionsTotal)) {
                return optionsTotal(data);
            }
            else if (is.string(optionsTotal)) {
                return get(data, optionsTotal);
            }

            return result.length;
        },
        
        fields: function (data) {
            var that = this,
                optionsFields = that.options.fields,
                model = that.model = Model.define(optionsFields);

            if (optionsFields) {
                return map(data, function (item) {
                    return Schema.mapFields(item, model.fn.fields);
                });
            }

            return data;
        },

        // apply the fields in reverse order on the target object, taking the values from data
        reverseFields: function() {
            var that = this,
                optionsFields = that.options.fields,
                field,
                value,
                key,
                args = [].slice.call(arguments),
                data = args[0],
                same = args.length <= 1,
                target = same ? data : args[1];

            for (key in optionsFields) {
                if (optionsFields.hasOwnProperty(key)) {
                    field = optionsFields[key];
                    value = data[key];

                    if (is.string(field.path)) {
                        // put the value in the path
                        set(target, field.path, value);
                    }
                    else if (is.func(field.path)) {
                        field.path(data, value);
                    }
                    else {
                        target[key] = value;
                    }

                    // if the target is the same, remove the field key
                    if (same) {
                        delete target[key];
                    }
                }
            }
        },

        process: function (data) {
            var that = this,
                parsed = that.parse(data),
				aggregates = that.aggregates(data),
				groups = that.groups(data),
                projected = that.fields(that.data(parsed));

            return {
                data: projected,
                total: that.total(parsed, projected)
            };
        }
    });
    Schema.mapFields = function (data, fields) {
        // create a new plain object from the provided data object, 
        // adhering to the specified field definitions
        var key, 
            field, 
            value, 
            ret = {};

        data = data || {};

        for (key in fields) {
            if (fields.hasOwnProperty(key)) {
                field = fields[key];

                if (is.string(field.path)) {
                    value = get(data, field.path);
                    if (value === undefined) {
                        value = get(data, key);
                    }
                }
                else if (is.func(field.path)) {
                    value = field.path(data);
                }
                else {
                    value = data[key];
                }

                if (value === undefined) {
                    if (field.type) {
                        value = Model.def(field.type, field.def, field.nullable !== false);
                    }
                }
                else {
                    value = Model.convert(value, field.type);
                }

                ret[key] = value;
            }
        }

        return ret;
    }

    // XmlSchema class
    XmlSchema = Schema.extend({
        parse: function (data) {
            var that = this,
                options = that.options;

            if (is.func(options.parse)) {
                data = options.parse(data);
            }
            else if (is.string(data)) {
                try {
                    data = $.parseXML(data);
                }
                catch (e) { }
            }

            if (data && data.nodeType === 9 /* XML Document element */) {
                data = that._json(that._root(data));
            }

            return data;
        },

        _root: function (xmldoc) {
            var children = xmldoc.childNodes,
                i, 
                len;

            for (i = 0, len = children.length; i < len; i++) {
                if (children[i].nodeType === 1) {
                    return children[i];
                }
            }

            return null;
        },

        _json: function (node) {
            var obj = {},
                childNames = {},
                text = "",
                child, 
                name,
                i, 
                len;

            for (i = 0, len = node.attributes.length; i < len; i++) {
                child = node.attributes[i];
                obj["_" + child.nodeName] = child.nodeValue;
            }

            for (i = 0, len = node.childNodes.length; i < len; i++) {
                child = node.childNodes[i];
                name = child.nodeName;

                switch (child.nodeType) {
                    //regular XML node
                    case 1:
                        if (childNames[name]) {
                            if (!is.array(obj[name])) {
                                obj[name] = [obj[name]];
                            }

                            obj[name].push(this._json(child));
                        }
                        else {
                            obj[name] = this._json(child);
                            childNames[name] = true;
                        }
                        break;

                        //text node
                    case 3:
                        text += child.nodeValue;
                        break;

                        //CDATA node
                    case 4:
                        obj._cdata = child.nodeValue;
                        break;
                }
            }

            text = text.replace(/^\s+(.*)\s+$/gim, "$1");

            if (text) {
                obj._text = text;
            }

            return obj;
        }
    });

    // HtmlTableSchema class
    HtmlTableSchema = Schema.extend({
        parse: function (data) {
            var options = this.options,
                parseFunc = options.parse,
                table = $(data),
                result = [],
                fields = [],
                item;
            
            if (is.func(parseFunc)) {
                return parseFunc(data);
            }
            
            if (options.result) {
                return options.result;  
            }
            
            if (!table[0] || table[0].tagName.toLowerCase() !== "table") {
                return data;
            }

            var res = table.eq(0).find("thead th").each(function () {
                fields.push($(this).text());
            }).end().find("tbody tr").each(function () {
                item = {};

                $(this).children().each(function (index) {
                    item[fields[index]] = $(this).text();
                });

                result.push(item);
            });

            options.result = result;

            return result;
        }
    });

    // HtmlSelectSchema class
	HtmlSelectSchema = Schema.extend({
		parse: function (data) {
			var options = this.options,
                parseFunc = options.parse,
                select = $(data),
                result = [],
                fields = [],
                item;

            if (is.func(parseFunc)) {
                return parseFunc(data);
            }

            if (options.result) {
                return options.result;  
            }

			if (!select[0] || select[0].tagName.toLowerCase() !== "select") {
                return data;
            }

			select.find("option").each(function(index) {
				var option = $(this);
				result.push({
					value: option.attr("value"),
					text: option.text(),
					selected: option.is(":selected")
				});
			});

			options.result = result;

            return result;
		}
	});

    // define the different data source schema types
    DataSource.schemas = {
        "json": Schema,
        "xml": XmlSchema,
        "table": HtmlTableSchema,
		"select": HtmlSelectSchema
    };

    // ChangeTracker class
    // this is the main change tracking class for supporting editing in the DataSource
    ChangeTracker = Dispatcher.extend({
        init: function (options) {
            var that = this;

            that.original = options.data;
            that.data = Array.apply(null, options.data);
            that.model = options.model;
            that.changes = {
                added: [], 
                edited: [],
                removed: []
            };

            Dispatcher.fn.init.call(this, options);
        },

        _model: function (obj) {
            var that = this,
                model = new that.model(obj);

            model.on(CHANGE, proxy(that.trigger, that, CHANGE));
            model.on(ERROR, proxy(that.trigger, that, ERROR));

			// when the model throws on save - e.g. after its data has been set,
			// trigger change for the tracker, passing afterset = true
			model.on(AFTERSET, function() {
				that.trigger(CHANGE, {afterset: true});
			});

            return model;
        },

        add: function (obj) {
            return this.insert(this.data.length, obj);
        },

        insert: function (index, obj) {
            var that = this,
                data = that.data,
                changes = that.changes,
                model;
            
            if (index < 0 || index > data.length) {
                throw new Error("shield.DataSource: invalid item index.");
            }

            model = that._model(obj);

            changes.added.push(model);
            
            data.splice(index, 0, model.data);
            
            that.trigger(CHANGE, {operation: "add", index: index, model: model});

            return model;
        },

        edit: function (index) {
            var that = this,
                data = that.data,
                changes = that.changes,
                model;
            
            if (isNaN(index) || index < 0 || index >= data.length) {
                throw new Error("shield.DataSource: invalid item index.");
            }

            model = grep(changes.added.concat(changes.edited), function (item) { return item.data === data[index]; })[0];

            if (model) {
                return model;
            }
                        
            model = that._model(data[index]);

            changes.edited.push(model);

            data[index] = model.data;

            return model;
        },

        remove: function (obj) {
            var that = this,
                changes = that.changes,
                model = grep(changes.added.concat(changes.edited), function (item) { return item === obj; })[0],
                index = -1;

            if (obj instanceof Model) {
                if (model) {
                    index = inArray(model.data, that.data);
                }
            }
            else {
                index = inArray(obj, that.data);
            }

            if (index > -1) {
                return that.removeAt(index);
            }
        },

        removeAt: function (index) {
            var that = this,
                data = that.data,
                changes = that.changes,
                model = grep(changes.added.concat(changes.edited), function (item) { return item.data === data[index]; })[0];

            if (index < 0 || index > data.length) {
                throw new Error("shield.DataSource: invalid item index.");
            }

            if (model) {
                model.destroy();
            }
            else {
                model = new that.model(data[index]);
            }

            changes.removed.push(model);
                        
            data.splice(index, 1);

            that.trigger(CHANGE, {operation: "remove", index: index, model: model});

            return model;
        },

        // destroy the tracker by removing event handlers and detaching the entire object graph
        destroy: function () {
            var that = this,
                changes = that.changes,
                all = changes.added.concat(changes.edited).concat(changes.removed),
                i;

            for (i = 0; i < all.length; i++) {
                all[i].destroy();
            }

            changes.added.length = changes.edited.length = changes.removed.length = 0;
            
            that.data = null;
            that.original = null;

            Dispatcher.fn.destroy.call(that);
        }
    });

    // Model class
    // this is a class that implements the observable pattern for tracking and notifying changes to the fields
    // data argument is the plain object providing the initial data
    // options argument is an additional object with options, e.g. event handlers for the change and error events
    Model = Dispatcher.extend({
        init: function (data, options) {
            var that = this;

            Dispatcher.fn.init.call(that, options);

            that.fields = extend(true, {}, that.constructor.prototype.fields);
            that.data = extend(true, {}, data);
        },

        // implement the trigger method of the Widget class to support additional event object properties
        trigger: shield.ui.Widget.fn.trigger,

        // return the value from the specified field
        get: function (path) {
            return get(this.data, path);
        },
        
        // set the value at the specified path
        set: function (path, value) {
            var that = this;

            value = that.validate(path, value);
   
            if (value !== undefined) {
                set(that.data, path, value);

				that.trigger(AFTERSET);
            }
        },

        // validate the value for the specified path by searching for validator functions in a couple of places
        validate: function (path, value) {
            var that = this,
                field = get(that.fields, path),
                validator, 
                validatedValue;

            // if there's no field definition for the given path, do not validate anything
            if (!field) {
                return value;
            }
                        
            if (shieldType(field.validator) === FUNCTION) {
                // use custom validator in the fields definition
                validator = field.validator;
            }
            else if (shieldType(field.type.validate) === FUNCTION) {
                // use validator function on model class
                validator = field.type.validate;
            }
            else {
                // use default validator
                var typeStr = field.type.toString().split("(")[0].split(" ")[1].toLowerCase();
                validator = Model.validators[typeStr];
            }
            
            if (validator) {
                validatedValue = validator(value);

                // if the validator function returns undefined (or does not return anything), validation fails
                if (validatedValue === undefined) {
                    that.trigger(ERROR, {errorType: "validation", path: path, value: value, error: "validation error"});
                    return;
                }
                else {
                    value = validatedValue;
                }
            }

            // check whether null value is allowed
            if (value === null && field.nullable === false) {
                that.trigger(ERROR, {errorType: "validation", path: path, value: value, error: "null value not allowed"});
                return;
            }
            
            return value;
        }
    });
    // define a custom class that derives from Model with the specified field definitions
    Model.define = function (fields) {
        return Model.extend({
            fields: Model.normalize(extend(true, {}, fields))
        });
    };
    // normalize the fields options in a common format
    Model.normalize = function (fields) {
        var key, 
            value, 
            type;

        fields = fields || {};

        for (key in fields) {
            // check for real properties, skipping inherited and others
            if (fields.hasOwnProperty(key)) {
                value = fields[key];
                type = shieldType(value);

                if (type === FUNCTION) {
                    fields[key] = { type: value };
                }
                else if (type === ARRAY) {
                    fields[key] = { type: value };
                }
                else if (type === STRING) {
                    fields[key] = { path: value };
                }
            }
        }

        return fields;
    };
    // get a default value for a specified type
    Model.def = function (type, def, nullable) {
        var utype;

        if (def !== undefined) {
            return shieldType(def) === FUNCTION ? def() : def;
        }
        if (nullable) {
            return null;
        }

        if (type === String) {
            return "";
        }
        if (type === Number) {
            return 0;
        }
        if (type === Date) {
            return null;
        }
        if (type === Boolean) {
            return false;
        }
        if (type === Array) {
            return [];
        }
        if (type === Object) {
            return {};
        }

        utype = shieldType(type);

        if (utype === ARRAY) {
            return [];
        }
        if (utype === OBJECT) {
            return {};
        }
        if (utype === FUNCTION) {
            return type();
        }

        return null;
    };
    // convert a value to a specified type
    Model.convert = function (value, type) {
        var converted;

        if (value == null) {
            return value;
        }

        if (type === String) {
            return value.toString();
        }

        if (type === Number) {
            converted = parseFloat(value);
            return isNaN(converted) ? value : converted;
        }

        if (type === Date) {
            converted = new Date(value);
            return isNaN(converted.getTime()) ? value : converted;
        }

        if (type === Boolean) {
            return is.string(value) ? !(/^(false|0)$/i).test(value) : !!value;
        }

        return value;
    };
    // a dictionary with defualt validators for built-in types
    Model.validators = {
        "string": function (value) {
            return value == null ? null : value.toString();
        },
        "number": function (value) {
            if (value === null) {
                return null;
            }
            return isNaN(+value) ? undefined : +value;
        },
        "date": function (value) {
            if (value === null) {
                return null;
            }
            if (value instanceof Date) {
                return value;            
            }
            value = new Date(value);
            return isNaN(value.getTime()) ? undefined : value;
        },
        "boolean": function (value) {
            if (value === null) {
                return null;
            }
            return value == null ? undefined : !!value;
        },
        "array": function (value) {
            if (value === null) {
                return null;
            }
            return shieldType(value) === ARRAY ? value : undefined;
        },
        "object": function (value) {
            if (value === null) {
                return null;
            }
            return shieldType(value) === OBJECT ? value : undefined;
        }
    };

    extend(shield, {
        map: map,
        DataSource: DataSource,
        DataQuery: DataQuery,
        Model: Model
    });

})(jQuery, shield, this);