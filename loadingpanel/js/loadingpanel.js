(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		doc = document,

        mathCeil = Math.ceil,

        userAgent = navigator.userAgent,
		isOpera = win.opera,
		isIE = /msie/i.test(userAgent) && !isOpera,
        isIE7 = isIE && doc.documentMode === 7,

		extend = $.extend,

        defaults, LoadingPanel;


    // the default configuration options for the loadingpanel
    defaults = {
        show: false,
        showImage: true,
        text: null,
        template: null,
        useSmallImage: false
    };
    // the LoadingPanel class encapsulating the main loadingpanel logic
    LoadingPanel = Widget.extend({
        // initialization method, called by the framework
        init: function (element, userOptions) {
            var self = this;

            // call the parent init
            Widget.fn.init.apply(self, arguments);

            self.refresh();

            if (self.options.show) {
                self.show();
            }
            else {
                self.hide();
            }
        },

        destroy: function () {
            var self = this;

            $(self.mainElement).remove();

            if (self.options.showImage) {
                $(self.loadingImage).remove();
                self.loadingImage = null;
            }

            if (self.loadingText) {
                $(self.loadingText).remove();
                self.loadingText = null;
            }

            $(self.backgroundElement).remove();

            self.mainElement = self.backgroundElement = null;

            Widget.fn.destroy.call(self);
        },

        _render: function () {
            var self = this,
                options = self.options,
                template = options.template,
                mainElement;

            self.mainElement = mainElement = $("<div/>").appendTo(doc.body);

            mainElement.addClass("sui-loading-panel");
            if (isIE7) {
                mainElement.addClass("sui-loading-panel-ie7");
            }

            if (!template) {
                if (options.showImage) {
                    var loadingImage = $("<span/>").appendTo(mainElement);
                    self.loadingImage = loadingImage;

                    if (options.useSmallImage) {
                        loadingImage.addClass("sui-loading-image-small");
                    }
                    else {
                        loadingImage.addClass("sui-loading-image");
                    }
                }

                if (options.text) {
                    self._generateTextElement();
                }
            }
            else {
                template = $(template.replace(/^\s+/, '').replace(/\s+$/, ''));
                template.appendTo(doc.body);

                var top = mathCeil(((self.element.height() - template.height()) / 2)),
                    left = mathCeil((self.element.width() - template.width()) / 2);

                template
                    .css({ "z-index": "inherit", position: "relative", dispaly: "block", top: top + "px", left: left + "px" })
                    .appendTo(mainElement);

                self.template = template;
            }

            var backgroundElement = $("<span/>").appendTo(mainElement);
            self.backgroundElement = backgroundElement;

            backgroundElement.addClass("sui-loading-back");

            self._setPosition();
        },

        _generateTextElement: function () {
            var self = this,
                loadingText = $("<span/>").appendTo(self.mainElement);

            loadingText.get(0).innerHTML = self.options.text;
            loadingText.addClass("sui-loading-text");

            self.loadingText = loadingText;
        },

        refresh: function () {
            var self = this,
                options = self.options,
                hidden = (self.mainElement && self.mainElement.css("display") != "none") ? false : true;

            self.destroy();
            self._render();

            if (!hidden) {
                self.show();
            }
            else {
                self.hide();
            }
        },

        _setPosition: function () {
            var self = this,
                options = self.options,
                element = self.element,
                offset = element.offset(),
                zIndex = shield.ui.Util.GetMaxZIndex("div") + 1;

            self.mainElement.css({ left: mathCeil(offset.left) + "px", top: mathCeil(offset.top) + "px", "z-index": zIndex });

            if (isIE7) {
                if (self.loadingText) {
                    self.loadingText.css({ "z-index": zIndex + 1 });
                }
                if (self.loadingImage) {
                    self.loadingImage.css({ "z-index": zIndex + 1 });
                }
                if (self.template) {
                    self.template.css("z-index", zIndex + 1);
                }
            }
        },

        _setElementsPosition: function () {
            var self = this,
                elementHeight = self.element.height(),
                loadingImage = self.loadingImage,
                loadingtext = self.loadingText,
                imageHeight = loadingImage ? loadingImage.height() : 0,
                textHeight = loadingtext ? loadingtext.height() : 0,
                top = mathCeil(((elementHeight - imageHeight - textHeight) / 2));

            if (loadingImage) {
                self.loadingImage.css("top", top + "px");
            }
            if (loadingtext) {
                self.loadingText.css("top", top + "px");
            }
        },

        show: function () {
            var self = this,
                options = self.options,
                element = self.element;

            self.mainElement.width(element.get(0).offsetWidth);
            self.mainElement.height(element.get(0).offsetHeight);

            self._setPosition();

            self.mainElement.css("display", "");
            if (!options.template) {
                self._setElementsPosition();
            }
        },

        hide: function () {
            this.mainElement.css("display", "none");
        },

        setText: function (text) {
            this.options.text = text;
            this.refresh();
        }
    });
    LoadingPanel.defaults = defaults;
    shield.ui.plugin("LoadingPanel", LoadingPanel);

})(jQuery, shield, this);