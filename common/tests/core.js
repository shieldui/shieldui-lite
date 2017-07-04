module("core.js");

test("Class.extend", function () {
    var initCalled = false,
		baseCalled = false,
		derivedCalled = false;

    var baseInit = function () {
        initCalled = true;
    }

    var derivedInit = function () { };

    var MyClass = shield.Class.extend({
        init: baseInit,
        method: function () {
            baseCalled = true;
        }
    });

    var MySubClass = MyClass.extend({
        init: derivedInit,

        method: function () {
            derivedCalled = true;
        }
    });

    ok(MyClass === baseInit);
    ok(MyClass.extend === shield.Class.extend);
    new MyClass();
    ok(initCalled);

    new MySubClass().method();

    ok(MySubClass === derivedInit);
    ok(MySubClass.extend === MyClass.extend);
    ok(baseCalled === false);
    ok(derivedCalled);
});

test("shield.format function", function () {
    var obj = new Object();
    obj.xxx = "D";

    strictEqual(
        shield.format.call(
            obj, 
            function(item1, item2, item3) {
                return this.xxx + ":" + item1 + item2 + item3;
            },
            "A", 
            "B", 
            "C"
        ),
        "D:ABC"
    );
});

test("shield.format replace placeholders", function () {
    var expected = "Hello World!",
		args = ["{2} {0}{1}", "World", "!", "Hello"];

    strictEqual(shield.format.apply(null, args), expected);
});

test("shield.format with 20 placeholders", function () {
    var count = 20,
		positions = [],
		args = [],
		fmt = "",
		expected = [],
		i = 0;

    //generate random replace values
    for (var i = 0 ; i < count; i++) {
        args.push(Math.random());
        positions.push(i);
    }

    //scramble positions and replace values
    while (positions.length) {
        var pos = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];

        fmt += "{" + pos + "}";
        expected[i++] = args[pos];
    }

    args.unshift(fmt);

    strictEqual(shield.format.apply(shield, args), expected.join(""));
});

test("shield.format dictionary data placeholders", function () {
    strictEqual(
		shield.format("{xxx.yyy} - {aaa}!", {
		    xxx: {
		        yyy: 'Hello'
		    },
		    aaa: 'World'
		}),
		"Hello - World!"
	);
});

test("shield.format dictionary instance", function () {
    strictEqual(shield.format("{value}", { value: new Date() }), new Date() + "");

    strictEqual(
		shield.format("{0}", { xxx: 1 }),
		{ xxx: 1 }.toString()
	);
});

test("shield.format dictionary with array - correct notation", function () {
    strictEqual(shield.format(
        "{value[1].data}", 
        { 
            value: [
                {data: '50'}, 
                {data: '100'}
            ] 
        }
    ), "100");
});

test("shield.format dictionary with array - bad notation", function () {
    strictEqual(shield.format(
        "{value.0.data}", 
        { 
            value: [
                {data: '50'}, 
                {data: '100'}
            ] 
        }
    ), "50");
});

test("shield.format with Globalize", function () {
    // mock the Globalize library
    window.Globalize = function () { };
    window.Globalize.format = function (val, fmt) { return val + "|" + fmt; };

    strictEqual(
		shield.format("{xxx.yyy:n1} - {aaa}!", {
		    xxx: {
		        yyy: 'Hello'
		    },
		    aaa: 'World'
		}),
		"Hello|n1 - World!"
	);

    //IE7 does not support deleting window properties
    try {
        // delete the Globalize mock
        delete window.Globalize;
    } catch (e) { window.Globalize = undefined; }
});

test("shield.type returns correct type", function () {
    strictEqual(shield.type(1), "number", "number");
    strictEqual(shield.type("abc"), "string", "string");
    strictEqual(shield.type(new Date()), "date", "date");
    strictEqual(shield.type({}), "object", "object");
    strictEqual(shield.type([]), "array", "array");
    strictEqual(shield.type(function () { }), "function", "function");
    strictEqual(shield.type(null), "null", "null");
    strictEqual(shield.type(undefined), "undefined", "undefined");
});

test("shield.guid is an RFC4122-compliant GUID", function () {
    var guid = shield.guid(),
        matches = guid.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/) || [];

    strictEqual(matches[0], guid);
});

test("shield.extend makes a shallow copy of object", function () {
    var obj = { a: 1, b: "abc", c: { d: "opa", e: { gangnam: true } } },
        clone = shield.extend({}, obj);

    notStrictEqual(clone, obj);
    deepEqual(clone, obj);
    strictEqual(clone.c, obj.c);
    strictEqual(clone.c.e, obj.c.e);
});

test("shield.extend makes a deep clone of object", function () {
    var obj = { a: 1, b: "abc", c: { d: "opa", e: { gangnam: true } } },
        clone = shield.extend(true, {}, obj);

    notStrictEqual(clone, obj);
    notStrictEqual(clone.c, obj.c);
    notStrictEqual(clone.c.e, obj.c.e);
    deepEqual(clone, obj);
});

test("shield.extend makes a deep clone of object with empty constructor array", function () {
    var Class1 = shield.Class.extend(),
        inst1 = new Class1(),
        obj = { a: 1, b: "abc", c: { d: "opa", e: { gangnam: true, cl1: inst1 }, dt: new Date() }, arr: [1, 2, 3] },
        clone = shield.extend([], {}, obj);

    ok(clone instanceof Array);
    strictEqual(clone.c, obj.c);
    strictEqual(clone.arr, obj.arr);
});

test("shield.extend makes a deep clone of object with incorrect constructor array", function () {
    var Class1 = shield.Class.extend(),
        inst1 = new Class1(),
        obj = { a: 1, b: "abc", c: { d: "opa", e: { gangnam: true, cl1: inst1 }, dt: new Date() }, arr: [1, 2, 3] },
        clone = shield.extend([Date, Array, Class1, 1], {}, obj);

    ok(clone instanceof Array);
    strictEqual(clone.a, obj.a);
    strictEqual(clone.b, obj.b);
    strictEqual(clone.arr, obj.arr);
    strictEqual(clone.c, obj.c);
});

test("shield.extend makes a deep clone of object with copied instances", function () {
    var Class1 = shield.Class.extend(),
        inst1 = new Class1(),
        obj = { a: 1, b: "abc", c: { d: "opa", e: { gangnam: true, cl1: inst1 }, dt: new Date() }, arr: [1, 2, 3] },
        clone = shield.extend([Date, Array, Class1], {}, obj);

    deepEqual(clone, obj);
    strictEqual(clone.arr, obj.arr);
    strictEqual(clone.c.dt, obj.c.dt);
    strictEqual(clone.c.e.cl1, obj.c.e.cl1);
});

test("shield.extend makes a deep clone of object with copied instances and cloned dates", function () {
    var Class1 = shield.Class.extend(),
        inst1 = new Class1(),
        obj = { a: 1, b: "abc", c: { d: "opa", e: { gangnam: true, cl1: inst1 }, dt: new Date() }, arr: [1, 2, 3] },
        clone = shield.extend([Array, Class1], {}, obj);
    
    deepEqual(clone, obj);
    strictEqual(clone.arr, obj.arr);
    strictEqual(clone.c.e.cl1, obj.c.e.cl1);
    notStrictEqual(clone.c.dt, obj.c.dt);
});

test("shield.extend(Object, Object)", function () {
    expect(28);

    var empty, optionsWithLength, optionsWithDate, myKlass,
		customObject, optionsWithCustomObject, MyNumber, ret,
		nullUndef, target, recursive, obj,
		defaults, defaultsCopy, options1, options1Copy, options2, options2Copy, merged2,
		settings = { "xnumber1": 5, "xnumber2": 7, "xstring1": "peter", "xstring2": "pan" },
		options = { "xnumber2": 1, "xstring2": "x", "xxx": "newstring" },
		optionsCopy = { "xnumber2": 1, "xstring2": "x", "xxx": "newstring" },
		merged = { "xnumber1": 5, "xnumber2": 1, "xstring1": "peter", "xstring2": "x", "xxx": "newstring" },
		deep1 = { "foo": { "bar": true } },
		deep2 = { "foo": { "baz": true }, "foo2": document },
		deep2copy = { "foo": { "baz": true }, "foo2": document },
		deepmerged = { "foo": { "bar": true, "baz": true }, "foo2": document },
		arr = [1, 2, 3],
		nestedarray = { "arr": arr };

    shield.extend(settings, options);
    deepEqual(settings, merged, "Check if extended: settings must be extended");
    deepEqual(options, optionsCopy, "Check if not modified: options must not be modified");

    shield.extend(settings, null, options);
    deepEqual(settings, merged, "Check if extended: settings must be extended");
    deepEqual(options, optionsCopy, "Check if not modified: options must not be modified");

    shield.extend(true, deep1, deep2);
    deepEqual(deep1["foo"], deepmerged["foo"], "Check if foo: settings must be extended");
    deepEqual(deep2["foo"], deep2copy["foo"], "Check if not deep2: options must not be modified");
    equal(deep1["foo2"], document, "Make sure that a deep clone was not attempted on the document");

    ok(shield.extend(true, {}, nestedarray)["arr"] !== arr, "Deep extend of object must clone child array");

    // #5991
    ok(jQuery.isArray(shield.extend(true, { "arr": {} }, nestedarray)["arr"]), "Cloned array have to be an Array");
    ok(jQuery.isPlainObject(shield.extend(true, { "arr": arr }, { "arr": {} })["arr"]), "Cloned object have to be an plain object");

    empty = {};
    optionsWithLength = { "foo": { "length": -1 } };
    shield.extend(true, empty, optionsWithLength);
    deepEqual(empty["foo"], optionsWithLength["foo"], "The length property must copy correctly");

    empty = {};
    optionsWithDate = { "foo": { "date": new Date() } };
    shield.extend(true, empty, optionsWithDate);
    deepEqual(empty["foo"], optionsWithDate["foo"], "Dates copy correctly");

    /** @constructor */
    myKlass = function () { };
    customObject = new myKlass();
    optionsWithCustomObject = { "foo": { "date": customObject } };
    empty = {};
    shield.extend(true, empty, optionsWithCustomObject);
    ok(empty["foo"] && empty["foo"]["date"] === customObject, "Custom objects copy correctly (no methods)");

    // Makes the class a little more realistic
    myKlass.prototype = { "someMethod": function () { } };
    empty = {};
    shield.extend(true, empty, optionsWithCustomObject);
    ok(empty["foo"] && empty["foo"]["date"] === customObject, "Custom objects copy correctly");

    MyNumber = Number;

    ret = shield.extend(true, { "foo": 4 }, { "foo": new MyNumber(5) });
    ok(parseInt(ret.foo, 10) === 5, "Wrapped numbers copy correctly");

    nullUndef;
    nullUndef = shield.extend({}, options, { "xnumber2": null });
    ok(nullUndef["xnumber2"] === null, "Check to make sure null values are copied");

    nullUndef = shield.extend({}, options, { "xnumber2": undefined });
    ok(nullUndef["xnumber2"] === options["xnumber2"], "Check to make sure undefined values are not copied");

    nullUndef = shield.extend({}, options, { "xnumber0": null });
    ok(nullUndef["xnumber0"] === null, "Check to make sure null values are inserted");

    target = {};
    recursive = { foo: target, bar: 5 };
    shield.extend(true, target, recursive);
    deepEqual(target, { bar: 5 }, "Check to make sure a recursive obj doesn't go never-ending loop by not copying it over");

    ret = shield.extend(true, { foo: [] }, { foo: [0] }); // 1907
    equal(ret.foo.length, 1, "Check to make sure a value with coercion 'false' copies over when necessary to fix #1907");

    ret = shield.extend(true, { foo: "1,2,3" }, { foo: [1, 2, 3] });
    ok(typeof ret.foo !== "string", "Check to make sure values equal with coercion (but not actually equal) overwrite correctly");

    ret = shield.extend(true, { foo: "bar" }, { foo: null });
    ok(typeof ret.foo !== "undefined", "Make sure a null value doesn't crash with deep extend, for #1908");

    obj = { foo: null };
    shield.extend(true, obj, { foo: "notnull" });
    equal(obj.foo, "notnull", "Make sure a null value can be overwritten");

    function func() { }
    shield.extend(func, { key: "value" });
    equal(func.key, "value", "Verify a function can be extended");

    defaults = { xnumber1: 5, xnumber2: 7, xstring1: "peter", xstring2: "pan" };
    defaultsCopy = { xnumber1: 5, xnumber2: 7, xstring1: "peter", xstring2: "pan" };
    options1 = { xnumber2: 1, xstring2: "x" };
    options1Copy = { xnumber2: 1, xstring2: "x" };
    options2 = { xstring2: "xx", xxx: "newstringx" };
    options2Copy = { xstring2: "xx", xxx: "newstringx" };
    merged2 = { xnumber1: 5, xnumber2: 1, xstring1: "peter", xstring2: "xx", xxx: "newstringx" };

    settings = shield.extend({}, defaults, options1, options2);
    deepEqual(settings, merged2, "Check if extended: settings must be extended");
    deepEqual(defaults, defaultsCopy, "Check if not modified: options1 must not be modified");
    deepEqual(options1, options1Copy, "Check if not modified: options1 must not be modified");
    deepEqual(options2, options2Copy, "Check if not modified: options2 must not be modified");
});

test("shield.extend(true,{},{a:[], o:{}}); deep copy with array, followed by object", function () {
    expect(2);

    var result, initial = {
        // This will make "copyIsArray" true
        array: [1, 2, 3, 4],
        // If "copyIsArray" doesn't get reset to false, the check
        // will evaluate true and enter the array copy block
        // instead of the object copy block. Since the ternary in the
        // "copyIsArray" block will will evaluate to false
        // (check if operating on an array with ), this will be
        // replaced by an empty array.
        object: {}
    };

    result = jQuery.extend(true, {}, initial);

    deepEqual(result, initial, "The [result] and [initial] have equal shape and values");
    ok(!jQuery.isArray(result.object), "result.object wasn't paved with an empty array");
});

test("shield.to.key turns a value into a key", function () {
    var date = new Date(),
        values = [
            "",
            "abc",
            "123",
            0,
            1,
            12.3,
            function () { },
            function (a) { return b; },
            null,
            undefined,
            true,
            false,
            date,
            [1, 2, 3],
            {},
            { a: 1 },
            { a: 1, b: 2 },
            { b: 2, a: 1 },
            { b: 2, a: { d: 3, c: 1 } },
            [{ b: 2, a: { d: 3, c: 1 } }, { b: 2, a: 1 } ]
        ],
        keys = [
            "",
            "abc",
            "123",
            "0",
            "1",
            "12.3",
            "function () { }",
            "function (a) { return b; }",
            "null",
            "undefined",
            "true",
            "false",
            date.toISOString(),
            "[1,2,3]",
            "{}",
            "{a:1}",
            "{a:1,b:2}",
            "{a:1,b:2}",
            "{a:{c:1,d:3},b:2}",
            "[{a:{c:1,d:3},b:2},{a:1,b:2}]"
        ],
        i;

    for (i = 0; i < values.length; i++) {
        strictEqual(shield.to.key(values[i]), keys[i]);
    }
});

test("shield.get()", function () {
    expect(67);

    var obj1 = { a: 1, b: { c: 2 }, d: [{ f: "text" }, [new Date(), null, 123]] },
        obj2 = [17, { a: "text" }, [6]];

    strictEqual(shield.get(obj1, ""), obj1, '""');    
    strictEqual(shield.get(obj1, "a"), obj1.a, "a");
    strictEqual(shield.get(obj1, "['a']"), obj1.a, "['a']");
    strictEqual(shield.get(obj1, '["a"]'), obj1.a, '["a"]');
    strictEqual(shield.get(obj1, "b.c"), obj1.b.c, "b.c");
    strictEqual(shield.get(obj1, "['b']['c']"), obj1.b.c, "['b']['c']");
    strictEqual(shield.get(obj1, '["b"]["c"]'), obj1.b.c, '["b"]["c"]');
    strictEqual(shield.get(obj1, "d"), obj1.d, "d");    
    strictEqual(shield.get(obj1, "d[0]"), obj1.d[0], "d[0]");
    strictEqual(shield.get(obj1, "d.0"), obj1.d[0], "d.0");
    strictEqual(shield.get(obj1, "d[0].f"), obj1.d[0].f, "d[0].f");
    strictEqual(shield.get(obj1, "d.0.f"), obj1.d[0].f, "d.0.f");
    strictEqual(shield.get(obj1, "d[0]['f']"), obj1.d[0].f, "d[0]['f']");    
    strictEqual(shield.get(obj1, 'd[0]["f"]'), obj1.d[0].f, 'd[0]["f"]');    
    strictEqual(shield.get(obj1, "d[0].f"), obj1.d[0].f, "d[0].f");
    strictEqual(shield.get(obj1, "d.0.f"), obj1.d[0].f, "d.0.f");
    strictEqual(shield.get(obj1, "d[0]['f']"), obj1.d[0].f, "d[0]['f']");    
    strictEqual(shield.get(obj1, 'd[0]["f"]'), obj1.d[0].f, 'd[0]["f"]');    
    strictEqual(shield.get(obj1, "d[1]"), obj1.d[1], "d[1]");
    strictEqual(shield.get(obj1, "d.1"), obj1.d[1], "d.1");
    strictEqual(shield.get(obj1, "d[1].length"), obj1.d[1].length, "d[1].length");    
    strictEqual(shield.get(obj1, "d[1]['length']"), obj1.d[1].length, "d[1]['length']");    
    strictEqual(shield.get(obj1, 'd[1]["length"]'), obj1.d[1].length, 'd[1]["length"]');
    strictEqual(shield.get(obj1, "d.1.length"), obj1.d[1].length, "d.1.length");
    strictEqual(shield.get(obj1, "d[1][0]"), obj1.d[1][0], "d[1][0]");    
    strictEqual(shield.get(obj1, "d[1][0].getTime"), obj1.d[1][0].getTime, "d[1][0].getTime");    
    strictEqual(shield.get(obj1, "d[1][0]['getTime']"), obj1.d[1][0].getTime, "d[1][0]['getTime']");    
    strictEqual(shield.get(obj1, 'd[1][0]["getTime"]'), obj1.d[1][0].getTime, 'd[1][0]["getTime"]');    
    strictEqual(shield.get(obj1, "d[1][1]"), obj1.d[1][1], "d[1][1]");    
    strictEqual(shield.get(obj1, "d[1][2]"), obj1.d[1][2], "d[1][2]");
    
    strictEqual(shield.get(obj2, "0"), obj2[0], "0");
    strictEqual(shield.get(obj2, "[0]"), obj2[0], "[0]");
    strictEqual(shield.get(obj2, "[1].a"), obj2[1].a, "[1].a");
    strictEqual(shield.get(obj2, "2"), obj2[2], "2");
    strictEqual(shield.get(obj2, "[2]"), obj2[2], "[2]");
    strictEqual(shield.get(obj2, "[2][0]"), obj2[2][0], "[2][0]");    

    strictEqual(shield.get(123, "toFixed"), (123).toFixed, "toFixed");
    strictEqual(shield.get(123, "['toFixed']"), (123).toFixed, "['toFixed']");
    strictEqual(shield.get(123, '["toFixed"]'), (123).toFixed, '["toFixed"]');

    strictEqual(shield.get("abc", "toLowerCase"), "abc".toLowerCase, "toLowerCase");
    strictEqual(shield.get("abc", "['toLowerCase']"), "abc".toLowerCase, "['toLowerCase']");
    strictEqual(shield.get("abc", '["toLowerCase"]'), "abc".toLowerCase, '["toLowerCase"]');

    strictEqual(shield.get({}, "some.nonExistent.property"), undefined, "some.nonExistent.property");
    strictEqual(shield.get([], "some.nonExistent.property"), undefined, "some.nonExistent.property");
    strictEqual(shield.get("", "some.nonExistent.property"), undefined, "some.nonExistent.property");
    strictEqual(shield.get(123, "some.nonExistent.property"), undefined, "some.nonExistent.property");
    strictEqual(shield.get(null, "some.nonExistent.property"), undefined, "some.nonExistent.property");
    strictEqual(shield.get(undefined, "some.nonExistent.property"), undefined, "some.nonExistent.property");

    //some suspiciously allowed notations (I know these should be invalid, but the path parser currently allows it)
    strictEqual(shield.get(obj1, "d.0.['f']"), obj1.d[0].f, "d.0.['f']");
    strictEqual(shield.get(obj1, 'd.0.["f"]'), obj1.d[0].f, 'd.0.["f"]');
    strictEqual(shield.get(obj1, "d.0.['f']"), obj1.d[0].f, "d.0.['f']");
    strictEqual(shield.get(obj1, 'd.0.["f"]'), obj1.d[0].f, 'd.0.["f"]');
    strictEqual(shield.get(obj1, "d.1.['length']"), obj1.d[1].length, "d.1.['length']");
    strictEqual(shield.get(obj1, 'd.1.["length"]'), obj1.d[1].length, 'd.1.["length"]');
    strictEqual(shield.get(obj1, "d.1.[0]"), obj1.d[1][0], "d.1.[0]");
    strictEqual(shield.get(obj1, "d.1.[0].getTime"), obj1.d[1][0].getTime, "d.1.[0].getTime");
    strictEqual(shield.get(obj1, "d.1.[0]['getTime']"), obj1.d[1][0].getTime, "d.1.[0]['getTime']");
    strictEqual(shield.get(obj1, 'd.1.[0]["getTime"]'), obj1.d[1][0].getTime, 'd.1.[0]["getTime"]');
    strictEqual(shield.get(obj1, "d.1.[1]"), obj1.d[1][1], "d.1.[1]");
    strictEqual(shield.get(obj1, "d.1.[2]"), obj1.d[1][2], "d.1.[2]");
    strictEqual(shield.get(obj2, "2.0"), obj2[2][0], "2.0");
    
    //some invalid expressions
    throws($.proxy(shield.get, shield, obj2, "2[0]"), Error, "2[0] is invalid and throws");
    throws($.proxy(shield.get, shield, obj1, "'d.1.[2]'"), Error, "'d.1.[2]' is invalid and throws");
    throws($.proxy(shield.get, shield, obj1, null), Error, 'null is invalid and throws');
    throws($.proxy(shield.get, shield, obj1, undefined), Error, 'undefined is invalid and throws');
    throws($.proxy(shield.get, shield, obj1, []), Error, '{} is invalid and throws');
    throws($.proxy(shield.get, shield, obj1, {}), Error, '[] is invalid and throws');
});

test("shield.set()", function () {
    expect(5);

    var obj1 = { b: {}, d: [] };

    shield.set(obj1, "a", 1, "a = 1");
    strictEqual(obj1.a, 1);

    shield.set(obj1, "a", null);
    strictEqual(obj1.a, null, "a = null");

    shield.set(obj1, "['a']", "b");
    strictEqual(obj1.a, "b", "['a'] = \"b\"");

    shield.set(obj1, "b.c", 3);
    strictEqual(obj1.b.c, 3, "b.c = 3");

    shield.set(obj1, "d[3]", true);
    strictEqual(obj1.d[3], true, "d[3] = 3");
});

test("shield.ui.plugin", function () {
    var $ = jQuery.extend(true, jQuery, {}),	//create local jQuery copy
        ui = $.extend(true, {}, shield.ui),		//create local shield.ui namespace
        MyWidget = shield.Class.extend({
            process: function () {
                return "processed";
            }
        }),
        MyWidget2 = shield.Class.extend({});

    ui.plugin("MyWidget", MyWidget);
    ok(typeof $.fn.shieldMyWidget === "function");

    ui.plugin("MyWidget2", MyWidget2);

    var div = $("<div/>");
    throws(function () { div.shieldMyWidget("method"); }, /shield: cannot call method 'method' on uninitialized MyWidget/);
    throws(function () { div.shieldMyWidget("process"); }, /shield: cannot call method 'process' on uninitialized MyWidget/);

    var widget = div.shieldMyWidget().swidget();

    ok(widget instanceof MyWidget);
    throws(function () { div.shieldMyWidget("method"); }, /shield: cannot find method 'method' of MyWidget/);
    ok(div.shieldMyWidget("process") === "processed");

    div.shieldMyWidget2();
    strictEqual(div.swidget(), div.swidget("MyWidget2"));

    //clean up
    delete $.fn.shieldMyWidget;
    delete $.fn.shieldMyWidget2;
});

test("$.fn.swidget", function () {
    var Widget = shield.Class.extend(),
        name = Widget + new Date().getTime(),
        all = [],
        divs = $("<div/><div/><div/>");

    shield.ui.plugin(name, Widget);

    divs.each(function (index) {
        //swidget must return a single widget instance when the wrapped jQuery object contains a single DOM element
        all.push(divs.eq(index)["shield" + name]().swidget());
    });

    ok(all[0] instanceof Widget);
    ok(all[1] instanceof Widget);
    ok(all[2] instanceof Widget);

    //swidget must return an array of all widgets associated with the elements wrapped by the jQuery object
    deepEqual(divs.swidget(), all);

    //clean up
    delete shield.ui[name];
});

test("Widget element", function () {
    var elem = $("<div />")[0],
        widget = new shield.ui.Widget(elem);

    strictEqual(widget.element.length, 1);
    strictEqual(widget.element[0], elem);
});

test("Widget options", function () {
    var options = { prop1: "value1" },
        widget = new shield.ui.Widget(null, options);

    deepEqual(widget.options, options);
    ok(widget.options !== options);
    strictEqual(widget.initialOptions, options);
});

test("Widget defaults", function () {
    var MyWidget = shield.ui.Widget.extend(),
        defaults = { defaultProp1: "defaultValue1", prop1: "defaultValue2" },
        options = { prop1: "modified" },
        instance;

    MyWidget.defaults = defaults;

    instance = new MyWidget();
    deepEqual(instance.options, defaults);

    instance = new MyWidget(null, options);

    deepEqual(instance.options, {
        defaultProp1: defaults.defaultProp1,
        prop1: options.prop1
    });
});

test("Widget derives from Dispatcher", function () {
    ok(new shield.ui.Widget(document.createElement("div")) instanceof shield.Dispatcher);
});

test("Widget uses base Dispatcher functionality", function () {
    var handler = sinon.spy(),
        widget = new shield.ui.Widget(document.createElement("div"), {
            events: {
                evt1: handler
            }
        });

    strictEqual(widget.events.evt1[0].handler, handler);

    widget.trigger("evt1");
    ok(handler.calledOnce);

    widget.destroy();

    widget.trigger("evt1");

    ok(handler.calledOnce);
    deepEqual(widget.events, {});
});

test("Widget triggers events with Event object and default function", function () {
    var handler = sinon.spy(),
        defaultCalled = false,
        defaultCalledSecond = false,
        widget = new shield.ui.Widget(document.createElement("div"), {
            events: {
                evt1: handler
            }
        });

    widget.trigger("evt1", { prop: "propValue" }, function () {
        defaultCalled = true;
    });

    ok(handler.args[0][0] instanceof shield.Event);
    strictEqual(handler.args[0][0].prop, "propValue");
    ok(defaultCalled);

    widget.on("evt1", function (e) {
        e.preventDefault();
    });

    widget.trigger("evt1", { prop: "propValue" }, function () {
        defaultCalledSecond = true;
    });

    ok(defaultCalledSecond === false);
});

test("Dispatcher can trigger single event", function () {
    var handler = sinon.spy(),
        eventName = "myevent",
        disp = new shield.Dispatcher();

    disp.on(eventName, handler);
    disp.trigger(eventName);
    disp.off(eventName, handler);
    disp.trigger(eventName);

    ok(handler.calledOnce);
    strictEqual(disp.events[eventName], undefined);
});

test("Dispatcher can register an array of events to a single event handler", function () {
    var events = ["evt1", "evt2", "evt3"],
        handler = sinon.spy(),
        disp = new shield.Dispatcher();

    disp.on(events, handler);

    for (var i = 0; i < events.length; i++) {
        disp.trigger(events[i], events[i]);
    }

    strictEqual(handler.callCount, events.length);
    strictEqual(handler.args[0][0], events[0]);
    strictEqual(handler.args[1][0], events[1]);
    strictEqual(handler.args[2][0], events[2]);

    disp.off(events, handler);

    for (var i = 0; i < events.length; i++) {
        disp.trigger(events[i], events[i]);
    }

    strictEqual(handler.callCount, events.length);

    for (var i = 0; i < events.length; i++) {
        strictEqual(disp.events[events[i]], undefined);
    }
});

test("Dispatcher can register an array of events to a dictionary of event handlers", function () {
    var events = ["evt1", "evt2", "evt3"],
        handlers = {
            evt1: sinon.spy(),
            evt2: sinon.spy(),
            evt3: sinon.spy()
        },
        disp = new shield.Dispatcher();

    disp.on(events, handlers);

    for (var i = 0; i < events.length; i++) {
        disp.trigger(events[i], events[i]);
    }

    strictEqual(handlers.evt1.callCount, 1);
    strictEqual(handlers.evt1.args[0][0], events[0]);

    strictEqual(handlers.evt2.callCount, 1);
    strictEqual(handlers.evt2.args[0][0], events[1]);

    strictEqual(handlers.evt3.callCount, 1);
    strictEqual(handlers.evt3.args[0][0], events[2]);

    disp.off(events, handlers);

    for (var i = 0; i < events.length; i++) {
        disp.trigger(events[i], events[i]);
    }

    strictEqual(handlers.evt1.callCount, 1);
    strictEqual(handlers.evt2.callCount, 1);
    strictEqual(handlers.evt3.callCount, 1);

    for (var i = 0; i < events.length; i++) {
        strictEqual(disp.events[events[i]], undefined);
    }
});

test("Dispatcher can register a dictionary of event names and handlers", function () {
    var events = {
        evt1: sinon.spy(),
        evt2: sinon.spy(),
        evt3: sinon.spy()
    },
    disp = new shield.Dispatcher();

    disp.on(events);

    for (var key in events) {
        disp.trigger(key, key);
    }

    strictEqual(events.evt1.callCount, 1);
    strictEqual(events.evt2.callCount, 1);
    strictEqual(events.evt3.callCount, 1);
    strictEqual(events.evt1.args[0][0], "evt1");
    strictEqual(events.evt2.args[0][0], "evt2");
    strictEqual(events.evt3.args[0][0], "evt3");

    disp.off(events);

    for (var key in events) {
        disp.trigger(key, key);
    }

    strictEqual(events.evt1.callCount, 1);
    strictEqual(events.evt2.callCount, 1);
    strictEqual(events.evt3.callCount, 1);

    for (var key in events) {
        strictEqual(disp.events[key], undefined);
    }
});

test("Dispatcher can register an event handler for single trigger", function () {
    var eventName = "myevent",
        handler = sinon.spy(),
        disp = new shield.Dispatcher();

    disp.one(eventName, handler);
    
    disp.trigger(eventName);
    disp.trigger(eventName);

    strictEqual(handler.callCount, 1);
    strictEqual(disp.events[eventName], undefined);
});

test("Dispatcher can register an array of events to a handler for single trigger", function () {
    var events = ["evt1", "evt2", "evt3"],
        handler = sinon.spy(),
        disp = new shield.Dispatcher();

    disp.one(events, handler);

    for (var i = 0; i < events.length; i++) {
        disp.trigger(events[i], events[i]);
        disp.trigger(events[i], events[i]);
    }

    strictEqual(handler.callCount, 3);
    strictEqual(handler.args[0][0], events[0]);
    strictEqual(handler.args[1][0], events[1]);
    strictEqual(handler.args[2][0], events[2]);

    for (var i = 0; i < events.length; i++) {
        strictEqual(disp.events[events[i]], undefined);
    }
});

test("Dispatcher can register an array of events to a dictionary of handlers for single trigger", function () {
    var events = ["evt1", "evt2", "evt3"],
        handlers = {
            evt1: sinon.spy(),
            evt2: sinon.spy(),
            evt3: sinon.spy()
        },
        disp = new shield.Dispatcher();

    disp.one(events, handlers);

    for (var i = 0; i < events.length; i++) {
        disp.trigger(events[i], events[i]);
        disp.trigger(events[i], events[i]);
    }

    ok(handlers.evt1.calledOnce);
    ok(handlers.evt2.calledOnce);
    ok(handlers.evt3.calledOnce);

    for (var i = 0; i < events.length; i++) {
        strictEqual(disp.events[events[i]], undefined);
    }
});

test("Dispatcher can remove event handlers", function () {
    var handler1 = sinon.spy(),
        handler2 = sinon.spy(),
        handler3 = sinon.spy(),
        disp = new shield.Dispatcher();

    disp.on("evt1", handler1);
    disp.on("evt1", handler2);
    disp.on("evt2", handler3);

    strictEqual(disp.events.evt1.length, 2);
    strictEqual(disp.events.evt2.length, 1);
    strictEqual(disp.events.evt1[0].handler, handler1);
    strictEqual(disp.events.evt1[1].handler, handler2);
    strictEqual(disp.events.evt2[0].handler, handler3);

    disp.off("evt1", function () { });
    strictEqual(disp.events.evt1.length, 2);
    strictEqual(disp.events.evt1[0].handler, handler1);
    strictEqual(disp.events.evt1[1].handler, handler2);

    disp.off("evt1", handler1);
    strictEqual(disp.events.evt1.length, 1);
    strictEqual(disp.events.evt1[0].handler, handler2);

    disp.off("evt2", handler3);
    strictEqual(disp.events.evt2, undefined);

    disp.on("evt1", handler1);
    disp.on("evt1", handler3);
    strictEqual(disp.events.evt1.length, 3);
    strictEqual(disp.events.evt1[0].handler, handler2);
    strictEqual(disp.events.evt1[1].handler, handler1);
    strictEqual(disp.events.evt1[2].handler, handler3);

    disp.off("evt1");
    strictEqual(disp.events.evt1, undefined);
});

test("Dispatcher can register to events through initialization options", function () {
    var handler1 = sinon.spy(),
        handler2 = sinon.spy(),
        disp = new shield.Dispatcher({
            events: {
                evt1: handler1,
                evt2: handler2
            }
        });

    strictEqual(disp.events.evt1[0].handler, handler1);
    strictEqual(disp.events.evt2[0].handler, handler2);

    disp.trigger("evt1");
    disp.trigger("evt2");

    ok(handler1.calledOnce);
    ok(handler2.calledOnce);

    disp.off("evt1");
    disp.off("evt2");

    disp.trigger("evt1");
    disp.trigger("evt2");

    ok(handler1.calledOnce);
    ok(handler2.calledOnce);

    strictEqual(disp.events.evt1, undefined);
    strictEqual(disp.events.evt2, undefined);
});

test("Dispatcher removes all events on destroy", function () {
    var handlers = {
        evt1: sinon.spy(),
        evt2: sinon.spy(),
        evt3: sinon.spy()
    };
    var disp = new shield.Dispatcher({ events: handlers });

    disp.trigger("evt1");
    disp.trigger("evt2");
    disp.trigger("evt3");

    ok(handlers.evt1.calledOnce);
    ok(handlers.evt2.calledOnce);
    ok(handlers.evt3.calledOnce);

    disp.destroy();

    disp.trigger("evt1");
    disp.trigger("evt2");
    disp.trigger("evt3");

    ok(handlers.evt1.calledOnce);
    ok(handlers.evt2.calledOnce);
    ok(handlers.evt3.calledOnce);

    deepEqual(disp.events, {});
});

test("Dispatcher can support namespaced events", function () {
    var disp = new shield.Dispatcher(),
        handler1 = sinon.spy(),
        handler2 = sinon.spy(),
        handler3 = sinon.spy();

    disp.on('evtx', handler1);
    disp.on('evtx.ns1', handler2);
    disp.on('evtx.ns2', handler3);

    strictEqual(disp.events.evtx.length, 3);

    disp.trigger('evtx');

    ok(handler1.calledOnce);
    ok(handler2.calledOnce);
    ok(handler3.calledOnce);

    disp.off('evtx.ns1');

    strictEqual(disp.events.evtx.length, 2);

    disp.trigger('evtx');

    ok(handler1.calledTwice);
    ok(handler2.calledOnce);
    ok(handler3.calledTwice);

    disp.off('evtx');

    strictEqual(disp.events.evtx, undefined);

    disp.trigger('evtx');

    ok(handler1.calledTwice);
    ok(handler2.calledOnce);
    ok(handler3.calledTwice);
});

test("Dispatcher remove all events for a namespace", function () {
    var disp = new shield.Dispatcher(),
        handler1 = sinon.spy(),
        handler2 = sinon.spy(),
        handler3 = sinon.spy(),
        handler4 = sinon.spy(),
        handler5 = sinon.spy();

    disp.on('evtx', handler1);
    disp.on('evtx.ns1', handler2);
    disp.on('evtx.ns2', handler3);
    disp.on('evtx.ns2', handler4);
    disp.on('anotherevt.ns2', handler5);

    strictEqual(disp.events.evtx.length, 4);
    strictEqual(disp.events.anotherevt.length, 1);

    disp.trigger('evtx');
    disp.trigger('anotherevt');

    ok(handler1.calledOnce);
    ok(handler2.calledOnce);
    ok(handler3.calledOnce);
    ok(handler4.calledOnce);
    ok(handler5.calledOnce);
    
    disp.off('.ns2');

    strictEqual(disp.events.evtx.length, 2);
    strictEqual(disp.events.anotherevt, undefined);

    disp.trigger('evtx');
    disp.trigger('anotherevt');

    ok(handler1.calledTwice);
    ok(handler2.calledTwice);
    ok(handler3.calledOnce);
    ok(handler4.calledOnce);
    ok(handler5.calledOnce);
});

