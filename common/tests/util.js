module("util.js");

test("Position.Set - left top at right top", function () {
    var base = $('<div style="width:100px; height:100px; position:absolute; top:150px; left:150px;"></div>')
        .appendTo(document.body);

    var element = $('<div style="width:200px; height:100px; position:absolute;"></div>')
        .appendTo(document.body);

    shield.ui.Position.Set(element, base, {
        source: "left top",
        target: "right top"
    });

    equal(element.css("left"), "250px");
    equal(element.css("top"), "150px");

    base.remove();
    element.remove();
});

test("Position.Set - center at center", function () {
    var base = $('<div style="width:100px; height:100px; position:absolute; top:150px; left:150px;"></div>')
        .appendTo(document.body);

    var element = $('<div style="width:200px; height:100px; position:absolute;"></div>')
        .appendTo(document.body);

    shield.ui.Position.Set(element, base, {
        source: "center",
        target: "center"
    });

    equal(element.css("left"), "100px");
    equal(element.css("top"), "150px");

    base.remove();
    element.remove();
});

test("Position.Set - top left at bottom right", function () {
    var base = $('<div style="width:100px; height:100px; position:absolute; top:150px; left:150px;"></div>')
        .appendTo(document.body);

    var element = $('<div style="width:200px; height:100px; position:absolute;"></div>')
        .appendTo(document.body);

    shield.ui.Position.Set(element, base, {
        source: "left top",
        target: "right bottom"
    });

    equal(element.css("left"), "250px");
    equal(element.css("top"), "250px");

    base.remove();
    element.remove();
});

test("MouseTracker - Singleton", function () {
    var mt1 = new shield.MouseTracker();
    var mt2 = new shield.MouseTracker();
    var mt3 = new shield.MouseTracker();

    strictEqual(mt1, mt2);
    strictEqual(mt1, mt3);
    strictEqual(mt2, mt3);
});

test("DDManager - Register/UnRegister - droppable cleanup", function() {
    strictEqual(shield.ui.DDManager.droppables["default"].length, 0);

    var droppable = new shield.ui.Droppable();

    strictEqual(shield.ui.DDManager.droppables["default"].length, 1);

    droppable.destroy();

    strictEqual(shield.ui.DDManager.droppables["default"].length, 0);
});
