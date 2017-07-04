(function ($, shield, win, UNDEFINED) {
    //"use strict";

    var Widget = shield.ui.Widget,
		Class = shield.Class,
        shieldConstants = shield.Constants,
        shieldFormat = shield.format,
		doc = document,

		extend = $.extend,
		map = $.map,
		each = $.each,
		proxy = $.proxy,

		error = shield.error,
        isBoolean = shield.is["boolean"],
        isObject = shield.is.object,
        isDefined = shield.is.defined,
        isInt = shield.is.integer,
        toInt = shield.to["int"],
        toNumber = shield.to.number,
        support = shield.support,

        windowDefaults, Window,

        CLICK = "click",
        CLOSE = "close",
        MINIMIZE = "minimize",
        MAXIMIZE = "maximize",
        RESIZE = "resize",
        SCROLL = "scroll",
        PIN = "pin",
        OVERFLOW = "overflow",
        HIDDEN = "hidden",
        PX = "px",
        CENTER = "center",

        // HTML encoding function
        htmlEncode = function(value) {
            return $('<div/>').text(value).html();
        },

        parseCssInt = function(element, property) {
            var value = element.css(property);
            return value ? toInt(value) || 0 : 0;
        };


    // Window class - widget defaults
    windowDefaults = {
        title: "", // window title
        titleBarButtons: [ "pin", "minimize", "maximize", "close" ], // window titlebar buttons
        content: UNDEFINED,
        /*content: {
            template: {
                body: "",
                data: {},
                dataUrl: ""
            },
            remote: {
                url: "",
                iframe: false   // load the url in an iframe or use jQuery.load to load it in the window body
            }
        }*/
        cls: UNDEFINED, // an optional css class to add to the window
        visible: true,  // specifies whether the window will be initially visible
        pinned: false,  // Specifies whether the window should be pinned, i.e. it will not move together with the page content during scrolling
        modal: false,    // is modal window
        width: 400,     // window width
        height: 300,    // window height
        resizable: {    // resizable options - see resizable widget for details
            maxWidth: UNDEFINED,
            maxHeight: UNDEFINED,
            minWidth: 200,
            minHeight: 150
        },
        draggable: true,    // a boolean flag to indicate whether the window can be moved by dragging it on the titlebar
        position: UNDEFINED,    // centered to the browser window if not specified, or css position if it is specified
        appendToBody: false,    // if true, the underlying element will be moved as a child of the body and window will be rendered there too
        events: {
            // minimize
            // maximize
            // close
        }
    };
    // Public methods:
    //      bool visible()  /   void visible(boolVisible)
    //      string content() / void content(mixed)
    //      void center()
    //      void position(dict)
    //      void resize(dict)
    //      bool minimized     /   void minimized(boolMinimized)
    //      bool maximized     /   void maximized(boolMaximized)
    //      bool pinned     /   void pinned(boolPinned)
    //      void close()
    Window = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            // NOTE: hack the options.titleBarButtons, because the jQuery.exend
            // will merge the list instead of replacing it - i.e. if we have
            // custom titleBarButtons: ["close"], the result of extend will be:
            // [ "close", "minimize", "maximize", "close" ], which is wrong
            if (isDefined(this.initialOptions.titleBarButtons)) {
                this.options.titleBarButtons = this.initialOptions.titleBarButtons;
            }

            var self = this,
				options = self.options,
                cls = options.cls,
                dieOnError = options.dieOnError,
                titleBarButtonsOpts = options.titleBarButtons,
                resizableOpts = options.resizable,
                draggableOpts = options.draggable,
                contentOptions = options.content,
                position = options.position,
				element = $(self.element),
                positionToEl,
                titleBarEl,
                contentEl,
                i,
                iconsDiv,
                mustCenter = false;

            // make sure underlying element is a div
            if ($(element).prop("tagName").toLowerCase() !== "div") {
                error("shieldWindow: Underlying element is not DIV", dieOnError);
                return;
            }

            // if titleBarButtons option is set, check if shield ui button loaded
            if (titleBarButtonsOpts && titleBarButtonsOpts.length > 0 && !shield.ui.Button) {
                error("shieldWindow: The titleBarButtons setting requires ShieldUI Button to be loaded", dieOnError);
                return;
            }

            self._eventNS = "shieldWindow" + self.getInstanceId();

            // move the underlying element under the body if required
            if (options.appendToBody) {
                element.appendTo(doc.body);
                self._parentIsBody = true;
            }
            else {
                // see who is the parent of the element
                self._parentIsBody = element.parent().prop("tagName").toLowerCase() == "body";
            }

            // empty the underlying element
            self._origHtml = element.html();
            element.empty();

            // add css style
            element.addClass("sui-window" + (cls ? (" " + cls) : ""));

            // initialize and set the needed css
            element.css({
                width: options.width,
                height: options.height,
                position: "absolute"
            });

            // add the titlebar element
            self.titleBarEl = titleBarEl = $(
                '<div class="sui-window-titlebar">' + 
                    '<div class="sui-window-title">' + options.title + '</div>' + 
                    '<div class="sui-window-icons"></div>' + 
                '</div>'
            ).appendTo(element);

            // init the titlebar buttons
            self._initTitleBarButtons();

            // add the content element and adjust its height
            self.contentEl = contentEl = $('<div class="sui-window-content"></div>')
                .appendTo(element);

            // adjust the height of the content element
            self._fixContent();

            // position the window;
            // if position is not specified or it is not a dictionary, position at the center
            if (isObject(position)) {
                element.css(position);
            }
            else {
                mustCenter = true;
            }

            // add resizable if specified
            if (resizableOpts) {
                // if boolean - make it a dict
                if (isBoolean(resizableOpts)) {
                    resizableOpts = {};
                }

                // init the resizable and its events
                self.resizable = new shield.ui.Resizable(element, resizableOpts);
                self.resizable.on("resized", proxy(self._fixContent, self));
            }

            // add draggable if specified
            if (draggableOpts) {
                // if boolean - make it a dict
                if (isBoolean(draggableOpts)) {
                    draggableOpts = {};
                }

                draggableOpts.handle = self.titleBarEl;
                // init the draggable and its events
                self.draggable = new shield.ui.Draggable(element, draggableOpts);
            }

            // load the content
            self._hasIframe = false;
            if (contentOptions) {
                // handle any content options
                if (contentOptions.template) {
                    // load the content from a template
                    if (contentOptions.template.dataUrl) {
                        // get the template data from a url
                        $.ajax({
                            url: contentOptions.template.dataUrl,
                            dataType: "json",
                            success: function(data, textStatus, jqXHR) {
                                self.content(
                                    shieldFormat(
                                        contentOptions.template.body, 
                                        data
                                    )
                                );
                                self._focusFirst(); // ARIA
                            },
                            error: function(jqXHR, textStatus, errorThrown) {
                                self.content("Error occured while reading URL: " + textStatus + " - " + errorThrown);
                            }
                        });
                    }
                    else {
                        // load the template directly with the given data
                        self.content(
                            shieldFormat(
                                contentOptions.template.body, 
                                contentOptions.template.data
                            )
                        );
                        self._focusFirst(); // ARIA
                    }
                }
                else if (contentOptions.remote) {
                    // load the content from a remote url
                    if (contentOptions.remote.iframe) {
                        // load the content in an iframe
                        self._hasIframe = true;
                        self.content(
                            '<iframe class="sui-window-iframe" src="' + contentOptions.remote.url + '" style="border:none; border-width:0px; width:100%; height:100%;"></iframe>'
                        );
                        self._focusFirst(); // ARIA
                    }
                    else {
                        // load the url directly
                        self.contentEl.load(contentOptions.remote.url, function() {
                            self._focusFirst(); // ARIA
                        });
                    }
                }
                else {
                    // unknown / no content option - set the underlying html
                    self.content(self._origHtml);
                    self._focusFirst(); // ARIA
                }
            }
            else {
                // no content options - put the underlying element HTML as content
                self.content(self._origHtml);
                self._focusFirst(); // ARIA
            }

            // set minimized and maximized to false
            self._minimized = false;
            self._maximized = false;

            // set destroyed to false
            self._destroyed = false;

            // ARIA
            element
                .attr("role", "dialog")
                .attr("aria-labelledby", htmlEncode(options.title));

            // init pinned state
            self.pinned(!!options.pinned);

            // init the visible state
            self.visible(!!options.visible);

            // after made visible, center the window if needed
            if (mustCenter) {
                self.center();
            }
        },

        // focus first focusable element in the dialog content area
        _focusFirst: function() {
            var first = $(this.contentEl)
                .find(
                    '.sui-checkbox:not(.sui-checkbox-disabled), .sui-radiobutton:not(.sui-radiobutton-disabled), .sui-input:not(.sui-input-disabled), ' + 
                    '.sui-combobox:not(.sui-combobox-disabled), .sui-dropdown:not(.sui-dropdown-disabled), ' + 
                    '.sui-listbox:not(.sui-listbox-disabled), .sui-switch:not(.sui-switch-disabled), ' + 
                    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]'
                )
                .filter(':visible')
                .first();

            if ($(first).length > 0) {
                $(first).focus();
            }
        },

        _initTitleBarButtons: function() {
            var self = this,
                options = self.options,
                titleBarButtonsOpts = options.titleBarButtons,
                isModal = options.modal,
                iconsDiv,
                clickProxy,
                curr,
                i;

            self.titleBarButtons = {};

            if (titleBarButtonsOpts && titleBarButtonsOpts.length > 0) {
                iconsDiv = self.titleBarEl.find(".sui-window-icons");
                for (i=0; i<titleBarButtonsOpts.length; i++) {
                    curr = titleBarButtonsOpts[i];

                    if (curr !== "pin" && curr !== "minimize" && curr !== "maximize" && curr !== "close") {
                        // unknown button
                        continue;
                    }

                    // for modal dialog - allow only the 
                    if (isModal && curr !== "close") {
                        continue;
                    }

                    if (curr == "pin") {
                        clickProxy = "_onPin";
                    }
                    else if (curr == "minimize") {
                        clickProxy = "_onMinimize";
                    }
                    else if (curr == "maximize") {
                        clickProxy = "_onMaximize";
                    }
                    else {
                        clickProxy = curr;
                    }

                    self.titleBarButtons[curr] = 
                        $('<button type="button"><div class="sui-sprite sui-window-button-icon sui-window-button-icon-' + curr + '"></div></button>')
                            .appendTo(iconsDiv)
                            .shieldButton({
								cls: "sui-window-button",
                                events: {
                                    click: proxy(self[clickProxy], self, true)
                                }
                            }).swidget();
                }

                // do not propagate the mousedown button on the icons div
                iconsDiv.on("mousedown", function(e) { 
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
            }
        },

        _destroyTitleBarButtons: function() {
            var self = this,
                titleBarButtons = self.titleBarButtons,
                curr;

            for (curr in titleBarButtons) {
                if (titleBarButtons.hasOwnProperty(curr)) {
                    titleBarButtons[curr].destroy();
                }
            }

            self.titleBarButtons = {};
        },

        _createModal: function() {
            var self = this,
                // save the scroll top and left of the parent
                parent = $(self._parentIsBody ? win : self.element.parent()),
                parentScrollTop = $(parent).scrollTop(),
                parentScrollLeft = $(parent).scrollLeft();

            self._lockScroll();

            self._modal = $('<div class="sui-window-modal"></div>')
                .insertBefore(self.element)
                .css({
                    top: parentScrollTop,
                    left: parentScrollLeft
                });
        },

        _closeModal: function () {
            var self = this;

            $(self._modal).remove();
            self._unlockScroll();
        },

        _lockScroll: function() {
            var self = this,
                parent = self.element.parent();

            // save the current scroll top and left and overflow of the parent
            self._scrollTop = $(parent).scrollTop();
            self._scrollLeft = $(parent).scrollLeft();
            self._parentOverflow = $(parent).css(OVERFLOW);

            // hide the parent overflow and scroll it again
            parent
                .css(OVERFLOW, HIDDEN)
                .scrollTop(self._scrollTop)
                .scrollLeft(self._scrollLeft);
        }, 

        _unlockScroll: function() {
            var self = this,
                parent = self.element.parent();

            // restore the overflow and scroll
            parent
                .css(OVERFLOW, self._parentOverflow)
                .scrollTop(self._scrollTop)
                .scrollLeft(self._scrollLeft);
        },

        // fixes the content element's height
        _fixContent: function() {
            var self = this;

            // set the height of the content element
            $(self.contentEl)
                .outerWidth($(self.element).innerWidth())
                .innerHeight($(self.element).innerHeight() - $(self.titleBarEl).outerHeight());

            // fix the height of the iframe if such, making it the same as the content's
            if (self._hasIframe) {
                $(self.contentEl).find(".sui-window-iframe")
                    .width($(self.contentEl).width())
                    .height($(self.contentEl).height());
            }
        },

        // centers the window to the center of the window
        center: function() {
            var self = this,
                element = $(self.element);

            shield.ui.Position.Set(element, self._parentIsBody ? win : element.parent(), {source: CENTER, target: CENTER});
        },

        // position the element by providing a dictionary
        // of css position, e.g: { top: 0, left: 0, bottom: -5, right: 40% }
        position: function(positionCss) {
            $(this.element).css(positionCss);
        },

		getHeight: function() {
			$(this.element).css('height');
		},

		getWidth: function() {
			$(this.element).css('width');
		},

		getPosition: function() {
            var element = $(this.element);
			return {
				left: element.css('left'),
				top: element.css('top')
			};
		},

        // setter/getter for the window content 
        content: function() {
            var self = this,
                contentEl = $(self.contentEl),
                args = [].slice.call(arguments);

            if (args.length > 0) {
                // empty the contents and append any new ones
                contentEl.empty();
                contentEl.append(args[0]);
            }
            else {
                // getter
				return contentEl.html();
            }
        },

        // resize the window - accepts a dict with the width and height to set
        // it is recommended to use this function
        // to properly resize the content div
        resize: function(params) {
            $(this.element).css(params);
            this._fixContent();
        },

        // called when the parent of the element is being scrolled
        // NOTE: when parent is body - handle scroll of the window
        _scroll: function (event) {
            var self = this,
                element = $(self.element),
                parentIsBody = self._parentIsBody;

            if (self._pinned) {
                // when the parent is the body - take the scroll top and left from the window,
                // otherwise take it from the parent
                element.css({
                    left: (self.originalPosition.left + $(parentIsBody ? win : element.parent()).scrollLeft()) + PX,
                    top: (self.originalPosition.top + $(parentIsBody ? win : element.parent()).scrollTop()) + PX
                });
            }
        },

        // handles pin/unpin button clicks
        _onPin: function(fireEvent) {
            this.pinned(!this._pinned, fireEvent);
        },

        // setter/getter for the pinned state of the window
        pinned: function() {
            var self = this,
                args = [].slice.call(arguments),
                element = $(self.element),
                parentIsBody = self._parentIsBody,
                bPinned,
                titleBarEl = self.titleBarEl,
                pinIconEl = titleBarEl.find(".sui-window-button-icon-pin").length > 0 ? 
                    titleBarEl.find(".sui-window-button-icon-pin") : 
                    titleBarEl.find(".sui-window-button-icon-unpin"),
                evt;

            // called in getter mode
            if (args.length <= 0) {
                return self._pinned;
            }

            // setter mode
            bPinned = !!args[0];

            // if already in current state - do nothing
            if (self._pinned == bPinned) {
                return;
            }

            // fire event if needed
            if (!!args[1]) {
                evt = self.trigger(PIN, {pinned: bPinned});
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            // set the pinned flag
            self._pinned = bPinned;

            // toggle the pinned icon class
            pinIconEl.removeClass("sui-window-button-icon-pin sui-window-button-icon-unpin");
            pinIconEl.addClass(self._pinned ? "sui-window-button-icon-pin" : "sui-window-button-icon-unpin");

            // NOTE: when the parent is body, attache the onscroll handler to the window,
            // otherwise attach it to the element's parent

            if (self._pinned) {
                // add scroll handlers
                self.originalPosition = element.position();
                $(parentIsBody ? win : element.parent()).on(SCROLL + "." + self._eventNS, proxy(self._scroll, self));

                // disable drag
                if (self.draggable) {
                    self.draggable.enabled(false);
                }
            }
            else {
                // remove the scroll handlers
                $(parentIsBody ? win : element.parent()).off(SCROLL + "." + self._eventNS);
                self.origininalPosition = null;

                // enable drag
                if (self.draggable) {
                    self.draggable.enabled(true);
                }
            }
        },

        // on minimize button pressed
        _onMinimize: function(fireEvent) {
            // always minimize
            this.minimized(true, fireEvent);
        },

        // setter/getter for the minimized state
        minimized: function() {
            var self = this,
                args = [].slice.call(arguments),
                element = $(self.element),
                contentEl = $(self.contentEl),
                titleBarEl = self.titleBarEl,
                minButton = self.titleBarButtons.minimize,
                minIconEl,
                bMinimized,
                evt;

            // called in getter mode
            if (args.length <= 0) {
                return self._minimized;
            }

            // setter mode
            bMinimized = !!args[0];

            // if already in current state - do nothing
            if (self._minimized == bMinimized) {
                return;
            }

            if (args[1]) {
                evt = self.trigger(MINIMIZE, {minimized: bMinimized});
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            self._minimized = bMinimized;

            // set the minimize icon class
            minIconEl = titleBarEl.find(".sui-window-button-icon-minimize").length > 0 ? 
                titleBarEl.find(".sui-window-button-icon-minimize") : 
                titleBarEl.find(".sui-window-button-icon-unminimize");
            minIconEl.removeClass("sui-window-button-icon-minimize sui-window-button-icon-unminimize");
            minIconEl.addClass(self._minimized ? "sui-window-button-icon-unminimize" : "sui-window-button-icon-minimize");

            if (bMinimized) {
                // hide the content
                self._onMinCurrHeight = element.height();
                element.height(titleBarEl.height());
                contentEl.hide();

                // disable resize
                if (self.resizable) {
                    self.resizable.enabled(false);
                }
            }
            else {
                // show the content
                element.height(self._onMinCurrHeight);
                contentEl.show();

                // enable resize
                if (self.resizable) {
                    self.resizable.enabled(true);
                }
            }

            // set the visibility of the minimize button
            if (minButton) {
                minButton.visible(!bMinimized);
            }
        },

        // maximize/restore button clicked
        _onMaximize: function(fireEvent) {
            var self = this;

            if (self._minimized) {
                // if minimized, un-minimize it
                self.minimized(false, fireEvent);
            }
            else {
                // toggle maximized
                self.maximized(!self._maximized, fireEvent);
            }
        },

        // get/set the maximized state
        maximized: function() {
            var self = this,
                args = [].slice.call(arguments),
                bMaximized,
                fireEvent,
                element = $(self.element),
                beforeMaximize = self._beforeMaximize,
                titleBarEl = $(self.titleBarEl),
                maxIconEl,
                evt;

            if (args.length > 0) {
                // setter
                bMaximized = !!args[0];
                fireEvent = !!args[1];

                // if minimized, unminimize it
                if (self._minimized) {
                    self.minimized(false, false);
                }

                // if already in current state - do nothing
                if (self._maximized == bMaximized) {
                    return;
                }

                if (fireEvent) {
                    evt = self.trigger(MAXIMIZE, {maximized: bMaximized});
                    if (evt.isDefaultPrevented()) {
                        return;
                    }
                }

                self._maximized = !!bMaximized;

                // toggle the maximize icon class
                maxIconEl = titleBarEl.find(".sui-window-button-icon-maximize").length > 0 ? 
                    titleBarEl.find(".sui-window-button-icon-maximize") : 
                    titleBarEl.find(".sui-window-button-icon-restore");
                maxIconEl.removeClass("sui-window-button-icon-maximize sui-window-button-icon-restore");
                maxIconEl.addClass(self._maximized ? "sui-window-button-icon-restore" : "sui-window-button-icon-maximize");

                if (self._maximized) {
                    // set to maximized

                    // save the old width and height, top and left of the window
                    self._beforeMaximize = {
                        top: element.css("top"),
                        left: element.css("left"),
                        width: element.width(),
                        height: element.height()
                    };

                    // resize the win
                    self.resize({
                        width: '100%',
                        height: $(self._parentIsBody ? win : element.parent()).height()
                    });

                    // lock scrolls
                    self._lockScroll();

                    // position the widget in the center of the window
                    self.center();

                    // if the parent of the dialog is the body, 
                    // add a win resize handler to resize the window
                    if (self._parentIsBody) {
                        $(win).on(RESIZE + "." + self._eventNS, proxy(self._onWinResizeMax, self));
                    }
                }
                else {
                    // restore to original position

                    // restore the window's size and position before last maximization
                    if (beforeMaximize) {
                        element.css({
                            top: beforeMaximize.top,
                            left: beforeMaximize.left
                        });

                        self.resize({
                            width: beforeMaximize.width,
                            height: beforeMaximize.height
                        });
                    }

                    // unlock scrolls
                    self._unlockScroll();

                    // remove the win resize handler if it was added
                    if (self._parentIsBody) {
                        $(win).off(RESIZE + "." + self._eventNS);
                        self._winResize = null;
                    }
                }
            }
            else {
                // getter
                return self._maximized;
            }
        },

        // handler for on window resize when maximized
        _onWinResizeMax: function() {
            var self = this;
            $(self.element).height($(win).height());
            self._fixContent();
        },

        // window close - destroys the window
        // after close should not call any other function
        close: function(fireEvent) {
            var self = this,
                evt;

            if (!!fireEvent) {
                evt = self.trigger(CLOSE);
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            self.destroy();
        },

        // override of the base visible() methods
        visible: function () {
            var self = this,
                args = [].slice.call(arguments);

            // do nothing if destroyed
            if (self._destroyed) {
                return;
            }

            // if setting and window is modal, show or hide the modal
            if (args.length > 0 && self.options.modal) {
				if (!!args[0]) {
					self._createModal();
				}
				else {
					self._closeModal();
				}                
            }

            // call the base visible() method
            return Widget.fn.visible.apply(self, arguments);
        },

        // window destructor
        destroy: function () {
            var self = this,
                clsOption = self.options.cls;

            // hide the element
            self.visible(false);

            self._destroyed = true;

            // destroy any resizable contained widget
            if (self.resizable) {
                self.resizable.destroy();
                self.resizable = null;
            }

            // destroy any draggable
            if (self.draggable) {
                self.draggable.destroy();
                self.draggable = null;
            }

            // destroy the titlebar buttons (handlers)
            self._destroyTitleBarButtons();

            // turn off maximized to clearnup handlers
            self.maximized(false);

            // unpin the window to remove the handlers
            self.pinned(false);

            // cleanup the underlying element
            $(self.element)
                .removeClass("sui-window" + (clsOption ? (" " + clsOption) : ""));

            // restore the original html if any
            if (self._origHtml) {
                $(self.element).html(self._origHtml);
                self._origHtml = null;
            }

            Widget.fn.destroy.call(self);
        }
    });
    Window.defaults = windowDefaults;
    shield.ui.plugin("Window", Window);

})(jQuery, shield, this);