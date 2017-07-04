(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
        Class = shield.Class,
        doc = document,
        is = shield.is,
        get = shield.get,
        format = shield.format,
        toInt = shield.to["int"],
        abs = Math.abs,
        each = $.each,
        proxy = $.proxy,
        extend = $.extend,
        map = $.map,
        isUndefined = is["undefined"],

        isOpera = win.opera,
        userAgent = navigator.userAgent,
        isIE = /msie/i.test(userAgent) && !isOpera,
        isIE7 = isIE && doc.documentMode === 7,

        KEYDOWN = "keydown",
        CLICK = "click",
        MOUSEDOWN = "mousedown",
        CHANGE = "change",
        SELECT = "select",
        CANCEL = "cancel",
        DISPLAY = "display",
        NONE = "none",

        trim = function(str) {
            return is.string(str) ? str.replace(/^\s+/, '').replace(/\s+$/, '') : str;
        },

        defaults, ColorPicker, Drag;

    // the default configuration options for the ColorPicker
    defaults = {
        cls: UNDEFINED,
        palette: "basic", // "advanced"
        basicPalette: {
            columns: 10,
            tileSize: {
                width: 16,
                height: 16
            },
            tileBorderWidth: 0,
            palette: [
                "#FFFFFF", "#FFCCCC", "#FFCC99", "#FFFF99", "#FFFFCC", "#99FF99", "#99FFFF", "#CCFFFF", "#CCCCFF", "#FFCCFF",
                "#CCCCCC", "#FF6666", "#FF9966", "#FFFF66", "#FFFF33", "#66FF99", "#33FFFF", "#66FFFF", "#9999FF", "#FF99FF",
                "#BBBBBB", "#FF0000", "#FF9900", "#FFCC66", "#FFFF00", "#33FF33", "#66CCCC", "#33CCFF", "#6666CC", "#CC66CC",
                "#999999", "#CC0000", "#FF6600", "#FFCC33", "#FFCC00", "#33CC00", "#00CCCC", "#3366FF", "#6633FF", "#CC33CC",
                "#666666", "#990000", "#CC6600", "#CC9933", "#999900", "#009900", "#339999", "#3333FF", "#6600CC", "#993399",
                "#333333", "#660000", "#993300", "#996633", "#666600", "#006600", "#336666", "#000099", "#333399", "#663366",
                "#000000", "#330000", "#663300", "#663333", "#333300", "#003300", "#003333", "#000066", "#330099", "#330033"
            ]
        },
        advancedPalette: {
            type: "hex", //"rgb", "hsl",
            buttons: true,
            messages: {
                apply: "Apply",
                cancel: "Cancel"
            }
        },
        displayInline: false,
        showLetter: false,
        value: UNDEFINED,
        valueTemplate: function(color) {
            if (color) {
                if (color.hex) {
                    return color.hex();
                }
                else {
                    return color.toRGB().hex();
                }
            }
            else {
                return null;
            }
        }
    };
    // the ColorPicker class encapsulating the main ColorPicker logic
    ColorPicker = Widget.extend({
        // initialization method, called by the framework
        init: function (element, userOptions) {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				options = self.options,
                cls = options.cls,
                initialValue = is.defined(options.value) ? options.value : self._value(),
                picker;

            if (arguments.length > 1) {
                userOptions = arguments[1];
                if (userOptions.basicPalette && userOptions.basicPalette.palette) {
                    options.basicPalette.palette = userOptions.basicPalette.palette;
                }
            }

            // Hide undelying input element.
            self.element.css(DISPLAY, NONE);
            self._enabled = true;
            self.currentColor = new PickerColor({ color: initialValue });

            if (!options.displayInline) {
                // non inline display
                self._picker = picker = $('<span class="sui-color-picker-dropdown" tabindex="0"><span class="sui-color-cell sui-unselectable" unselectable="on">&nbsp;</span><span class="sui-caret-container sui-unselectable" unselectable="on"><span class="sui-caret" unselectable="on"></span></span></span>')
                    .insertAfter(self.element);

                // add any custom classes
                if (cls) {
                    self._picker.addClass(cls);
                }

                if (options.showLetter) {
                    var colorCell = picker.find(".sui-color-cell");

                    $('<span class="sui-tool-letter">A<span class="sui-selected-color"></span></span>').appendTo(colorCell);
                    picker.find(".sui-selected-color").css("background-color", self.currentColor.color.cssa());
                }
                else {
                    picker.find(".sui-color-cell").css("background-color", self.currentColor.color.cssa());
                }

                picker.on(CLICK, self._pickerClicked = proxy(self._pickerClickedHandler, self));
                $(doc).on(MOUSEDOWN + ".shieldColorPicker" + self.getInstanceId(), proxy(self._hidePopup, self));
            }
            else {
                // inline display
                self._buildPalette();

                // add any custom classes
                if (cls) {
                    self._picker.addClass(cls);
                }
            }

            if (self.currentColor.color.cssa) {
                self._oldColor = self.currentColor.color.cssa();
            }
            else {
                self._oldColor = self.currentColor.color.toRGB().cssa()
            }

            self._changed();
        },

        hidePalette: function() {
            this._hidePopup({});
        },

        // override the three visibility functions in order for visible() to work properly
        hide: function() {
            var self = this;

            if (self.options.displayInline) {
                // inline
                $(self.wrapperDiv).hide();
            }
            else {
                // not inline
                $(self._picker).hide();
                self._hidePopup({});
            }
        },

        show: function() {
            var self = this;

            if (self.options.displayInline) {
                // inline
                $(self.wrapperDiv).hide();
            }
            else {
                // not inline
                $(self._picker).show();
            }
        },

        isVisible: function() {
            var self = this;

            if (self.options.displayInline) {
                // inline
                return $(self.wrapperDiv).is(":visible");
            }
            else {
                // not inline
                return $(self._picker).is(":visible");
            }
        },

        _changed: function() {
            var self = this;

            self._value(shield.format.call(self, self.options.valueTemplate, self.currentColor.color));
        },

        // getter and setter for the input's value
	    _value: function () {
	        return this.element.attr.apply(this.element, ["value"].concat([].slice.call(arguments)));
	    },

        _buildPalette: function () {
            var self = this;

            if (self.options.palette == "basic") {
                self._buildBasicPalette();
            }
            else {
                self._buildAdvancedPalette();
                self._changeAdvancedPaletteColor();
            }
        },

        _changeAdvancedPaletteColor: function () {
            var self = this,
                ret = self.currentColor.color.toHSV();

            if (!self.wrapperDiv) {
                return;
            }
            self._hue = ret.hue;

            if (!self._isHsl) {
                self._XY(self, { pointer: self.wrapperDiv.find(".sui-color-palette .pointer").get(0), x: ret.saturation, y: 1 - ret.value });
                self._Z(self, ret.hue, self.wrapperDiv.find(".sui-color-scale .pointer").get(0));
            }
            else {
                ret = self.currentColor.color.toHSL();
                self._XY(self, { pointer: self.wrapperDiv.find(".sui-color-palette .pointer").get(0), x: ret.hue, y: 1 - ret.saturation });
                self._Z(self, 1 - ret.lightness, self.wrapperDiv.find(".sui-color-scale .pointer").get(0));
            }
        },

        _pickerClickedHandler: function () {
            var self = this;

            if (!self.wrapperDiv) {
                self._buildPalette();
            }

            self._showPopup();
        },

        _showPopup: function () {
            var self = this,
                offset = self._picker.offset(),
                top = offset.top - $(doc).scrollTop(),
                height = self._picker.height(),
                documentHeight = $(win).height();

            if (self.options.palette === "advanced") {
                if (self.currentColor.color.cssa) {
                    self._oldColor = self.currentColor.color.cssa();
                }
                else {
                    self._oldColor = self.currentColor.color.toRGB().cssa()
                }
            }
            if (self.wrapperDiv && self.wrapperDiv.css(DISPLAY) != NONE) {
                return;
            }

            self._popupIsOver = false;

            var popupTop = offset.top + height + 1,
                offsetLeft = offset.left,
                pickerHeight = self.wrapperDiv.height();

            if (documentHeight < pickerHeight + top + height) {
                popupTop = offset.top - pickerHeight - 1;
            }
            else {
                popupTop++;
            }

            if (popupTop < 0 || $(doc).scrollTop() > popupTop) {
                popupTop = offset.top + height + 1;
            }

            if (offset.top > popupTop) {
                self._popupIsOver = true;
            }
            else {
                self._popupIsOver = false;
            }

            if (!self.wrapperDiv) {
                this._buildPalette();
            }

            if (!self._popupIsOver) {
                self.wrapperDiv.css({
                    position: 'absolute',
                    zIndex: 10002,
                    top: popupTop - 1,
                    left: offsetLeft
                });
                self.wrapperDiv.slideDown(150, function () {});
            }
            else {
                self.wrapperDiv.css({
                    position: 'absolute',
                    zIndex: 10002,
                    top: popupTop + pickerHeight,
                    left: offsetLeft,
                    height: 0,
                    display: ""
                });
                self.wrapperDiv.animate({
                    height: pickerHeight,
                    top: popupTop
                }, 150);
            }
        },

        _hidePopup: function (e) {
            var self = this,
                height,
                options = self.options,
                target = $(e.target);

            if (options.palette != "basic" && (target.hasClass("sui-colorpicker") || target.parents(".sui-colorpicker").length > 0)) {
                return;
            }

            if (self.wrapperDiv && self.wrapperDiv.css(DISPLAY) != NONE) {
                if (options.palette === "basic") {
                    var colorIndicator = self._picker.find(".sui-tool-letter > .sui-selected-color");
                    if (colorIndicator.length === 0) {
                        colorIndicator = self._picker.find(".sui-color-cell");
                    }
                    colorIndicator.css("background-color", self.currentColor.color.css());
                }

                if (!self._popupIsOver) {
                    self.wrapperDiv.slideUp(150, function () { });
                }
                else {
                    height = self.wrapperDiv.height();
                    self.wrapperDiv.animate({
                        height: 0,
                        top: self._picker.offset().top
                    }, 150, function () {
                        $(this)
                            .css(DISPLAY, NONE)
                            .css("height", height);
                    });
                }

                var currentColorCssa;
                if (self.currentColor.color.cssa) {
                    currentColorCssa = self.currentColor.color.cssa();
                }
                else {
                    currentColorCssa = self.currentColor.color.toRGB().cssa();
                }

                if (options.palette != "basic") {
                    if (options.advancedPalette.buttons) {
                        if (currentColorCssa !== self._oldColor) {
                            self.currentColor = new PickerColor({ color: self._oldColor });
                            setTimeout(function () {
                                self._update();
                                self.trigger(CANCEL);
                            }, 200);
                        }
                        else {
                            self._changed();
                        }
                    }
                    else {
                        self._changeSelectedColorCell();
                        self._changed();
                        self.trigger(CHANGE);
                    }
                }
            }
        },

        _buildBasicPalette: function () {
            var self = this,
                options = self.options,
                basicPalette = options.basicPalette,
                palette = basicPalette.palette,
                tileSize = basicPalette.tileSize,
                wrapperDiv,
                paletteWidth = 0,
                wrapper = $("<div class='sui-colorpicker sui-colorpicker-basic-palette'/>");

            if (options.displayInline) {
                wrapperDiv = wrapper.insertAfter(self.element);
            }
            else {
                wrapperDiv = wrapper
                    .appendTo(doc.body)
                    .css(DISPLAY, NONE);
            }

            for (var i = 0; i < palette.length; i++) {
                $("<div class='sui-palette-tile'/>")
                    .css({
                        backgroundColor: palette[i],
                        width: tileSize.width,
                        height: tileSize.height,
                        borderWidth: basicPalette.tileBorderWidth,
                        margin: "0 " + basicPalette.tileBorderWidth + "px " + basicPalette.tileBorderWidth + "px 0"
                    })
                    .on(MOUSEDOWN, self._tileClicked = proxy(self._tileClickedHandler, self))
                    .appendTo(wrapperDiv)
                    .addClass((self.currentColor.color.hex().toUpperCase() == palette[i].toUpperCase()) ? "sui-palette-tile-selected" : "");
            }

            paletteWidth = basicPalette.columns * toInt(tileSize.width) + basicPalette.columns * basicPalette.tileBorderWidth;

            wrapperDiv.css("width", paletteWidth + "px");

            self.wrapperDiv = wrapperDiv;
        },

        _tileClickedHandler: function (e) {
            var self = this;

            if (self._enabled) {
                self.wrapperDiv.find(".sui-palette-tile-selected").removeClass("sui-palette-tile-selected");
                $(e.target).addClass("sui-palette-tile-selected");
                var backColorString = $(e.target).css("background-color");
                self.currentColor = new PickerColor({ color: backColorString });
                self.trigger(SELECT);
                self._changed();
            }
        },

        _buildAdvancedPalette: function () {
            var self = this,
                options = self.options,
                extraHtml,
                hexWrapper,
                wrapperDiv;

            if (options.displayInline) {
                wrapperDiv = $("<div/>")
                            .insertAfter(self.element)
                            .addClass("sui-colorpicker");
            }
            else {
                wrapperDiv = $("<div/>")
                            .appendTo(doc.body)
                            .addClass("sui-colorpicker")
                            .css(DISPLAY, NONE);
            }

            self.wrapperDiv = wrapperDiv;

            hexWrapper = $("<div class='sui-hex-wrapper'/>").appendTo(wrapperDiv);
            self.colorDiv = $("<div class='sui-color-div'/>").appendTo(hexWrapper);
            if (options.advancedPalette.type == "hsl") {
                self.colorInput = $("<input class='sui-alpha-input'/>").appendTo(hexWrapper);
            }
            else {
                self.colorInput = $("<input class='sui-hex-input'/>").appendTo(hexWrapper);
            }

            self.colorInput.on(KEYDOWN, self._colorInputKeyDown = proxy(self._colorInputKeyDownHandler, self));
            var html = "<div class='sui-color-palette'><div class='pointer'><div class='shape shape1'></div><div class='shape shape2'></div></div><div class='bg bg1'></div><div class='bg bg2'></div></div><div class='sui-color-scale'><div class='pointer'><div class='shape'></div></div><div class='bg'></div></div>";

            $(html).appendTo(wrapperDiv);

            var xy = new Drag({
                twod: wrapperDiv.find(".sui-color-palette").get(0),
                pointer: wrapperDiv.find(".sui-color-palette .pointer").get(0),
                oned: wrapperDiv.find(".sui-color-scale").get(0),
                isXYslider: true,
                cbs: {
                    begin: self._changeXY,
                    change: self._changeXY,
                    end: self._done
                }
            }, self);

            self.xy = xy;

            var z = new Drag({
                twod: wrapperDiv.find(".sui-color-palette").get(0),
                pointer: wrapperDiv.find(".sui-color-scale .pointer").get(0),
                oned: wrapperDiv.find(".sui-color-scale").get(0),
                isXYslider: false,
                cbs: {
                    begin: self._changeZ,
                    change: self._changeZ,
                    end: self._done
                }
            }, self);

            self.z = z;

            if (options.advancedPalette.type == "rgb") {
                extraHtml = "<div class='extras'/>";

                var extraDiv = $(extraHtml).appendTo(wrapperDiv);
                $("<span class='sui-r-text'>R:</span>").appendTo(extraDiv);
                self.rInput = $("<input class='sui-r-input'/>").appendTo(extraDiv);
                self._rInputKeyDown = proxy(self._rInputKeyDownHandler, self);
                $("<span class='sui-g-text'>G:</span>").appendTo(extraDiv);
                self.gInput = $("<input class='sui-g-input'/>").appendTo(extraDiv);
                self._gInputKeyDown = proxy(self._gInputKeyDownHandler, self);
                $("<span class='sui-b-text'>B:</span>").appendTo(extraDiv);
                self.bInput = $("<input class='sui-b-input'/>").appendTo(extraDiv);
                self._bInputKeyDown = proxy(self._bInputKeyDownHandler, self);

                if (shield.ui.NumericTextBox) {
                    self.rInput = new shield.ui.NumericTextBox(self.rInput, {
                        min: 0,
                        max: 255,
                        step: 0.01,
                        spinners: false,
                        cls: "rgbInputs",
                        events: {
                            change: self._rInputKeyDown
                        }
                    });

                    self.gInput = new shield.ui.NumericTextBox(self.gInput, {
                        min: 0,
                        max: 255,
                        step: 0.01,
                        spinners: false,
                        cls: "rgbInputs",
                        events: {
                            change: self._gInputKeyDown
                        }
                    });

                    self.bInput = new shield.ui.NumericTextBox(self.bInput, {
                        min: 0,
                        max: 255,
                        step: 0.01,
                        spinners: false,
                        cls: "rgbInputs",
                        events: {
                            change: self._bInputKeyDown
                        }
                    });
                }
            }

            if (options.advancedPalette.type == "hsl") {
                self._isHsl = true;
                extraHtml = "<div class='sui-transparent-slider'><div class='sui-color-scale alpha'><div class='pointer' style='top: 0%;'><div class='shape'></div></div><div class='bg'></div></div></div>";
                wrapperDiv.addClass("sui-hsl");
                $(extraHtml).appendTo(wrapperDiv);

                var a = new Drag({
                    twod: wrapperDiv.find(".alpha").get(0),
                    pointer: wrapperDiv.find(".alpha .pointer").get(0),
                    oned: wrapperDiv.find(".alpha").get(0),
                    isXYslider: false,
                    cbs: {
                        begin: self._changeA,
                        change: self._changeA,
                        end: self._done
                    }
                }, self);

                self.a = a;
            }

            if (options.advancedPalette.buttons) {
                self._buildButtons();
            }
        },

        _buildButtons: function () {
            var self = this,
                messages = this.options.advancedPalette.messages,
                buttonsWrapper = $("<div class='sui-buttons-wrapper'/>")
                                 .appendTo(this.wrapperDiv);

            if (shield.ui.Button) {
                var applyButton = $("<button type='button'>" + messages.apply + "</button>")
                    .appendTo(buttonsWrapper);

                // build the button with the given options
                var btnApply = new shield.ui.Button(applyButton, {
                    cls: "sui-apply",
                    events: {
                        click: proxy(self._applyHandler, this)
                    }
                });

                self._applyButton = btnApply;

                var cancelButton = $("<button type='button'>" + messages.cancel + "</button>")
                    .appendTo(buttonsWrapper);

                // build the button with the given options
                var btnCancel = new shield.ui.Button(cancelButton, {
                    cls: "sui-cancel",
                    events: {
                        click: proxy(self._cancelHandler, this)
                    }
                });

                self._cancelButton = btnCancel;
            }
        },

        _applyHandler: function (e) {
            var self = this;

            if (self.currentColor.color.cssa) {
                self._oldColor = self.currentColor.color.cssa();
            }
            else {
                self._oldColor = self.currentColor.color.toRGB().cssa();
            }

            self._changeSelectedColorCell();

            if (!self.options.displayInline) {
                self._hidePopup(e);
            }

            self._changed();

            self.trigger(CHANGE);
        },

        _changeSelectedColorCell: function () {
            var self = this,
                options = self.options,
                picker = self._picker,
                color;

            if (self.currentColor.color.cssa) {
                color = self.currentColor.color.cssa();
            }
            else {
                color = self.currentColor.color.toRGB().cssa();
            }

            if (!options.displayInline) {
                if (options.showLetter) {
                    picker.find(".sui-selected-color").css("background-color", color);
                }
                else {
                    picker.find(".sui-color-cell").css("background-color", color);
                }
            }
        },

        _cancelHandler: function (e) {
            var self = this;

            if (!self.options.displayInline) {
                self._hidePopup(e);
            }
            else {
                self.currentColor = new PickerColor({ color: self._oldColor });
                setTimeout(function () {
                    self._update();
                    self.trigger(CANCEL);
                }, 200);
            }
        },

        _update: function () {
            var self = this,
                ret,
                shouldUpdateMainInput = self._shouldUpdateMainInput,
                shouldUpdateRgbInputs = self._shouldUpdateRgbInputs;

            if (!self._isHsl) {
                ret = self.currentColor.color.toHSV();

                self._XY(self, { pointer: self.wrapperDiv.find(".sui-color-palette .pointer").get(0), x: ret.saturation, y: 1 - ret.value });
                self._shouldUpdateMainInput = shouldUpdateMainInput;
                self._shouldUpdateRgbInputs = shouldUpdateRgbInputs;

                self._Z(self, ret.hue, self.wrapperDiv.find(".sui-color-scale .pointer").get(0));
            }
            else {
                ret = self.currentColor.color.toHSL();

                self._XY(self, { pointer: self.wrapperDiv.find(".sui-color-palette .pointer").get(0), x: ret.hue, y: 1 - ret.saturation });
                self._shouldUpdateMainInput = shouldUpdateMainInput;
                self._Z(self, 1 - ret.lightness, self.wrapperDiv.find(".sui-color-scale .pointer").get(0));
                self.Y(self.wrapperDiv.find(".alpha .pointer").get(0), (1 - ret.alpha).toFixed(2));
            }
        },

        _rInputKeyDownHandler: function (e) {
            var self = this;

            setTimeout(function () {
                var value = e.value,
                    ret;

                self.currentColor.color.red = parseFloat(value) / 255;
                self._shouldUpdateRgbInputs = false;
                self._update();
                self.trigger(SELECT);
            }, 1);
        },

        _gInputKeyDownHandler: function (e) {
            var self = this;

            setTimeout(function () {
                var value = e.value,
                    ret;

                self.currentColor.color.green = parseFloat(value) / 255;
                self._shouldUpdateRgbInputs = false;
                self._update();
                self.trigger(SELECT);
            }, 1);
        },

        _bInputKeyDownHandler: function (e) {
            var self = this;

            setTimeout(function () {
                var value = e.value,
                    ret;

                self.currentColor.color.blue = parseFloat(value) / 255;
                self._shouldUpdateRgbInputs = false;
                self._update();
                self.trigger(SELECT);
            }, 1);
        },

        _colorInputKeyDownHandler: function (e) {
            var self = this;

            if (e.ctrlKey) {
                return;
            }

            setTimeout(function () {
                var input = e.currentTarget,
                    value = input.value,
                    oldColor = self.currentColor,
                    ret;

                self.currentColor = new PickerColor({ color: value });

                if (is.object(self.currentColor.color)) {
                    self._shouldUpdateRgbInputs = true;
                    self._shouldUpdateMainInput = false;
                    self._update();
                }
                else {
                    self.currentColor = oldColor;
                }

                self.trigger(SELECT);
            }, 1);
        },

        _changeA: function (self, p) {
            if (!self.colorPicker._enabled) {
                return;
            }

            self.colorPicker.colorInput.val("rgba(0,0,0,1)");

            var col = self.colorPicker._A(self.colorPicker, self.colorPicker.clamp(p.y, 0, 1), self.colorPicker.a.pointer);
        },

        _changeZ: function (self, p) {
            if (!self.colorPicker._enabled) {
                return;
            }

            if (!self.colorPicker._isHsl) {
                self.colorPicker.colorInput.val("#000000");
            }
            else {
                self.colorPicker.colorInput.val("rgba(0,0,0,1)");
            }

            var col = self.colorPicker._Z(self.colorPicker, self.colorPicker.clamp(p.y, 0, 1), self.colorPicker.z.pointer);

            self.colorPicker.trigger(SELECT);
        },

        _changeXY: function (self, p) {
            if (!self.colorPicker._enabled) {
                return;
            }

            if (!self.colorPicker._isHsl) {
                self.colorPicker.colorInput.val("#000000");
            }
            else {
                self.colorPicker.colorInput.val("rgba(0,0,0,1)");
            }

            var col = self.colorPicker._XY(self.colorPicker, {
                x: self.colorPicker.clamp(p.x, 0, 1),
                y: self.colorPicker.clamp(p.y, 0, 1),
                pointer: p.pointer
            }, self.colorPicker.xy);

            self.colorPicker.X(p.pointer, p.x);
            self.colorPicker.Y(p.pointer, p.y);

            self.colorPicker.trigger(SELECT);
        },

        _XY: function (colorPicker, xy) {
            var self = this,
                col;

            if (!colorPicker._enabled) {
                return;
            }

            colorPicker.X(xy.pointer, xy.x);
            colorPicker.Y(xy.pointer, xy.y);

            if (!self._isHsl) {
                col = colorPicker.currentColor.color.toHSV();
                if (xy.x > 1) {
                    xy.x = 1;
                }
                if (xy.x < 0) {
                    xy.x = 0;
                }
                if (xy.y < 0) {
                    xy.y = 0;
                }
                if (xy.y > 1) {
                    xy.y = 1;
                }

                col.saturation = xy.x;
                col.value = (1 - xy.y);
                if (col.hue === 0) {
                    col.hue = self._hue;
                }
            }
            else {
                col = colorPicker.currentColor.color.toHSL ? colorPicker.currentColor.color.toHSL() : colorPicker.currentColor.color;
                col.hue = xy.x;
                col.saturation = (1 - xy.y);

                var tempColorLightness = col.lightness;
                col.lightness = 0.5;
                self.wrapperDiv.find(".sui-color-scale").css("background-color", col.toRGB().cssa());
                col.lightness = tempColorLightness;
            }

            var rgbColor = col.toRGB();
            var colorInputValue = colorPicker.colorInput.val();

            if (colorInputValue != rgbColor.hex()) {
                if (self._shouldUpdateMainInput) {
                    if (colorInputValue.length > 4 || colorInputValue.length === 0) {

                        if (!self._isHsl) {
                            colorPicker.colorInput.val(rgbColor.hex());
                        }
                        else {
                            colorPicker.colorInput.val(rgbColor.cssa());
                        }
                    }
                }
                else {
                    self._shouldUpdateMainInput = true;
                }
            }
            if (colorPicker.rInput) {
                if (self._shouldUpdateRgbInputs) {
                    colorPicker.rInput.value((255 * rgbColor.red).toFixed(2));
                    colorPicker.gInput.value((255 * rgbColor.green).toFixed(2));
                    colorPicker.bInput.value((255 * rgbColor.blue).toFixed(2));
                }
                else {
                    self._shouldUpdateRgbInputs = true;
                }
            }
            colorPicker.colorDiv.get(0).style.background = rgbColor.cssa();
            colorPicker.currentColor.color = rgbColor;
        },

        _Z: function (colorPicker, v, pointer) {
            var self = this,
                col,
                colorInputValue = colorPicker.colorInput.val();

            if (!self._isHsl) {
                col = colorPicker.currentColor.color.toHSV();
                colorPicker.Y(pointer, v);
                colorPicker._rgbBg(colorPicker, colorPicker.wrapperDiv.find(".sui-color-palette").get(0), v);

                self._hue = col.hue = v;

                var rgbColor = col.toRGB();

                if (colorInputValue != rgbColor.hex()) {
                    if (colorInputValue.length > 4 || colorInputValue.length === 0) {
                        if (!self._isHsl) {
                            colorPicker.colorInput.val(rgbColor.hex());
                        }
                        else {
                            colorPicker.colorInput.val(rgbColor.cssa());
                        }
                    }
                }
                if (colorPicker.rInput) {
                    if (self._shouldUpdateRgbInputs) {
                        colorPicker.rInput.value((255 * rgbColor.red).toFixed(2));
                        colorPicker.gInput.value((255 * rgbColor.green).toFixed(2));
                        colorPicker.bInput.value((255 * rgbColor.blue).toFixed(2));
                    }
                    else {
                        self._shouldUpdateRgbInputs = true;
                    }
                }
                colorPicker.colorDiv.get(0).style.background = rgbColor.cssa();
                colorPicker.currentColor.color = rgbColor;
            }
            else {
                col = colorPicker.currentColor.color.toHSL ? colorPicker.currentColor.color.toHSL() : colorPicker.currentColor.color;
                colorPicker.Y(pointer, v);
                col.lightness = (1 - v);

                colorPicker.colorDiv.get(0).style.background = col.toRGB().cssa();
                colorPicker.currentColor.color = col;

                if (colorInputValue != col.toRGB().hex()) {
                    if (self._shouldUpdateMainInput) {
                        if (colorInputValue.length > 4 || colorInputValue.length === 0) {
                            if (!self._isHsl) {
                                colorPicker.colorInput.val(col.toRGB().hex());
                            }
                            else {
                                colorPicker.colorInput.val(col.toRGB().cssa());
                            }
                        }
                    }
                    else {
                        self._shouldUpdateMainInput = true;
                    }
                }
            }
        },

        _A: function (colorPicker, v, pointer) {
            var self = this,
                col,
                colorInputValue = colorPicker.colorInput.val();

            col = colorPicker.currentColor.color.toHSL ? colorPicker.currentColor.color.toHSL() : colorPicker.currentColor.color;
            colorPicker.Y(pointer, v);
            col.alpha = (1 - v).toFixed(2);

            colorPicker.colorDiv.get(0).style.background = col.toRGB().cssa();
            colorPicker.currentColor.color = col;

            if (colorInputValue != col.toRGB().hex()) {
                if (self._shouldUpdateMainInput) {
                    if (colorInputValue.length > 4 || colorInputValue.length === 0) {
                        colorPicker.colorInput.val(col.toRGB().cssa());
                        self.trigger(SELECT);
                    }
                }
                else {
                    self._shouldUpdateMainInput = true;
                }
            }
        },

        _rgbBg: function (colorPicker, element, hue) {
            var color = new PickerColor({}).HSV(hue, 1, 1).toRGB().cssa();
            colorPicker.BG(element, color);
        },

        clamp: function (a, minValue, maxValue) {
            return Math.min(Math.max(a, minValue), maxValue);
        },

        X: function (p, a) { p.style.left = this.clamp(a * 100, 0, 100) + '%'; },
        Y: function (p, a) { p.style.top = this.clamp(a * 100, 0, 100) + '%'; },
        BG: function (e, c) { e.style.background = c; },

        _done: function () { },

        enabled: function () {
            var self = this,
                options = self.options,
                args = [].slice.call(arguments),
                enabled;

            if (args.length > 0) {
                enabled = args[0];

                if (enabled) {
                    if (self._picker) {
                        self._picker.removeClass("sui-colorpicker-disabled");
                    }
                    if (self.wrapperDiv) {
                        self.wrapperDiv.removeClass("sui-colorpicker-disabled");
                    }
                }
                else {
                    if (self._picker) {
                        self._picker.addClass("sui-colorpicker-disabled");
                    }
                    if (self.wrapperDiv) {
                        self.wrapperDiv.addClass("sui-colorpicker-disabled");
                    }
                }

                if (self._applyButton) {
                    self._applyButton.enabled(enabled);
                }

                if (self._cancelButton) {
                    self._cancelButton.enabled(enabled);
                }

                if (!enabled) {
                    if (self.colorInput) {
                        self.colorInput.attr('readonly', 'readonly');
                    }
                    if (self.rInput) {
                        self.rInput.enable(false);
                        self.gInput.enable(false);
                        self.bInput.enable(false);
                    }
                }
                else {
                    if (self.colorInput) {
                        self.colorInput.removeAttr('readonly');
                    }
                    if (self.rInput) {
                        self.rInput.enable(true);
                        self.gInput.enable(true);
                        self.bInput.enable(true);
                    }
                }

                self._enabled = enabled;
            }
            else {
                return self._enabled;
            }
        },

        value: function () {
            var self = this,
                options = self.options,
                color,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                color = args[0];
                self.currentColor = new PickerColor({ color: color });

                if (options.palette == "basic") {
                    var cssColor = self.currentColor.color.css();

                    if (self.wrapperDiv) {
                        var allTiles = self.wrapperDiv.find(".sui-palette-tile");

                        for (var i = 0; i < allTiles.length; i++) {
                            if (allTiles[i].style.backgroundColor.replace(/\s+/g, "") === cssColor.replace(/\s+/g, "")) {
                                allTiles.removeClass("sui-palette-tile-selected");
                                $(allTiles[i]).addClass("sui-palette-tile-selected");
                            }
                        }
                    }
                }
                else {
                    self._changeAdvancedPaletteColor();
                }

                if (!options.displayInline) {
                    if (options.showLetter) {
                        var colorCell = self._picker.find(".sui-color-cell");

                        self._picker.find(".sui-selected-color").css("background-color", self.currentColor.color.cssa());
                    }
                    else {
                        self._picker.find(".sui-color-cell").css("background-color", self.currentColor.color.cssa());
                    }
                }

                self._changed();
            }
            else {
                color = self.currentColor.color;

                if (!color.css) {
                    color = color.toRGB();
                }

                return color;
            }
        },

        // destructor
        destroy: function () {
            var self = this;

            self.element.show();

            self.wrapperDiv.remove();

            if (self.colorInput) {
                self.colorInput.off(KEYDOWN, self._colorInputKeyDown);
            }
            if (self.rInput) {
                self.rInput.destroy();
                self.gInput.destroy();
                self.bInput.destroy();
            }

            if (self.options.displayInline) {
                if (self.options.palette == "basic") {
                    self.wrapperDiv.find(".sui-palette-tile").off(CLICK, self._tileClicked);
                    self.wrapperDiv.remove();
                }
            }

            if (self._applyButton) {
                self._applyButton.destroy();
            }
            if (self._cancelButton) {
                self._cancelButton.destroy();
            }

            $(doc).off(MOUSEDOWN + ".shieldColorPicker" + self.getInstanceId());
 
            self._tileClicked =
                self._rInputKeyDown =
                self._gInputKeyDown =
                self._bInputKeyDown =
                self._hidePopupDelegate =
                self._picker =
                self._applyButton =
                self._cancelButton =
                self._isHsl =
                self.currentColor =
                self.wrapperDiv =
                self.colorInput =
                self.colorDiv =
                self.rInput =
                self.gInput =
                self._enabled =
                self._popupIsOver =
                self.bInput = null;

            Widget.fn.destroy.call(self);
        }
    });

    // Drag class
    // class which implements the color colorPicker sliders dragging
    Drag = Class.extend({
        init: function (options, colorPicker) {
            var self = this,
                xyslider = options.isXYslider,
                cbs = options.cbs,
                twod = options.twod,
                pointer = options.pointer,
                oned = options.oned;

            self.colorPicker = colorPicker;

            if (xyslider) {
                self.drag(twod, self.attachPointer(self, cbs, pointer));

                return {
                    background: twod,
                    pointer: pointer
                };
            }
            else {
                self.drag(oned, self.attachPointer(self, cbs, pointer));

                return {
                    background: oned,
                    pointer: pointer
                };
            }
        },

        drag: function (elem, cbs) {

            if (!elem) {
                console.warn('drag is missing elem!');
                return;
            }

            if (this.isTouch()) {
                this.dragTemplate(elem, cbs, 'touchstart', 'touchmove', 'touchend');
            }
            else {
                this.dragTemplate(elem, cbs, 'mousedown', 'mousemove', 'mouseup');
            }
        },

        attachPointer: function (self, cbs, pointer) {

            var ret = {};

            function wrap(fn) {
                return function (self, p) {

                    p.pointer = pointer;
                    fn(self, p);
                };
            }

            for (var n in cbs) {
                if (cbs.hasOwnProperty(n)) {
                    ret[n] = wrap(cbs[n]);
                }
            }

            return ret;
        },

        isTouch: function () {
            return typeof (win.ontouchstart) != 'undefined';
        },

        dragTemplate: function (elem, cbs, down, move, up) {
            var self = this,
                dragging = false;

            cbs = self.getCbs(cbs);

            var beginCb = cbs.begin;
            var changeCb = cbs.change;
            var endCb = cbs.end;
            self.on(elem, down, function (e) {
                dragging = true;
                var moveHandler = self.partial(self, self.callCb, changeCb, elem);
                function upHandler() {
                    dragging = false;

                    self.off(doc, move, moveHandler);
                    self.off(doc, up, upHandler);

                    self.callCb(endCb, elem, e);
                }

                self.on(doc, move, moveHandler);
                self.on(doc, up, upHandler);

                self.callCb(beginCb, elem, e);
            });
        },

        on: function (elem, evt, handler) {
            if (elem.addEventListener) {
                elem.addEventListener(evt, handler, false);
            }
            else if (elem.attachEvent) {
                elem.attachEvent('on' + evt, handler);
            }
        },

        off: function (elem, evt, handler) {
            if (elem.removeEventListener) {
                elem.removeEventListener(evt, handler, false);
            }
            else if (elem.detachEvent) {
                elem.detachEvent('on' + evt, handler);
            }
        },

        getCbs: function (cbs) {
            if (!cbs) {
                var initialOffset;
                var initialPos;

                return {
                    begin: function (c) {
                        initialOffset = { x: c.elem.offsetLeft, y: c.elem.offsetTop };
                        initialPos = c.cursor;
                    },
                    change: function (c) {
                        c.elem.style.left = (initialOffset.x + c.cursor.x - initialPos.x) + 'px';
                        c.elem.style.top = (initialOffset.y + c.cursor.y - initialPos.y) + 'px';
                    },
                    end: function () { }
                };
            }
            else {
                return {
                    begin: cbs.begin || function () { },
                    change: cbs.change || function () { },
                    end: cbs.end || function () { }
                };
            }
        },

        callCb: function (cb, elem, e) {
            var self = this;

            e.preventDefault();

            var offset = $(elem).offset();
            var width = elem.clientWidth;
            var height = elem.clientHeight;
            var cursor = {
                x: self.cursorX(elem, e),
                y: self.cursorY(elem, e)
            };
            var x = (cursor.x - offset.left) / width;
            var y = (cursor.y - offset.top) / height;

            cb(this, {
                x: isNaN(x) ? 0 : x,
                y: isNaN(y) ? 0 : y,
                cursor: cursor,
                elem: elem,
                e: e
            });
        },

        partial: function (doc, fn) {
            var slice = Array.prototype.slice;
            var args = slice.apply(arguments, [2]);
            var self = this;

            return function () {
                return fn.apply(self, args.concat(slice.apply(arguments)));
            };
        },

        cursorX: function (elem, evt) {
            var self = this;

            if (self.isFixed(elem)) {
                var bodyLeft = parseInt(self.getStyle(doc.body, 'marginLeft'), 10) -
                    self.calc(elem, 'scrollLeft') + win.pageXOffset +
                    elem.style.marginLeft;

                return evt.clientX - bodyLeft;
            }
            if (evt.pageX) {
                return evt.pageX;
            }
            else if (evt.clientX) {
                return evt.clientX + doc.body.scrollLeft;
            }
        },

        cursorY: function (elem, evt) {
            var self = this;

            if (self.isFixed(elem)) {
                var bodyTop = parseInt(self.getStyle(doc.body, 'marginTop'), 10) -
                    self.calc(elem, 'scrollTop') + win.pageYOffset +
                    elem.style.marginTop;

                return evt.clientY - bodyTop;
            }
            if (evt.pageY) {
                return evt.pageY;
            }
            else if (evt.clientY) {
                return evt.clientY + doc.body.scrollTop;
            }
        },

        calc: function (element, prop) {
            var ret = 0;

            while (element.nodeName != "HTML") {
                ret += element[prop];
                element = element.parentNode;
            }

            return ret;
        },

        isFixed: function (element) {
            while (element.nodeName != "HTML" && this.usedStyle(element,
                    "position") != "fixed") {
                element = element.parentNode;
            }
            if (element.nodeName == "HTML") {
                return false;
            }
            else {
                return true;
            }
        },

        getStyle: function (el, cssprop) {
            if (el.currentStyle) { // IE
                return el.currentStyle[cssprop];
            }

            if (doc.defaultView && doc.defaultView.getComputedStyle) {
                return doc.defaultView.getComputedStyle(el, "")[cssprop];
            }

            //try and get inline style
            return el.style[cssprop];
        },

        usedStyle: function (element, property) {
            var s;
            if (win.getComputedStyle) {
                s = win.getComputedStyle(element, null);
            }
            else {
                s = element.currentStyle;
            }

            return s[property];
        }
    });

    // Color class
    // class which implements the color transformations
    var PickerColor = Class.extend({
        init: function (options) {
            var self = this,
                color = options.color;

            if (isUndefined(color) || color === null || trim(color) === "") {
                self.color = self.getColor('#000');
            }
            else if (is.integer(color)) {
                // convert the integer to RGB and pass those, reverting the order ?!
                var c = color + 0,
                    rgb = [(c & 0xff0000) >> 16,  (c & 0x00ff00) >> 8,  (c & 0x0000ff)];
                self.color = self.getColor("rgb(" + rgb[2] + "," + rgb[1] + "," + rgb[0] + ")");
            }
            else {
                self.color = self.getColor(color);
            }
        },

        getColor: function (hexColor) {
            var self = this,
                channelRegExp = /\s*(\.\d+|\d+(?:\.\d+)?)(%)?\s*/,
                alphaChannelRegExp = /\s*(\.\d+|\d+(?:\.\d+)?)\s*/,
                cssColorRegExp = new RegExp(
                    "^(rgb|hsl|hsv)a?" +
                    "\\(" +
                        channelRegExp.source + "," +
                        channelRegExp.source + "," +
                        channelRegExp.source +
                        "(?:," + alphaChannelRegExp.source + ")?" +
                    "\\)$", "i"),
                lowerCased,
                matchCssSyntax,
                hexMatch;

            lowerCased = hexColor.toLowerCase();
            if (lowerCased === 'transparent') {
                hexColor = 'rgba(0,0,0,0)';
            }

            matchCssSyntax = hexColor.match(cssColorRegExp);
            if (matchCssSyntax) {
                var colorSpaceName = matchCssSyntax[1].toUpperCase(),
                    alpha = isUndefined(matchCssSyntax[8]) ? matchCssSyntax[8] : parseFloat(matchCssSyntax[8]),
                    hasHue = colorSpaceName[0] === 'H',
                    firstChannelDivisor = matchCssSyntax[3] ? 100 : (hasHue ? 360 : 255),
                    secondChannelDivisor = (matchCssSyntax[5] || hasHue) ? 100 : 255,
                    thirdChannelDivisor = (matchCssSyntax[7] || hasHue) ? 100 : 255;

                return self[colorSpaceName](
                    parseFloat(matchCssSyntax[2]) / firstChannelDivisor,
                    parseFloat(matchCssSyntax[4]) / secondChannelDivisor,
                    parseFloat(matchCssSyntax[6]) / thirdChannelDivisor,
                    alpha
                );
            }

            // Assume hex syntax
            if (hexColor.length < 6) {
                // Allow CSS shorthand
                hexColor = hexColor.replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, '$1$1$2$2$3$3');
            }

            // Split hexColor into red, green, and blue components
            hexMatch = hexColor.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i);
            if (hexMatch) {
                return self.RGB(
                    parseInt(hexMatch[1], 16) / 255,
                    parseInt(hexMatch[2], 16) / 255,
                    parseInt(hexMatch[3], 16) / 255
                );
            }

            return hexColor;
        },

        RGB: function (red, green, blue, alpha) {
            var self = this;

            return {
                red: red,
                green: green,
                blue: blue,
                alpha: isUndefined(alpha) ? 1 : alpha,
                hex: function () {
                    var hexString = (Math.round(255 * this.red) * 0x10000 + Math.round(255 * this.green) * 0x100 + Math.round(255 * this.blue)).toString(16);
                    return '#' + ('00000'.substr(0, 6 - hexString.length)) + hexString;
                },

                hexa: function () {
                    var alphaString = Math.round(this.alpha * 255).toString(16);
                    return '#' + '00'.substr(0, 2 - alphaString.length) + alphaString + this.hex().substr(1, 6);
                },

                css: function () {
                    return "rgb(" + Math.round(255 * this.red) + "," + Math.round(255 * this.green) + "," + Math.round(255 * this.blue) + ")";
                },

                cssa: function () {
                    return "rgba(" + Math.round(255 * this.red) + "," + Math.round(255 * this.green) + "," + Math.round(255 * this.blue) + "," + this.alpha + ")";
                },

                toHSV: function () {
                    var red = this.red,
                        green = this.green,
                        blue = this.blue,
                        max = Math.max(red, green, blue),
                        min = Math.min(red, green, blue),
                        delta = max - min,
                        hue,
                        saturation = (max === 0) ? 0 : (delta / max),
                        value = max;

                    if (delta === 0) {
                        hue = 0;
                    }
                    else {
                        switch (max) {
                            case red:
                                hue = (green - blue) / delta / 6 + (green < blue ? 1 : 0);
                                break;
                            case green:
                                hue = (blue - red) / delta / 6 + 1 / 3;
                                break;
                            case blue:
                                hue = (red - green) / delta / 6 + 2 / 3;
                                break;
                        }
                    }
                    return self.HSV(hue, saturation, value, alpha);
                },

                toHSL: function () {
                    var hsv = this.toHSV();
                    return self.HSV(hsv.hue, hsv.saturation, hsv.value, hsv.alpha).toHSL();
                },

                toCMYK: function () {
                    var red = this.red,
                        green = this.green,
                        blue = this.blue,
                        cyan = 1 - red,
                        magenta = 1 - green,
                        yellow = 1 - blue,
                        black = 1;

                    if (red || green || blue) {
                        black = Math.min(cyan, Math.min(magenta, yellow));
                        cyan = (cyan - black) / (1 - black);
                        magenta = (magenta - black) / (1 - black);
                        yellow = (yellow - black) / (1 - black);
                    }
                    else {
                        black = 1;
                    }

                    return self.CMYK(cyan, magenta, yellow, black, alpha);
                }
            };
        },

        HSV: function (hue, saturation, value, alpha) {
            var self = this;

            return {
                hue: hue,
                saturation: saturation,
                value: value,
                alpha: isUndefined(alpha) ? 1 : alpha,
                toRGB: function () {
                    var hue = this.hue,
                        saturation = this.saturation,
                        value = this.value,
                        i = Math.min(5, Math.floor(hue * 6)),
                        f = hue * 6 - i,
                        p = value * (1 - saturation),
                        q = value * (1 - f * saturation),
                        t = value * (1 - (1 - f) * saturation),
                        red,
                        green,
                        blue;

                    switch (i) {
                        case 0:
                            red = value;
                            green = t;
                            blue = p;
                            break;
                        case 1:
                            red = q;
                            green = value;
                            blue = p;
                            break;
                        case 2:
                            red = p;
                            green = value;
                            blue = t;
                            break;
                        case 3:
                            red = p;
                            green = q;
                            blue = value;
                            break;
                        case 4:
                            red = t;
                            green = p;
                            blue = value;
                            break;
                        case 5:
                            red = value;
                            green = p;
                            blue = q;
                            break;
                    }

                    return self.RGB(red, green, blue, alpha);
                },
                toHSL: function () {
                    var l = (2 - this.saturation) * this.value,
                        sv = this.saturation * this.value,
                        svDivisor = l <= 1 ? l : (2 - l),
                        saturation;

                    // Avoid division by zero when lightness approaches zero:
                    if (svDivisor < 1e-9) {
                        saturation = 0;
                    }
                    else {
                        saturation = sv / svDivisor;
                    }

                    return self.HSL(this.hue, saturation, l / 2, this.alpha);
                }
            };
        },

        HSL: function (hue, saturation, lightness, alpha) {
            var self = this;

            return {
                hue: hue,
                saturation: saturation,
                lightness: lightness,
                alpha: isUndefined(alpha) ? 1 : alpha,
                toHSV: function () {
                    var l = this.lightness * 2,
                        s = this.saturation * ((l <= 1) ? l : 2 - l),
                        saturation;

                    if (l + s < 1e-9) {
                        saturation = 0;
                    }
                    else {
                        saturation = (2 * s) / (l + s);
                    }

                    return self.HSV(this.hue, saturation, (l + s) / 2, this.alpha);
                },
                toRGB: function () {
                    return this.toHSV().toRGB();
                }
            };
        },

        CMYK: function (cyan, magenta, yellow, black, alpha) {
            var self = this;

            return {
                cyan: cyan,
                magenta: magenta,
                yellow: yellow,
                black: black,
                alpha: isUndefined(alpha) ? 1 : alpha,
                toRGB: function () {
                    return self.RGB(
                        (1 - this.cyan * (1 - this.black) - this.black),
                        (1 - this.magenta * (1 - this.black) - this.black),
                        (1 - this.yellow * (1 - this.black) - this.black),
                        this.alpha
                    );
                }
            };
        },

        destroy: function () {
            this.color = null;
        }
    });

    // Set the default options to the ColorPicker constructor
    ColorPicker.defaults = defaults;

    // register the shieldColorPicker jQuery plugin
    shield.ui.plugin("ColorPicker", ColorPicker);
    shield.ui.ColorPicker = ColorPicker;

})(jQuery, shield, this);