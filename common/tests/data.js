module("data.js");

var data = [
    { id: 1, name: "item 1", category: 2, child: { id: 3, name: "child item 3" }, arr: [4, "7", { id: null }], dateVal: new Date("09/28/2013"), dateStr: "09/28/2013" },
    { id: 2, name: "item 2", category: 1, child: { id: 1, name: "child item 1" }, arr: [1, "9", { id: 12 }], dateVal: new Date("09/27/2013"), dateStr: "" },
    { id: 3, name: "item 3", category: 3, child: { id: 4, name: "child item 4" }, arr: [5, "2", { id: "subchild 1" }], dateVal: new Date("09/27/2013 18:30"), dateStr: new Date("09/27/2013 18:30") + "" },
    { id: 4, name: "item 4", category: 2, child: { id: 2, name: "child item 2" }, arr: [7, "4", { id: undefined }], dateVal: new Date("10/17/2013"), dateStr: new Date("10/17/2013").getTime() },
    { id: 5, name: "item 5", category: 2, child: { id: 8, name: "child item 8" }, arr: [2, "1", { id: null }], dateVal: new Date("10/17/2013 09:15"), dateStr: new Date("10/17/2013 09:15").toISOString() },
    { id: 6, name: "item 6", category: 3, child: { id: 10, name: "child item 10" }, arr: [3, "3", { id: "subchild 2" }], dateVal: new Date("09/28/2013 10:12"), dateStr: new Date("09/28/2013 10:12").toISOString() },
    { id: 7, name: "item 7", category: 1, child: { id: 5, name: "child item 5" }, arr: [8, "5", { id: 7 }], dateVal: null, dateStr: null },
    { id: 8, name: "item 8", category: 1, child: { id: 7, name: "child item 7" }, arr: [10, "8", { id: "child 3" }], dateVal: new Date("09/28/2013"), dateStr: new Date("09/28/2013").toGMTString() },
    { id: 9, name: "item 9", category: 3, child: { id: 6, name: "child item 6" }, arr: [9, "10", { id: "child 4" }] },
    { id: 10, name: "item 10", category: 2, child: { id: 9, name: "child item 9" }, arr: [6, "6", { id: "13" }], dateVal: new Date("09/28/2013"), dateStr: new Date("09/28/2013").toLocaleString() }
];

test("DataSource wraps array after read", function () {
    expect(2);

    var ds = new shield.DataSource(data);

    strictEqual(ds.data, null);

    ds.read();
    
    strictEqual(ds.data, data);
});

test("DataSource.read() returns promise", function () {
    var ds = new shield.DataSource(),
        res = ds.read();

    ok(typeof res.then === "function");
});

test("DataSource triggers start event", function () {
    var ds = new shield.DataSource(),
        spy = sinon.spy();

    ds.on("start", spy);
    ds.read();

    ok(spy.calledOnce);
});

test("DataSource start event can be prevented", function () {
    expect(2);

    var spy = sinon.spy(),
        ds = new shield.DataSource({
            events: {
                start: function (e) { e.preventDefault(); },
                complete: spy,
                change: spy
            }
        });

    ds.read().then(function (result) {
        ok(result === undefined);
    });

    ok(spy.called === false);
});

test("DataSource triggers complete event", function () {
    var ds = new shield.DataSource(data),
        spy = sinon.spy();

    ds.on("complete", spy);
    ds.read();

    ok(spy.calledOnce);
});

test("DataSource triggers error event", function () {
    var spy = sinon.spy(),
        ds = new shield.DataSource({
            events: { error: spy },
            remote: {
                read: function (params, success, error) {
                    error();
                }
            }
        });

    ds.read();
    ok(spy.calledOnce);
});

test("DataSource triggers change event", function () {
    var ds = new shield.DataSource([1, 2, 3]),
        spy = sinon.spy();

    ds.on("change", spy);
    ds.read();

    ok(spy.calledOnce);
});

test("DataSource does not trigger change if read() is not called", function () {
    var spy = sinon.spy(),
        ds = new shield.DataSource({
            events: { change: spy }
        });

    ok(spy.called === false);

    ds.read();

    ok(spy.calledOnce);
});

test("DataSource calls local client read", function () {
    var ds = new shield.DataSource(),
        fakeClient = { read: sinon.spy() },
        clientStub = sinon.stub(ds, "_client").returns(fakeClient);

    ds.read();

    ok(fakeClient.read.calledOnce);
});

test("DataSource local client returns local data", function () {
    var ds = new shield.DataSource(data);

    ds.read().then(function (result) {
        deepEqual(result, ds.data);
        strictEqual(ds.view, ds.data);
    });
});

test("DataSource makes remote request", function () {
    expect(7);

    var ds = new shield.DataSource({
        remote: {
            read: "my fake URL"
        }
    });

    sinon.stub($, "ajax", function (settings) {
        ok(settings.url === ds.remote.read);
        ok(typeof settings.success === "function");
        ok(typeof settings.error === "function");
        ok(settings.data && typeof settings.data === "object");

        settings.success(data);

        start();
    });

    stop();

    ds.read().then(function (result) {
        deepEqual(result, data);
        deepEqual(ds.data, data);
        deepEqual(ds.view, data);
    });

    $.ajax.restore();
});

test("DataSource overrides remote request data", function () {
    expect(5);

    var notGoingRequestData = { dataKey: "dataValue" },
        goingRequestData = {
            skip: 10,
            take: 15,
            sort: { key: "name", desc: true }
        },
        ds = new shield.DataSource({
            remote: {
                read: {
                    url: "my fake url",
                    data: notGoingRequestData,
                    operations: ["skip", "take", "sort"]
                }
            }
        });

    ds.skip = goingRequestData.skip;
    ds.take = goingRequestData.take;
    ds.sort = goingRequestData.sort;

    stop();

    deepEqual(ds.remote.read.data, notGoingRequestData);

    strictEqual(ds.skip, goingRequestData.skip);
    strictEqual(ds.take, goingRequestData.take);
    strictEqual(ds.sort, goingRequestData.sort);

    sinon.stub($, "ajax", function (settings) {
        deepEqual(settings.data, goingRequestData);
        start();
    });

    ds.read();

    $.ajax.restore();
});

test("DataSource can cache remote response in in-memory cache", function () {
    expect(5);

    var ds = new shield.DataSource({
        remote: {
            read: "my fake url",
            cache: true
        }
    });

    sinon.stub($, "ajax", function (settings) {
        settings.success(data);
    });

    ds.read().then(function (result, fromCache) {
        ok(fromCache === false);
        deepEqual(result, data);
    });

    ds.read().then(function (result, fromCache) {
        ok(fromCache === true);
        deepEqual(result, data);
    });

    ok($.ajax.calledOnce);

    $.ajax.restore();
});

test("DataSource disables remote in-memory caching by default", function () {
    expect(5);

    var ds = new shield.DataSource({
        remote: {
            read: "my fake url"
        }
    });

    sinon.stub($, "ajax", function (settings) {
        settings.success(data);
    });

    ds.read().then(function (result, fromCache) {
        ok(fromCache === false);
        deepEqual(result, data);
    });

    ds.read().then(function (result, fromCache) {
        ok(fromCache === false);
        deepEqual(result, data);
    });

    ok($.ajax.calledTwice);

    $.ajax.restore();
});

test("DataSource calls parser on every read", function () {
    expect(3);

    var ds = new shield.DataSource(),
        Schema = shield.DataSource.schemas.json,
        spy = sinon.spy(Schema.fn, "parse");

    ds.read();
    ok(spy.calledOnce);

    ds.read();
    ok(spy.calledTwice);

    ds.read();
    ok(spy.calledThrice);

    spy.restore();
});

test("DataSource parses JSON string correctly", function () {
    expect(9);

    var str = "opa gangnam",
        obj = { a: 1, b: [2] },
        strObj = '{"a":1,"b":[2]}',
        num = 33.3,
        num0 = 0,
        boolT = false,
        boolF = true,
        nullVal = null,
        undef,
        ds;

    ds = new shield.DataSource({ data: str });
    ds.read().then(function (result) {
        strictEqual(result, str);
    });

    ds = new shield.DataSource({ data: obj });
    ds.read().then(function (result) {
        strictEqual(result, obj);
    });

    ds = new shield.DataSource({ data: strObj });
    ds.read().then(function (result) {
        deepEqual(result, obj);
    });

    ds = new shield.DataSource({ data: num });
    ds.read().then(function (result) {
        strictEqual(result, num);
    });

    ds = new shield.DataSource({ data: num0 });
    ds.read().then(function (result) {
        strictEqual(result, num0);
    });

    ds = new shield.DataSource({ data: boolT });
    ds.read().then(function (result) {
        strictEqual(result, boolT);
    });

    ds = new shield.DataSource({ data: boolF });
    ds.read().then(function (result) {
        strictEqual(result, boolF);
    });

    ds = new shield.DataSource({ data: nullVal });
    ds.read().then(function (result) {
        strictEqual(result, nullVal);
    });

    ds = new shield.DataSource({ data: undef });
    ds.read().then(function (result) {
        strictEqual(result, undef);
    });
});

test("DataSource.cache works as expected", function () {
    expect(14);

    var keys = [
            "string value",
            "",
            0,
            1,
            12.3,
            true,
            false,
            null,
            undefined,
            [],
            [1, 2],
            {},
            { a: 1 }
    ],
        cache = new shield.DataSource().cache,
        i;

    for (i = 0; i < keys.length; i++) {
        cache.set(keys[i], i);
    }

    for (i = 0; i < keys.length; i++) {
        strictEqual(cache.get(keys[i]), i);
    }

    for (i = 0; i < keys.length; i++) {
        cache.remove(keys[i]);
    }

    strictEqual(shield.keys(cache.values).length, 0);
});

test("DataSource.cache maps equivalent params to a single key", function () {
    var params1 = { skip: 10, take: 5, sort: [{ key: "a", desc: true }], filter: { operator: "and", filters: [{ key: "b" }] } },
        params2 = { sort: [{ desc: true, key: "a" }], skip: 10, take: 5, filter: { filters: [{ key: "b" }], operator: "and" } },
        params3 = { take: 5, filter: { filters: [{ key: "b" }], operator: "and" }, skip: 10, sort: [{ desc: true, key: "a" }] },
        cache = new shield.DataSource().cache;

    cache.set(params1, 1);
    ok(shield.keys(cache.values).length === 1);
    strictEqual(cache.get(params1), 1);

    cache.set(params2, 2);
    ok(shield.keys(cache.values).length === 1);
    strictEqual(cache.get(params1), 2);

    cache.set(params1, 3);
    ok(shield.keys(cache.values).length === 1);
    strictEqual(cache.get(params1), 3);
});

test("DataSource schema can define fields", function () {
    var ds = new shield.DataSource({
        data: data,
        schema: {
            fields: {
                id: "id",
                category: {},
                childName: { path: "child.name" },
                arr: {
                    path: function (item) {
                        return item.arr.join(",");
                    }
                },
                date: {
                    path: function (item) {
                        return item.dateVal;
                    }
                }
            }
        }
    });

    var expected = shield.map(data, function (item) {
        return {
            id: item.id,
            category: item.category,
            childName: item.child.name,
            date: item.dateVal,
            arr: item.arr.join(",")
        }
    });

    ds.read().then(function (result) {
        deepEqual(result, expected, "schema maps fields in the result data");
    });
});

test("DataSource schema converts to type when type defined", function () {
    var ds = new shield.DataSource({
        data: data,
        schema: {
            fields: {
                id: { type: String },
                value: { path: "arr[1]", type: Number },
                someValue: { path: "arr[2].id", type: Number },
                dateValue: { path: "dateStr", type: Date }
            }
        }
    });

    var expected = shield.map(data, function (item) {
        var someValue = parseFloat(item.arr[2].id);

        if (isNaN(someValue)) {
            someValue = item.arr[2].id;
        }

        // model behavior always defaults to null for nullable fields with a defined type
        if (someValue === undefined) {
            someValue = null;
        }

        var dateValue = new Date(item.dateStr);
        if (item.dateStr == null || isNaN(dateValue.getTime())) {
            dateValue = item.dateStr;
        }

        // model behavior always defaults to null for nullable fields with a defined type
        if (dateValue === undefined) {
            dateValue = null;
        }

        return {
            id: item.id + "",
            value: parseFloat(item.arr[1]),
            someValue: someValue,
            dateValue: dateValue
        }
    });

    ds.read().then(function (result) {
        deepEqual(result, expected, "schema maps fields with converted types");
    });
});

test("DataSource.schema.data", function () {
    var result = { arr: [{ value: [{ id: 1 }, { id: 2 }, { id: 3 }] }] };
    var ds = new shield.DataSource({
        data: result,
        schema: {
            data: "arr[0].value"
        }
    });

    // read assertion
    ds.read().then(function (data) {
        deepEqual(data, result.arr[0].value, "[string] data value is retrieved from result JSON string");
    });

    // make sure that another read will succeed
    ds.read().then(function (data) {
        deepEqual(data, result.arr[0].value, "[string] data value is retrieved from result JSON string");
    });

    var spy = sinon.spy(function (data) {
        return data.arr[0].value;
    });

    ds.schema.options.data = spy;

    // read assertion
    ds.read().then(function (data) {
        ok(spy.calledOnce, "read function is not called");
        deepEqual(data, result.arr[0].value, "[function] data value is retrieved from result JSON string");
    });

    // make sure that another read will succeed
    ds.read().then(function (data) {
        ok(spy.calledTwice, "read function is not called twice");
        deepEqual(data, result.arr[0].value, "[function] data value is retrieved from result JSON string");
    });
});

test("DataSource.schema.total", function () {
    var result = { arr: [{ value: [{ id: 1 }, { id: 2 }, { id: 3 }], count: 7 }] };
    var ds = new shield.DataSource({
        data: result,
        schema: {
            data: "arr[0].value",
            total: "arr[0].count"
        }
    });

    ds.read(data).then(function () {
        ok(ds.total === result.arr[0].count, "total is read from string mapping");
    });

    var spy = sinon.spy(function (data) {
        return data.arr[0].count;
    });

    ds.schema.options.total = spy;
    result.arr[0].count = 13;

    ds.read().then(function (data) {
        ok(spy.calledOnce, "total function is called");
        ok(ds.total === result.arr[0].count, "total is read from function mapping");
    });
});

test("DataQuery.skip()", function () {
    deepEqual(new shield.DataQuery(data).skip(4).data, data.slice(4));
});

test("DataQuery.take()", function () {
    var result = new shield.DataQuery(data).take(3).data;
    ok(result.length === 3);
    deepEqual(result, data.slice(0, 3));
});

test("DataQuery.sort()", function () {
    var str = "abcdefghijklmnopqrstuvwxyz",
        comparer = function (a, b) { return ~~(str.indexOf(b) / 2.3) - ~~(str.indexOf(a) / 2.3); }

    result = new shield.DataQuery(str.split("")).sort(comparer).data.join("");
    expected = "xyzvwtursopqmnklhijfgdeabc";

    strictEqual(result, expected, "DataQuery.sort() is stable");

    var result = new shield.DataQuery(data).sort(),
        expected = data;
    deepEqual(result.data, expected, "sorts by source order if no sort parameters defined");
    deepEqual(result.indices, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "indices intact");

    result = new shield.DataQuery(data).sort(null, true);
    expected = data;
    deepEqual(result.data, expected, "sorts by source order if no path defined");
    deepEqual(result.indices, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "indices intact");

    result = new shield.DataQuery(data).sort("category");
    expected = data.slice(0).sort(function (a, b) {
        if (a.category === b.category) return a.id - b.id;
        return a.category - b.category;
    });
    deepEqual(result.data, expected, "sorts by string path");
    deepEqual(result.indices, [1, 6, 7, 0, 3, 4, 9, 2, 5, 8], "indices changed correctly");

    result = new shield.DataQuery(data).sort("name", true);
    expected = data.slice(0).sort(function (a, b) {
        return a.name > b.name ? -1 : 1;
    });
    deepEqual(result.data, expected, "sorts by string path descending");
    deepEqual(result.indices, [8, 7, 6, 5, 4, 3, 2, 1, 9, 0], "indices changed correctly");

    result = new shield.DataQuery(data).sort({ path: "id", desc: true }).data;
    expected = data.slice(0).reverse();
    deepEqual(result, expected, "sorts by a single sort expression");

    result = new shield.DataQuery(data).sort([{ path: "category" }, { path: "name", desc: true }]).data;
    expected = data.slice(0)
        .sort(function (a, b) {
            if (a.category === b.category) return a.name > b.name ? -1 : 1;
            return a.category - b.category
        });
    deepEqual(result, expected, "sorts by multiple sort expressions");

    var comparer = function (a, b) { return a.child.id - b.child.id; };
    result = new shield.DataQuery(data).sort(comparer).data;
    expected = data.slice(0).sort(comparer);
    deepEqual(result, expected, "sorts by a comparer function");

    result = new shield.DataQuery(data).sort([{ path: function (item) { return item.child.id }, desc: true }]).data;
    expected = data.slice(0).sort(function (a, b) { return b.child.id - a.child.id; });
    deepEqual(result, expected, "sorts by an expression with path selector function");

    var result = new shield.DataQuery(data).sort({ path: "child.id", desc: true }).data,
        expected = data.slice(0).sort(function (a, b) { return b.child.id - a.child.id });
    deepEqual(result, expected, "sorts by nested property expression 'prop.sub'");

    var result = new shield.DataQuery(data).sort({ path: "child['name']" }).data,
        expected = data.slice(0).sort(function (a, b) { return a.child.name.localeCompare(b.child.name) });
    deepEqual(result, expected, "sorts by nested property expression \"prop[\'name'\]\"");

    var result = new shield.DataQuery(data).sort({ path: "['category']" }).data,
        expected = data.slice(0).sort(function (a, b) {
            if (a.category === b.category) return a.id - b.id;
            return a.category - b.category;
        });
    deepEqual(result, expected, "sorts by nested property expression \"[\'category'\]\"");

    var result = new shield.DataQuery(data).sort({ path: "['arr'][0]" }).data,
        expected = data.slice(0).sort(function (a, b) {
            if (a.arr[0] === b.arr[0]) return a.id - b.id;
            return a.arr[0] - b.arr[0];
        });
    deepEqual(result, expected, "sorts by nested property expression \"['arr'][1]\"");

    var result = new shield.DataQuery(data).sort({ path: "['child'].name", desc: true }).data,
        expected = data.slice(0).sort(function (a, b) {
            if (a.child.name === b.child.name) return b.id - a.id;
            return b.child.name.localeCompare(a.child.name);
        });
    deepEqual(result, expected, "sorts by nested property expression \"['child'].name\"");

});

function filter(arr, func) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        if (func(arr[i])) {
            result.push(arr[i]);
        }
    }
    return result;
}

test("DataQuery.filter()", function () {
    //VALID PARAMETERS

    var result, expected;

    result = new shield.DataQuery(data).filter();
    expected = filter(data, function () { return true });
    deepEqual(result.data, expected, "returns original data when no expression defined");
    deepEqual(result.indices, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "wrong indices");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "eq", value: 3 });
    expected = filter(data, function (item) { return item.category === 3; });
    deepEqual(result.data, expected, "eq");
    deepEqual(result.indices, [2, 5, 8], "wrong indices");

    result = new shield.DataQuery(data).filter({ path: "dateVal", filter: "eq", value: new Date(2013, 8, 28) });
    expected = filter(data, function (item) { return item.dateVal - new Date("09/28/2013") === 0 });
    deepEqual(result.data, expected, "eq(date, date)");
    deepEqual(result.indices, [0, 7, 9], "wrong indices");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "neq", value: 3 }).data;
    expected = filter(data, function (item) { return item.category !== 3; });

    deepEqual(result, expected, "neq");

    result = new shield.DataQuery(data).filter({ path: "dateVal", filter: "neq", value: new Date(2013, 8, 28) }).data;
    expected = filter(data, function (item) { return item.dateVal - new Date("09/28/2013") !== 0 });

    deepEqual(result, expected, "neq(date, date)");

    result = new shield.DataQuery(data).filter({ path: "name", filter: "con", value: "1" }).data;
    expected = filter(data, function (item) { return item.name.indexOf("1") > -1; });

    deepEqual(result, expected, "con");

    result = new shield.DataQuery(data).filter({ path: "name", filter: "notcon", value: "1" }).data;
    expected = filter(data, function (item) { return item.name.indexOf("1") < 0; });

    deepEqual(result, expected, "notcon");

    result = new shield.DataQuery(data).filter({ path: "arr[2].id", filter: "starts", value: "child" }).data;
    expected = filter(data, function (item) { return (item.arr[2].id + "").indexOf("child") === 0; });

    deepEqual(result, expected, "starts");

    result = new shield.DataQuery(data).filter({ path: "name", filter: "ends", value: "7" }).data;
    expected = filter(data, function (item) { return item.name.indexOf("7") === item.name.length - 1; });

    deepEqual(result, expected, "ends");

    result = new shield.DataQuery(data).filter({ path: "id", filter: "gt", value: 5 }).data;
    expected = filter(data, function (item) { return item.id > 5; });

    deepEqual(result, expected, "gt");

    result = new shield.DataQuery(data).filter({ path: "dateVal", filter: "gt", value: new Date(2013, 8, 28) }).data;
    expected = filter(data, function (item) { return item.dateVal - new Date("09/28/2013") > 0 });

    deepEqual(result, expected, "gt(date, date)");

    result = new shield.DataQuery(data).filter({ path: "id", filter: "lt", value: 5 }).data;
    expected = filter(data, function (item) { return item.id < 5; });

    deepEqual(result, expected, "lt");

    result = new shield.DataQuery(data).filter({ path: "dateVal", filter: "lt", value: new Date(2013, 8, 28) }).data;
    expected = filter(data, function (item) { return item.dateVal - new Date("09/28/2013") < 0 });

    deepEqual(result, expected, "lt(date, date)");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "gte", value: 2 }).data;
    expected = filter(data, function (item) { return item.category >= 2; });

    deepEqual(result, expected, "gte");

    result = new shield.DataQuery(data).filter({ path: "dateVal", filter: "gte", value: new Date(2013, 8, 28) }).data;
    expected = filter(data, function (item) { return item.dateVal - new Date("09/28/2013") >= 0 });

    deepEqual(result, expected, "gte(date, date)");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "lte", value: 2 }).data;
    expected = filter(data, function (item) { return item.category <= 2; });

    deepEqual(result, expected, "lte");

    result = new shield.DataQuery(data).filter({ path: "dateVal", filter: "lte", value: new Date(2013, 8, 28) }).data;
    expected = filter(data, function (item) { return item.dateVal - new Date("09/28/2013") <= 0 });

    deepEqual(result, expected, "lte(date, date)");

    result = new shield.DataQuery(data).filter({ path: "arr[2].id", filter: "isnull" }).data;
    expected = filter(data, function (item) { return item.arr[2].id == null; });

    deepEqual(result, expected, "isnull");

    result = new shield.DataQuery(data).filter({ path: "arr[2].id", filter: "notnull" }).data;
    expected = filter(data, function (item) { return item.arr[2].id != null; });

    deepEqual(result, expected, "notnull");

    result = new shield.DataQuery(data).filter({ filter: function (item) { return typeof (item.arr[2]) === "string" && item.arr[2].indexOf("subchild") === 0; } }).data;
    expected = filter(data, function (item) { return typeof (item.arr[2]) === "string" && item.arr[2].indexOf("subchild") === 0; });

    deepEqual(result, expected, "function");

    //PARTIALLY VALID PARAMETERS
    result = new shield.DataQuery(data).filter({ path: "category", filter: "==", value: "2" }).data;
    expected = filter(data, function (item) { return item.category === 2; });

    deepEqual(result, expected, "eq(number, string)");

    result = new shield.DataQuery(data).filter({ path: "arr[2].id", filter: "==", value: 13 }).data;
    expected = filter(data, function (item) { return item.arr[2].id === "13"; });

    deepEqual(result, expected, "eq(string, number)");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "!=", value: "2" }).data;
    expected = filter(data, function (item) { return item.category !== 2; });

    deepEqual(result, expected, "neq(number, string)");

    result = new shield.DataQuery(data).filter({ path: "arr[2].id", filter: "!=", value: 13 }).data;
    expected = filter(data, function (item) { return item.arr[2].id !== "13"; });

    deepEqual(result, expected, "neq(string, number)");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "contains", value: "2" }).data;
    expected = filter(data, function (item) { return item.category === 2; });

    deepEqual(result, expected, "con(number, string)");

    result = new shield.DataQuery(data).filter({ path: "category", filter: "doesnotcontain", value: "2" }).data;
    expected = filter(data, function (item) { return item.category !== 2; });

    deepEqual(result, expected, "notcon(number, string)");

    result = new shield.DataQuery(data).filter({ path: "id", filter: "starts", value: "1" }).data;
    expected = filter(data, function (item) { return (item.id + "").charAt(0) === "1"; });

    deepEqual(result, expected, "starts(number, string)");

    result = new shield.DataQuery(data).filter({ path: "id", filter: "ends", value: "0" }).data;
    expected = filter(data, function (item) { return (item.id + "").charAt((item.id + "").length - 1) === "0"; });

    deepEqual(result, expected, "ends(number, string)");

    //MULTIPLE FILTER EXPRESSIONS

    result = new shield.DataQuery(data).filter([
        { path: "category", filter: "eq", value: 2 },
        { path: "arr[2].id", filter: "notnull" }
    ]);
    expected = filter(data, function (item) { return item.category === 2 && item.arr[2].id != null; });
    deepEqual(result.data, expected, "eq and notnull");
    deepEqual(result.indices, [9], "indices not right");

    result = new shield.DataQuery(data).filter([
        { path: "id", filter: "gte", value: 5 },
        { filter: function (data) { return data.arr[0] <= 6; } },
        { path: "arr[2].id", filter: "notnull" }
    ]).data;
    expected = filter(data, function (item) {
        return item.id >= 5 && item.arr[0] <= 6 && item.arr[2].id != null;
    });

    deepEqual(result, expected, "gte and function and notnull");

    result = new shield.DataQuery(data).filter({
        or: [
            { path: "id", filter: "gt", value: 7 },
            { path: "id", filter: "lt", value: 3 }
        ]
    }).data;
    expected = filter(data, function (item) {
        return item.id > 7 || item.id < 3;
    });

    deepEqual(result, expected, "gt or lt");

    result = new shield.DataQuery(data).filter({
        and: [
            { path: "category", filter: ">=", value: 2 },
            {
                or: [
                    { path: "arr[0]", filter: "<=", value: 4 },
                    { path: "dateVal", filter: "null" }
                ]
            }
        ]
    }).data;

    expected = filter(data, function (item) {
        return item.category >= 2 && (item.arr[0] <= 4 || item.dateVal == null);
    });

    deepEqual(result, expected, "gte and (lte or isnull)");
    deepEqual(result, [data[0], data[4], data[5], data[8]], "gte and (lte or isnull)");
});

test("DataQuery.filter() reduces total value", function () {
    var query = new shield.DataQuery(data);

    equal(query.total, data.length);

    query = query.sort("category");

    equal(query.total, data.length);

    query = query.filter({ path: "category", filter: "gt", value: 1 });

    equal(query.total, 7);

    query = query.skip(2);

    equal(query.total, 7);

    query = query.take(3)

    equal(query.total, 7);
});

test("DataQuery filter() several", function() {
	var query = new shield.DataQuery(data);

	query = query.filter({ path: "category", filter: "gt", value: 1 });

	deepEqual(query.indices, [0, 2, 3, 4, 5, 8, 9], "first filter indices");

	query = query.filter({ path: "category", filter: "gt", value: 2 });

	deepEqual(query.indices, [2, 5, 8], "second filter indices");
});

test("DataQuery indices separate calls", function() {
    var query = new shield.DataQuery(data);

    deepEqual(query.indices, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "initial");

    query = query.filter([
        { path: "category", filter: "gt", value: 1 },
        { path: "arr[2].id", filter: "notnull" }
    ]);

    deepEqual(query.indices, [2, 5, 8, 9], "after filter");

    query = query.sort([
        { path: "category", desc: false },
        { path: "child.id", desc: true }
    ]);

    deepEqual(query.indices, [9, 5, 8, 2], "after sort");

    query = query.skip(1);

    deepEqual(query.indices, [5, 8, 2], "after skip");

    query = query.take(2);

    deepEqual(query.indices, [5, 8], "after take");
});

test("DataQuery indices one call", function() {
    var query = shield.DataQuery.create(data, {
        filter: [
            { path: "category", filter: "gt", value: 1 },
            { path: "arr[2].id", filter: "notnull" }
        ],
        sort: [
            { path: "category", desc: false },
            { path: "child.id", desc: true }
        ],
        skip: 1,
        take: 2,
        aggregate: { field: "id", aggregate: "sum" }
    });

    deepEqual(query.indices, [5, 8], "multiple data queries at once");
    deepEqual(query.aggregates, [{field: "id", aggregate: "sum", value: 28}], "aggregates check");
});

test("DataQuery aggregate", function() {
    var query = shield.DataQuery.create(data, {
        aggregate: [
            { field: "child.id", aggregate: "min" },
            { field: "dateVal", aggregate: "max", type: Date },
            { field: "id", aggregate: "sum" },
            { field: "dateVal", aggregate: "average", type: Date },
            { field: "arr", aggregate: "count" },
            { field: "dateStr", aggregate: function(data, aggregate) { return "xxx"; } }
        ]
    });

    equal(query.aggregates[0].value, 1, "min");
    equal(query.aggregates[1].value, new Date("10/17/2013 09:15:00") + "", "max");
    equal(query.aggregates[2].value, 55, "sum");
    equal(query.aggregates[3].value, new Date("01/01/2005 12:59:42") + "", "average");
    equal(query.aggregates[4].value, 10, "count");
    equal(query.aggregates[5].value, "xxx", "custom");
});

test("DataQuery group slicing", function() {
    var query = shield.DataQuery.create(data, {
        group: [
            { field: "category", order: "asc" }
        ],
        skip: 4,
        take: 4
    });

    equal(query.data.length, 2, "group count");

    strictEqual(query.data[0].items.length, 3);
    strictEqual(query.data[1].items.length, 1);

    equal(query.data[0].items[0].name, "item 4");
    equal(query.data[1].items[0].name, "item 3");

    // indices check
    deepEqual(query.indices, [3, 4, 9, 2], "query group indices");
});

test("DataQuery group slicing deeper", function() {
    var people = [
        { id: 0, name: "Joh Doe", age: 31, sex: "male", country: "US", state: "IL", city: "Chicago" },
        { id: 1, name: "Jane Doe", age: 27, sex: "female", country: "US", state: "IL", city: "Chicago" },
        { id: 2, name: "Jake Floe", age: 34, sex: "male", country: "BG", state: "", city: "Pazardjik" },
        { id: 3, name: "Silvester Donovan", age: 25, sex: "male", country: "GB", state: "", city: "Southampton" },
        { id: 4, name: "Jessica Noel", age: 24, sex: "female", country: "GB", state: "", city: "London" },
        { id: 5, name: "Francis Monroe", age: 42, sex: "female", country: "US", state: "FL", city: "Miami" }
    ];

    var query = shield.DataQuery.create(people, {
        group: [
            { field: "sex", order: "desc" },
            { field: "country", order: "asc" }
        ],
        sort: "city",
        skip: 1,
        take: 4
    });
    // after query grouping should look like
    // [0, 2, 3], [1, 4, 5]
    // [[2], [3], [0]], [4, [1, 5]]

    equal(query.data.length, 2, "two top level groups");
    strictEqual(query.data[0].items.length, 2);
    strictEqual(query.data[1].items.length, 2);

    // assert for group look after skip and take to be:
    // [[3], [0]], [[4], [1]]
    deepEqual(query.data[0].items[0].items, [people[3]]);
    deepEqual(query.data[0].items[1].items, [people[0]]);
    deepEqual(query.data[1].items[0].items, [people[4]]);
    deepEqual(query.data[1].items[1].items, [people[1]]);

    // indices check
    deepEqual(query.indices, [3, 0, 4, 1], "query group indices");
});

test("DataQuery group", function() {
    var query = shield.DataQuery.create(data, {
        group: [
            { field: "category", order: "asc", aggregate: { field: "dateVal", aggregate: "min", type: Date } }
        ],
        aggregate: [
            { field: "child.id", aggregate: "min" },
            { field: "dateVal", aggregate: "max", type: Date },
            { field: "id", aggregate: "sum" },
            { field: "dateVal", aggregate: "average", type: Date },
            { field: "arr", aggregate: "count" },
            { field: "dateStr", aggregate: function(data, aggregate) { return "xxx"; } }
        ],
        sort: [
            { path: "dateVal", desc: true },
            { path: "name" }
        ]
    });

    strictEqual(query.data.length, 3, "group count");

    strictEqual(query.data[0].value, 1, "group order");

    strictEqual(query.data[1].aggregate[0].aggregate, "min", "group aggregate aggregate");
    strictEqual(query.data[1].aggregate[0].value + "", new Date("09/28/2013") + "", "group aggregate value");

    // group count
    strictEqual(query.data[0].items.length, 3, "group 1 count");
    strictEqual(query.data[1].items.length, 4, "group 2 count");
    strictEqual(query.data[2].items.length, 3, "group 3 count");

    // check the aggregates on those groups
    equal(query.aggregates[0].value, 1, "min");
    equal(query.aggregates[1].value, new Date("10/17/2013 09:15:00") + "", "max");
    equal(query.aggregates[2].value, 55, "sum");
    equal(query.aggregates[3].value, new Date("01/01/2005 12:59:42") + "", "average");
    equal(query.aggregates[4].value, 10, "count");
    equal(query.aggregates[5].value, "xxx", "custom");

    // sorting check
    equal(query.data[0].items[1].name, "item 2", "min");

    // indices check
    deepEqual(query.indices, [7, 1, 6, 4, 3, 0, 9, 5, 2, 8], "query group indices");
});

test("DataQuery group nested", function() {
    var people = [
        { id: 1, name: "Joh Doe", age: 31, sex: "male", country: "US", state: "IL", city: "Chicago" },
        { id: 2, name: "Jane Doe", age: 27, sex: "female", country: "US", state: "IL", city: "Chicago" },
        { id: 3, name: "Jake Floe", age: 34, sex: "male", country: "BG", state: "", city: "Pazardjik" },
        { id: 4, name: "Silvester Donovan", age: 25, sex: "male", country: "GB", state: "", city: "Southampton" },
        { id: 5, name: "Jessica Noel", age: 24, sex: "female", country: "GB", state: "", city: "London" },
        { id: 6, name: "Francis Monroe", age: 42, sex: "female", country: "US", state: "FL", city: "Miami" }
    ];

    var query = shield.DataQuery.create(people, {
        group: [
            { field: "sex", order: "desc", aggregate: { field: "age", aggregate: "average" } },
            { field: "country", order: "asc" },
            { field: "state" }
        ],
        aggregate: [
            { field: "age", aggregate: "min" },
            { field: "age", aggregate: "average" },
            { field: "id", aggregate: "count" },
            { field: "dateStr", aggregate: function(data, aggregate) { return "xxx"; } }
        ],
        sort: "city"
    });

    var result = query.data;

    strictEqual(result.length, 2, "first level group count");

    // first group is the group of males
    strictEqual(result[0].value, "male", "first level group 1 value");
    strictEqual(result[0].aggregate[0].aggregate, "average", "first level group 1 aggregate aggregate");
    strictEqual(result[0].aggregate[0].value + "", "30", "first level group 1 aggregate value");

    strictEqual(result[0].items.length, 3);
    strictEqual(result[0].items[0].value, "BG");
    strictEqual(result[0].items[1].value, "GB");
    strictEqual(result[0].items[2].value, "US");

    // the group of females
    strictEqual(result[1].value, "female", "first level group 2 value");
    strictEqual(result[1].aggregate[0].aggregate, "average", "first level group 2 aggregate aggregate");
    strictEqual(result[1].aggregate[0].value + "", "31", "first level group 2 aggregate value");

    strictEqual(result[1].items.length, 2);
    strictEqual(result[1].items[0].value, "GB");
    strictEqual(result[1].items[1].value, "US");

    // grouping items - grouped by: sec (desc), country (asc), state (no order)
    strictEqual(result[0].items[0].items[0].items[0].id, 3);
    strictEqual(result[0].items[1].items[0].items[0].id, 4);
    strictEqual(result[0].items[2].items[0].items[0].id, 1);
    strictEqual(result[1].items[0].items[0].items[0].id, 5);
    strictEqual(result[1].items[1].items[0].items[0].id, 2);
    strictEqual(result[1].items[1].items[1].items[0].id, 6);

    deepEqual(query.indices, [2, 3, 0, 4, 1, 5], "indices changed by grouping");

    // check the aggregates on those groups
    equal(query.aggregates[0].value, 24, "min");
    equal(query.aggregates[1].value, 30.5, "average");
    equal(query.aggregates[2].value, 6, "count");
    equal(query.aggregates[3].value, "xxx", "custom");
});

test("DataQuery group with sort", function() {
    var people = [
        { id: 0, name: "Joh Doe", age: 31, sex: "male", country: "US", state: "IL", city: "Chicago" },
        { id: 1, name: "Jane Doe", age: 27, sex: "female", country: "US", state: "IL", city: "Chicago" },
        { id: 2, name: "Jake Floe", age: 34, sex: "male", country: "BG", state: "", city: "Pazardjik" },
        { id: 3, name: "Silvester Donovan", age: 25, sex: "male", country: "GB", state: "", city: "Southampton" },
        { id: 4, name: "Jessica Noel", age: 24, sex: "female", country: "GB", state: "", city: "London" },
        { id: 5, name: "Francis Monroe", age: 42, sex: "female", country: "US", state: "FL", city: "Miami" }
    ];

    var query = shield.DataQuery.create(people, {
        group: [
            { field: "sex", order: "desc", aggregate: { field: "age", aggregate: "average" } },
            { field: "country", order: "asc" }
        ],
        aggregate: [
            { field: "age", aggregate: "min" },
            { field: "age", aggregate: "average" },
            { field: "id", aggregate: "count" },
            { field: "dateStr", aggregate: function(data, aggregate) { return "xxx"; } }
        ],
        sort: "state"
    });

    var result = query.data;

    strictEqual(result.length, 2, "first level group count");
    
    deepEqual(query.indices, [2, 3, 0, 4, 5, 1], "indices check");
});


test("XmlSchema can parse XML string into JSON", function () {
    var xml = '<?xml version="1.0"?>' +
        '<employees created="2013/10/29 10:47 PM">' +
            '<employee title="Software Engineer">' +
                '<name>Nicholas C. Zakas</name>' +
                '<started>text content' +
                    '<year full="true">2009</year>' +
                    '<month>7</month>' +
                '</started>' +
            '</employee>' +
            '<employee title="Salesperson">' +
                '<name>Jim Smith</name>' +
                '<online>2013/10/30 12:22 AM</online>' +
            '</employee>' +
        '</employees>';

    var ds = new shield.DataSource({
        remote: {
            read: function (params, success) {
                success(xml);
            }
        },
        schema: {
            type: "xml"
        }
    });

    ds.read().then(function (result) {
        deepEqual(result, {
            _created: "2013/10/29 10:47 PM",
            employee: [{
                _title: "Software Engineer",
                name: {
                    _text: "Nicholas C. Zakas"
                },
                started: {
                    _text: "text content",
                    year: {
                        _full: "true",
                        _text: "2009"
                    },
                    month: {
                        _text: "7"
                    }
                }
            }, {
                _title: "Salesperson",
                name: {
                    _text: "Jim Smith"
                },
                online: {
                    _text: "2013/10/30 12:22 AM"
                }
            }]
        }, "JSON correct");
    });

    ds.schema.options.data = "employee";

    ds.schema.options.fields = {
        title: { path: "_title" },
        name: { path: "name._text" },
        startyear: { path: "started.year._text", type: Number },
        full: { path: "started.year._full", type: Boolean},
        online: { path: "online._text", type: Date }
    }

    ds.read().then(function (result) {
        deepEqual(result, [{
            title: "Software Engineer",
            name: "Nicholas C. Zakas",
            startyear: 2009,
            full: true,
            online: null
        }, {
            title: "Salesperson",
            name: "Jim Smith",
            startyear: null,
            full: null,
            online: new Date(2013, 9, 30, 0, 22)
        }], "JSON with projection correct")
    });    
});

test("DataSource.add()", function () {
    expect(9);

    var ds = new shield.DataSource(data),
        spy = sinon.spy(),
        newObject = { id: 11, name: "new item", category: 3 },
        model;

    strictEqual(ds.tracker, undefined, "now changes beforehand");

    throws($.proxy(ds.add, ds), Error, "throws error if no data is read");

    ds.read();

    ds.on("change", spy);

    model = ds.add(newObject);

    strictEqual(ds.view.length, data.length + 1, "new item added to view");
    strictEqual(ds.data.length, data.length + 1, "new item added to all data");
    ok(spy.calledOnce, "change event is called");

    strictEqual(ds.tracker.changes.added.length, 1, "1 change");
    ok(model instanceof shield.Model, "model is created");
    strictEqual(ds.tracker.changes.added[0], model, "model is recorded");
    strictEqual(model.data, ds.data[ds.view.length - 1], "model backing data is in view");
});

