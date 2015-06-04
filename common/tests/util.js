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

