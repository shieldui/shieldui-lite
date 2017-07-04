(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
		DataSource = shield.DataSource,
        Position = shield.ui.Position,

		keyCode = shield.Constants.KeyCode,
		error = shield.error,
		isFunc = shield.is.func,
		isArray = shield.is.array,
		isDefined = shield.is.defined,
        isNumber = shield.is.number,
		toArray = shield.to.array,
		toInt = shield.to["int"],
        toNumber = shield.to.number,
        browser = shield.support.browser,
        shieldFormat = shield.format,
        strid = shield.strid,

		doc = document,
		mathMin = Math.min,
		mathMax = Math.max,
        mathPow = Math.pow,

		extend = $.extend,
		map = $.map,
		each = $.each,
		proxy = $.proxy,
		inArray = $.inArray,

		// widgets stuff
		listBoxDefaults, ListBox,
		autoCompleteDefaults, AutoComplete,
		textBoxDefaults, TextBox,
        numericTextBoxDefaults, NumericTextBox,
        maskedTextBoxDefaults, MaskedTextBox,
		comboBoxDefaults, ComboBox,
		dropDownDefaults, DropDown,
		buttonDefaults, Button,
        splitButtonDefaults, SplitButton,
		checkBoxDefaults, CheckBox,
		radioButtonDefaults, RadioButton,
        switchDefaults, Switch,

		// some constants
        ID = "id",
        ROLE = "role",
        TRUE = "true",
        FALSE = "false",
        LISTBOX = "listbox",
        TEXTBOX = "textbox",
        BUTTON = "button",
        SWITCH = "switch",
        ARIA = "aria",
        ARIA_SELECTED = ARIA + "-selected",
        ARIA_AUTOCOMPLETE = ARIA + "-autocomplete",
        ARIA_ACTIVEDESCENDANT = ARIA + "-activedescendant",
        ARIA_MULTILINE = ARIA + "-multiline",
        ARIA_VALUENOW = ARIA + "-valuenow",
        ARIA_VALUEMIN = ARIA + "-valuemin",
        ARIA_VALUEMAX = ARIA + "-valuemax",
        ARIA_VALUETEXT = ARIA + "-valuetext",
        ARIA_DISABLED = ARIA + "-disabled",
        ARIA_HASPOPUP = ARIA + "-haspopup",
        ARIA_CHECKED = ARIA + "-checked",
        ARIA_LABEL = ARIA + "-label",
        ARIA_LABELLEDBY = ARIA + "-labelledby",
        ARIA_CONTROLS = ARIA + "-controls",
        ARIA_READONLY = ARIA + "-readonly",
        ARIA_EXPANDED = ARIA + "-expanded",
        ALT = "alt",
        TITLE = "title",
		DISABLED = "disabled",
		CHECKED = "checked",
		SELECTED = "selected",
        ITEMCLICK = "itemclick",
		TABINDEX = "tabindex",
        MOUSEDOWN = "mousedown",
        MOUSEUP = "mouseup",
        MOUSEOUT = "mouseout",
		CLICK = "click",
		KEYDOWN = "keydown",
        KEYPRESS = "keypress",
        KEYUP = "keyup",
        CUT = "cut",
        PASTE = "paste",
        DRAGSTART = "dragstart",
        DRAGENTER = "dragenter",
        DRAGOVER = "dragover",
        DROP = "drop",
		CHANGE = "change",
		FOCUS = "focus",
		BLUR = "blur",
		RESIZE = "resize",
		SELECT = "select",
		INPUT = "input",
		VALUE = "value",
        PLACEHOLDER = "placeholder",
		SELECTSTART = "selectstart",
		UNSELECTABLE = "unselectable",
		ON = "on",
		PX = "px",
		WIDTH = "width",
		HEIGHT = "height",

		LB_ITEM_DATA_KEY = "suilbitemdata",
		LB_ITEM_INDEX_KEY = "suilbitemindex",
		LB_ITEM_VALUE_KEY = "suilbitemvalue",
		LB_ITEM_TEXT_KEY = "suilbitemtext",

		// underlying (original) element types and 
		// a function to determine it from an element
		UTYPE_SELECT = "uts",
		UTYPE_INPUT = "uti",
        UTYPE_TEXTAREA = "utta",
		UTYPE_OTHER = "uto",
		getUType = function(element) {
			var tagname = $(element).prop("tagName").toLowerCase();
			if (tagname == SELECT) {
				return UTYPE_SELECT;
			}
			else if (tagname == INPUT) {
				return UTYPE_INPUT;
			}
            else if (tagname == "textarea") {
                return UTYPE_TEXTAREA;
            }
			else {
				return UTYPE_OTHER;
			}
		},

        // HTML encoding function
        htmlEncode = function(value) {
            return $('<div/>').text(value).html();
        },

		// function to move cursor to the end of input element
		cursorAtEnd = function(element) {
			var el = $(element),
				len;

			el.focus();

			if (el.get(0).setSelectionRange) {
				len = el.val().length * 2;
				el.get(0).setSelectionRange(len, len);
			}
			else {
				el.val(el.val());
			}
		},

        // function to get the number of decimal points for floats
        getDecimalPoints = function(value) {
            value += "";

            var index = value.lastIndexOf(".");

            return index > -1 ? (value.length - index - 1) : 0;
        },

        // function to update the value attributes of all 
        // filter dictionaries in a DataSource filter
        updateFilterValues = function(filter, newValue) {
            // do nothing if filter is not defined or is a function
            if (!filter || isFunc(filter)) {
                return;
            }

            if (isArray(filter)) {
                // filter is an array
                for (var i=0; i<filter.length; i++) {
                    updateFilterValues(filter[i], newValue);
                }
            }
            else if (filter.or || filter.and) {
                // filter contains conditions
                for (var cond in filter) {
                    if (filter.hasOwnProperty(cond)) {
                        updateFilterValues(filter[cond], newValue);
                    }
                }
            }
            else {
                // filter is plain filter object
                filter.value = newValue;
            }
        };


	/////////////////////////////////////////////////////////
	// ListBox Widget
	// default listbox options
	listBoxDefaults = {
		enabled: true,				// whether the listbox is enabled or not
		cls: UNDEFINED,				// optional CSS class to add to the rendering element
		dataSource: UNDEFINED,		// a data source object to contain the items in the list box
		readDataSource: true,		// call dataSource.read() on init or not (if dataSource is not null)
		// NOTE: refactor the "readDataSource" property to indicate whether to read the DS on init, or not
		// maybe we should put this as a property of the dataSource configuration,
		// e.g. as "autoRead" or "readOnInit" or "initialized"
		valueTemplate: UNDEFINED,	// item value template
		textTemplate: UNDEFINED,	// item text template
		multiple: UNDEFINED,		// single or multiple selection
		selected: UNDEFINED,		// an integer indicating which item to select, or an array of indices
		values: UNDEFINED,			// a single value or a list of values to select; has higher precedence than "selected" option
		width: UNDEFINED,			// optional width of the element
		height: UNDEFINED,			// optional height of the element
		maxHeight: UNDEFINED,		// optional maximum height of the element
		events: {
			// focus
			// blur
			// select (index, item, selected)
			// change
		}
	};
	// Public methods:
	//		bool enabled()	/	void enabled(boolEnable)
    //      bool visible()  /   void visible(boolVisible)
	//		list selected()	/	void selected(index, boolSelect)
	//		list selectedItems()
	//		list values()	/	void values(valuesToSelect)
	//		list texts()
	//		void clearSelection()
	// ListBox class
	ListBox = Widget.extend({
	    // initialization method, called by the framework
	    init: function () {
	        Widget.fn.init.apply(this, arguments);

	        var self = this,
				options = self.options,
				dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
				selected = options.selected,
				values = options.values,
				original,
				originalTabindex,
				element,
				utype,
				renderTo = options.renderToINTERNAL,
				wrapOriginal = options.wrapOriginalINTERNAL,
				tabindexINTERNAL = options.tabindexINTERNAL,
				filterINTERNAL = options.filterINTERNAL,
				filterOptions = isDefined(filterINTERNAL) ? {filter: filterINTERNAL} : {},
				doWrap = isDefined(wrapOriginal) ? wrapOriginal : true;

			// save the original element and other initializations
			self._original = original = $(self.element);
			self._utype = utype = getUType(original);

			// do not allow a multiple ListBox to be initialized from an input
			if (utype == UTYPE_INPUT && options.multiple) {
				self.destroy();
				error("shieldListBox: Cannot initialize a multi-selection ListBox from an input element.", dieOnError);
				return;
			}

            // generate an instance-unique event namespace
            self._eventNS = ".shieldListBox" + self.getInstanceId();

			// before rendering, try to initialize the selected and values properties 
			// from the underlying element, if the options are not set
			if (!isDefined(values) && !isDefined(selected) && (utype == UTYPE_SELECT || utype == UTYPE_INPUT)) {
				values = original.val();
			}

			// wrap the original (underlying) element into a span
			if (doWrap) {
				self.wrapper = original.wrap("<span/>").parent();
				self._isWrapped = true;
			}
			else {
				self._isWrapped = false;
			}

			// hide the original element
			original.hide();

			// create a new element to render the listbox in
			self.element = element = $('<ul id="' + strid() + '"/>')
				.on(FOCUS + self._eventNS, proxy(self._focus, self))
				.on(BLUR + self._eventNS, proxy(self._blur, self));

			// apply width and/or height if specified
			if (isDefined(options.width)) {
				element.css(WIDTH, options.width);
			}
			if (isDefined(options.height)) {
				element.css(HEIGHT, options.height);
			}
			if (isDefined(options.maxHeight)) {
				element.css("max-height", options.maxHeight);
			}

			// add the new element after the original element we just hid
			if ($(renderTo).length > 0) {
				$(renderTo).append(element);
			}
			else {
				original.after(element);
			}

			// init the datasource
			if (dataSourceOpts) {
				// init from options
                self.dataSource = DataSource.create(dataSourceOpts, filterOptions);

				// initialize the templates if empty so that we ensure proper display
				if (!options.valueTemplate) {
					options.valueTemplate = "{0}";
				}
				if (!options.textTemplate) {
					options.textTemplate = "{0}";
				}
			}
			else if (utype == UTYPE_SELECT) {
				// construct a data source object from a SELECT element's options
				self.dataSource = DataSource.create(extend({}, {
                    data: original, // pass the jquery object
                    schema: {
                        type: SELECT
					}
				}, filterOptions));

				// initialize the templates if empty so that we ensure proper display
				if (!options.valueTemplate) {
					options.valueTemplate = "{value}";
				}
				if (!options.textTemplate) {
					options.textTemplate = "{text}";
				}

				// init multiple if underlying SELECT and multiple not defined
				if (!isDefined(options.multiple)) {
					options.multiple = original.not("[multiple]").length <= 0;
				}
			}
			else {
				self.destroy();
				error("shieldListBox: No dataSource or underlying SELECT element found.", dieOnError);
				return;
			}

	        // init the container element
	        element.addClass("sui-listbox");

			// add the css class if specified
			if (options.cls) {
				element.addClass(options.cls);
			}

			// add tabindex for the element so that it can be selected on focus
			originalTabindex = isDefined(tabindexINTERNAL) ? tabindexINTERNAL : original.attr(TABINDEX);
			element.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");

	        // add the keydown handler for the element
	        element.on(KEYDOWN + self._eventNS, proxy(self._keydown, self));

	        // the handler for data source on change
	        self.dataSource.on(CHANGE + self._eventNS, proxy(self._dsChange, self));

			// if values option specified, save them in a member to apply it when the DS load is done
			// NOTE: do that only one time
			if (isDefined(values)) {
				self._initValues = values;
			}
			else if (isDefined(selected)) {
				self._initSelected = selected;
			}

            // add any WAI-ARIA tags
            element.attr(ROLE, LISTBOX);
            if (options.multiple) {
                element.attr("aria-multiselectable", TRUE);
            }

			// refresh the data source if specified (this will cause redraw of all items)
			if (options.readDataSource) {
				self.dataSource.read();
			}

	        // initialize the disabled state
	        self.enabled(options.enabled);
	    },

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

		_focus: function(event) {
			var self = this;

			// save the current selection 
			self._oldSelection = self.selected();

			// trigger the focus event
			self.trigger(FOCUS);
		},

		_blur: function(event) {
			var self = this,
				oldSelection = self._oldSelection,
				newSelection = self.selected();

			// compare the two arrays and if different, trigger a change event
			if ($(oldSelection).not(newSelection).length !== 0 || $(newSelection).not(oldSelection).length !== 0) {
				self.trigger(CHANGE);
			}

			// save the new selection
			self._oldSelection = newSelection;

			// trigger the blur event
			self.trigger(BLUR);
		},

	    _dsChange: function (event) {
			var self = this;

			// redraw the items
	        self._render();

			// apply values/selected if first load
			if (!self._dsLoadedOnce) {
				self._dsLoadedOnce = true;

				if (isDefined(self._initValues)) {
					self.values(self._initValues);
				}
				else if (isDefined(self._initSelected)) {
					self.selected(self._initSelected);
				}
			}
	    },

	    _render: function () {
	        var self = this,
				options = self.options,
				data = self.dataSource.view,
				element = $(self.element),
				utype = self._utype,
				original = self._original,
                idPrefix = element.attr(ID) + "_opt",
				originalInputValue = utype == UTYPE_INPUT ? self._original.val() : UNDEFINED;

	        // empty the rendering element
	        element.empty();

			// reset underlying elements if they are form elements
			if (utype == UTYPE_SELECT) {
				// if the underlying element is a SELECT, empty all options inside it
				original.empty();
			}
			else if (utype == UTYPE_INPUT) {
				// clear the input value attribute - we will set it later at the end of the function
				original.removeAttr(VALUE);
			}

			// populate the data if not empty
			if (data) {
				each(data, function(index, item) {
					var itemValue = shieldFormat.call(self, options.valueTemplate, item),
                        itemText = shieldFormat.call(self, options.textTemplate, item),
						listItem = $('<li id="' + idPrefix + index + '" role="option">' + itemText + '</li>')
							.addClass("sui-listbox-item sui-unselectable")
							// WARNING: do not add unselectable="on" because this will 
							// break blur+focus events in IE and we want to handle those
							.click(function (event) {
							    if (self._enabled) {
							        // set current element as active and toggle it
							        self._setActive($(this));
							        self._toggleActive(event);
							    }

								// trigger a custom itemclick event for widgets that aggregate the listbox 
								// such as: ComboBox and AutoComplete
								self.trigger(ITEMCLICK, {index: index, item: item});
							})
							.on(SELECTSTART, function() { return false; })
							.data(LB_ITEM_DATA_KEY, item)
							.data(LB_ITEM_INDEX_KEY, index)
							.data(LB_ITEM_VALUE_KEY, itemValue)
							.data(LB_ITEM_TEXT_KEY, itemText);

                        if (options.multiple) {
                            listItem.attr(ARIA_SELECTED, FALSE);
                        }

					// append the item element LI
					element.append(listItem);

					// if underlying element is a select, sync the options and/or value
					if (utype == UTYPE_SELECT) {
						// for a select box, add the element as an option to it too
						original.append(
							$("<option/>")
								.attr(VALUE, itemValue)
								.text(itemText)
						);
					}
				});
			}
		},

	    _keydown: function (event) {
	        var self = this,
				prevent = true;

	        switch (event.keyCode) {
	            case keyCode.UP:
	                self._move("up", event);
	                break;
	            case keyCode.DOWN:
	                self._move("down", event);
	                break;
                case keyCode.HOME:
                    self._move("first", event);
                    prevent = false;
                    break;
                case keyCode.END:
                    self._move("last", event);
                    prevent = false;
                    break;
	            case keyCode.SPACE:
	            case keyCode.ENTER:
	                self._toggleActive(event);
	                break;
	            default:
	                prevent = false;
	                break;
	        }

	        if (prevent) {
	            event.preventDefault();
	        }
	    },

	    _move: function (dir, event) {
	        var self = this,
				element = $(self.element),
				activeElement = element.find(".sui-listbox-item-active").first(),
				newActiveElement = element.find(":first");

	        // do not do anything if disabled
	        if (!self._enabled) {
	            return;
	        }

	        // determine which element is the new selection, based on 
	        // the currently-selected one and the direction of movement;
	        // defaults to the first element
	        if (dir == "up") {
	            if (activeElement.prev().length > 0) {
	                newActiveElement = activeElement.prev();
	            }
                else if (activeElement.length > 0) {
	                newActiveElement = activeElement;
	            }
	        }
	        else if (dir == "down") {
	            if (activeElement.next().length > 0) {
	                newActiveElement = activeElement.next();
	            }
	            else if (activeElement.length > 0) {
	                newActiveElement = activeElement;
	            }
	        }
            else if (dir == "first") {
                newActiveElement = element.find(".sui-listbox-item").first();
            }
            else if (dir == "last") {
                newActiveElement = element.find(".sui-listbox-item").last();
            }

			// if no active element, return
			if (newActiveElement.length <= 0) {
				return;
			}

	        if (self.options.multiple) {
	            // multiple selection:
	            // set the current element as active and ensure it is currently in the scrollable area
	            self._setActive(newActiveElement);
	            self._ensureInScrollableArea(newActiveElement);
	        }
	        else {
	            // single selection - select the active element
	            // this will internally set it as active and ensure it is currently in the scrollable area
				self._select(newActiveElement);
	        }
	    },

	    // ensures a given item is in the scrollable area and if not, scrolls to it
	    _ensureInScrollableArea: function (element) {
	        var self = this,
				container = $(self.element),
				containerHeight = container.height(),
				containerScrollTop = container.scrollTop(),
				containerScrollBottom = containerScrollTop + containerHeight,
				elementHeight = element.outerHeight(),
				elementTop = element.position().top,
				elementBottom = elementTop + elementHeight;

	        if (elementTop < 0) {
	            // scroll so that item element is at the top
	            container.scrollTop(containerScrollTop + elementTop);
	        }
	        else if (elementBottom > containerHeight) {
	            // scroll so that item element is at the bottom
	            container.scrollTop(containerScrollTop + (elementBottom - containerHeight));
	        }
	    },

		ensureActiveViewableINTERNAL: function() {
			var self = this,
				activeElement = self._getActive();

			if (activeElement.length > 0) {
				self._ensureInScrollableArea(activeElement);
			}
		},

	    _getActive: function () {
	        return $(this.element).find(".sui-listbox-item-active").first();
	    },

	    _setActive: function (element) {
	        element.addClass("sui-listbox-item-active").siblings().removeClass("sui-listbox-item-active");

            $(this.element).attr(ARIA_ACTIVEDESCENDANT, element.attr(ID));
	    },

	    _setSelected: function (element) {
	        element.addClass("sui-listbox-item-selected").attr(ARIA_SELECTED, TRUE);
	    },

	    _unsetSelected: function (element) {
	        element.removeClass("sui-listbox-item-selected");

            if (this.options.multiple) {
                element.attr(ARIA_SELECTED, FALSE);
            }
            else {
                element.removeAttr(ARIA_SELECTED);
            }
	    },

	    _toggleActive: function (event) {
	        this._toggle(event, this._getActive());
	    },

	    _toggle: function (event, element) {
	        var self = this;

	        // do not do anything if disabled
	        if (!self._enabled) {
	            return;
	        }

	        // check for a valid jquery element
	        if (!element || element.length <= 0) {
	            return;
	        }

	        // toggling works only in multiple selection
	        // in single - this is just like a normal select event
	        if (self.options.multiple) {
	            if (element.hasClass("sui-listbox-item-selected")) {
	                // element is selected, so deselect it
					self._deselect(element);
	            }
	            else {
	                // element is not selected so select it
					self._select(element);
	            }
	        }
	        else {
	            // single selection - select the active element
				self._select(element);
	        }
	    },

	    _select: function (element, bSkipEvent) {
	        var self = this,
				original = self._original,
				utype = self._utype,
                multiple = self.options.multiple;

	        if (!multiple) {
	            self.clearSelection();
	        }

	        self._setActive(element);
	        self._ensureInScrollableArea(element);
	        self._setSelected(element);

			if (utype == UTYPE_SELECT) {
				// select the item in the underlying select
				original.find("option:eq(" + element.data(LB_ITEM_INDEX_KEY) + ")").attr(SELECTED, SELECTED);				
			}
			else if (utype == UTYPE_INPUT) {
				// set the underlying input value
				original.attr(VALUE, element.data(LB_ITEM_VALUE_KEY));
			}

			if (!bSkipEvent) {
				// trigger a select event
                self.trigger(SELECT, {
                    index: element.data(LB_ITEM_INDEX_KEY), 
                    item: element.data(LB_ITEM_DATA_KEY), 
                    value: element.data(LB_ITEM_VALUE_KEY),
                    text: element.data(LB_ITEM_TEXT_KEY),
                    selected: true
                });
			}
		},

	    _deselect: function (element, bSkipEvent) {
	        var self = this,
				original = self._original,
				utype = self._utype;

	        self._setActive(element);
	        self._unsetSelected(element);

			if (utype == UTYPE_SELECT) {
				// deselect the item in the underlying select
				original.find("option:eq(" + element.data(LB_ITEM_INDEX_KEY) + ")").removeAttr(SELECTED);				
			}
			else if (utype == UTYPE_INPUT) {
				// unset the underlying input value
				original.removeAttr(VALUE);
			}

			if (!bSkipEvent) {
				// trigger a select event
				self.trigger(SELECT, {
                    index: element.data(LB_ITEM_INDEX_KEY), 
                    item: element.data(LB_ITEM_DATA_KEY), 
                    value: element.data(LB_ITEM_VALUE_KEY),
                    text: element.data(LB_ITEM_TEXT_KEY),
                    selected: false
                });
			}
		},

		// setter/getter for the enabled state of the listbox
		enabled: function() {
			var self = this,
				element = $(self.element),
				original = self._original,
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-listbox-disabled");
					original.removeAttr(DISABLED);
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-listbox-disabled");
					original.attr(DISABLED, DISABLED);
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
		},

		// setter/getter for the list of indices of selected items in the listbox
		selected: function() {
			var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				index,
				bSelected,
				activeElement;

			if (args.length > 0) {
				// setter
				index = toArray(args[0]);
				bSelected = isDefined(args[1]) ? !!args[1] : true;

				// select all given indices
				element.find(".sui-listbox-item").each(function(ind) {
					if (inArray(ind, index) > -1) {
						if (bSelected) {
							self._select($(this), true);
						}
						else {
							self._deselect($(this), true);
						}
					}
				});
			}
			else {
				// getter
				var ret = [];
				element.find(".sui-listbox-item-selected").each(function () {
					ret.push($(this).data(LB_ITEM_INDEX_KEY));
				});
				return ret;
			}
		},

        // getter for the list of selected items in the listbox
	    selectedItems: function () {
	        var ret = [];

	        $(this.element).find(".sui-listbox-item-selected").each(function () {
	            ret.push($(this).data(LB_ITEM_DATA_KEY));
	        });

	        return ret;
	    },

		// setter/getter for the list of values of selected items in the listbox
		values: function() {
			var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				vals;

			if (args.length > 0) {
				// setter
				vals = toArray(args[0]);

				element.find(".sui-listbox-item").each(function() {
					if (inArray($(this).data(LB_ITEM_VALUE_KEY), vals) > -1) {
						self._select($(this), true);

						// if this is a single select, halt
						if (!self.options.multiple) {
							return false;
						}

						return true;
					}
				});
			}
			else {
				// getter
				var ret = [];
				element.find(".sui-listbox-item-selected").each(function () {
					ret.push($(this).data(LB_ITEM_VALUE_KEY));
				});
				return ret;
			}
		},

		// getter for the list of texts for selected items in the listbox
		texts: function() {
			var ret = [];

	        $(this.element).find(".sui-listbox-item-selected").each(function () {
	            ret.push($(this).data(LB_ITEM_TEXT_KEY));
	        });

	        return ret;
		},

        // clears the current selection(s); also removes the active state from the selected elements too
		clearSelection: function() {
			var self = this,
				original = self._original,
                multiple = self.options.multiple,
				utype = self._utype;

			if (utype == UTYPE_SELECT) {
				// deselect all options in the underlying select
				original.find("option").removeAttr(SELECTED);
			}
			else if (utype == UTYPE_INPUT) {
				// unset the underlying input value
				original.removeAttr(VALUE);
			}

            $(self.element).find(".sui-listbox-item-selected").each(function() {
                $(this).removeClass("sui-listbox-item-selected sui-listbox-item-active");
                if (multiple) {
                    $(this).attr(ARIA_SELECTED, FALSE);
                }
                else {
                    $(this).removeAttr(ARIA_SELECTED);
                }
            });
		},

        // listbox destructor
	    destroy: function () {
	        var self = this,
                eventNS = self._eventNS;

            self._dsLoadedOnce = false;

			$(self.element)
                .off(eventNS)
				.remove();

			if (self.dataSource) {
				self.dataSource.off(CHANGE + eventNS);
			}

			// unwrap the underlying element and show it
			if (self._isWrapped) {
				self._original.unwrap();
			}
			self._original.show();

			Widget.fn.destroy.call(self);
		}
	});
    ListBox.defaults = listBoxDefaults;
    shield.ui.plugin("ListBox", ListBox);


    /////////////////////////////////////////////////////////
    // TextBox Widget
    // text box settings
    textBoxDefaults = {
        enabled: true,				// whether the input will be enabled or disabled
		cls: UNDEFINED,				// optional class to apply after applying the base widget classes
		autoComplete: UNDEFINED,	// optionally initialize an AutoComplete for this input, using this as its properties
        value: UNDEFINED,
        events: {
			// focus
			// blur
            // change
        }
    };
	// Public methods:
	//		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		mixed value()	/	void value(newValue)
	// TextBox class
	TextBox = Widget.extend({
	    // initialization method, called by the framework
	    init: function () {
	        // call the parent init
	        Widget.fn.init.apply(this, arguments);

	        var self = this,
				options = self.options,
				autoCompleteOpts = options.autoComplete,
				cls = options.cls,
				value = options.value,
				element = $(self.element);

            self._eventNS = ".shieldTextBox" + self.getInstanceId();

	        element.addClass("sui-input");

	        // init the autoComplete if any
	        if (autoCompleteOpts) {
	            self.autoComplete = new AutoComplete(element, autoCompleteOpts);
	        }

			if (cls) {
				element.addClass(cls);
			}

	        element
                .on(FOCUS + self._eventNS, proxy(self._focus, self))
	            .on(BLUR + self._eventNS, proxy(self._blur, self));

            // ARIA
            element.attr(ROLE, TEXTBOX);
            if (getUType(element) == UTYPE_TEXTAREA) {
                element.attr(ARIA_MULTILINE, TRUE);
            }

	        // initialize the disabled state
	        self.enabled(options.enabled);

			// set any value if specified
			if (isDefined(value)) {
				self.value(value);
			}
	    },

        focus: function() {
            $(this.element).focus();
            cursorAtEnd($(this.element));
        },

	    _focus: function (event) {
	        var self = this;

	        self.oldValue = self._value();
	        self.interval = setInterval(proxy(self._detectChanges, self), 1);

			self.trigger(FOCUS);
	    },

	    _blur: function (event) {
	        clearInterval(this.interval);
			this.trigger(BLUR);
	    },

	    _detectChanges: function () {
	        var self = this,
				event;

	        // if disabled, do not do anything
	        if (!self._enabled) {
	            return;
	        }

	        if (self.oldValue !== self._value()) {
				// trigger the change event
				event = self.trigger(CHANGE, { value: self._value(), old: self.oldValue });

				if (event.isDefaultPrevented()) {
	                // user prevented the event - put back the old value of the input
	                self._value(self.oldValue);
	            }
	            else {
	                // value changed - save the new one and trigger the change event
	                self.oldValue = self._value();
	            }
	        }
	    },

	    // getter and setter for the input's value
	    _value: function () {
	        return this.element.val.apply(this.element, arguments);
	    },

		// setter/getter for the value of the textbox (the entered text)
	    value: function () {
	        return this._value.apply(this, arguments);
	    },

		// setter/getter for the enabled state of the textbox control
		enabled: function() {
			var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-input-disabled");
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-input-disabled");
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
		},

        // textbox destructor
	    destroy: function () {
	        var self = this,
				autoComplete = self.autoComplete,
				clsOption = self.options.cls;

	        clearInterval(self.interval);

	        self.element
                .off(self._eventNS)
				.removeClass("sui-input" + (clsOption ? (" " + clsOption) : ""));

	        // destroy the autoComplete if any
	        if (autoComplete) {
	            autoComplete.destroy();
	        }

	        Widget.fn.destroy.call(self);
	    }
	});
    TextBox.defaults = textBoxDefaults;
    shield.ui.plugin("TextBox", TextBox);


    /////////////////////////////////////////////////////////
    // AutoComplete Widget
    // default AutoComplete options
    autoCompleteDefaults = {
        dataSource: UNDEFINED,		// the data source for the list of suggestions
		valueTemplate: "{0}",		// template for the input element's value
		textTemplate: "{0}",		// template for suggestion list item
        open: false,				// whether to open the suggestion list initially
        delay: 200,					// the delay in ms between a keystroke and the data source update (search)
        minLength: 2,				// the minimum length of the input string to search for
        dropDownWidth: UNDEFINED,	// dropdown width
        appendListBoxTo: "body",    // where to append the listbox to; undefined means BODY
        animation: {
			enabled: true,			// enable suggestion list animation
			openDelay: 200,			// animation delay for showing the suggestion list
			closeDelay: 100			// animation delay for hiding the suggestion list
		},
        events: {
            // change
            // select
            // search
        }
    };
	// Public properties: NONE
	// Public methods: NONE
	// AutoComplete class
	AutoComplete = Widget.extend({
	    // initialization method, called by the framework
	    init: function () {
	        // call the parent init
	        Widget.fn.init.apply(this, arguments);

	        var self = this,
				element = $(self.element),
				options = self.options,
				dataSourceOpts = options.dataSource,
				dieOnError = options.dieOnError,
                appendListBoxTo = options.appendListBoxTo;

	        self.pending = 0;
			self.oldValue = element.val();

	        if (dataSourceOpts) {
	            // set the filter for the dataSource if not already set
	            if (!dataSourceOpts.filter) {
	                dataSourceOpts.filter = {
	                    and: [
							{ path: "", filter: "contains", value: "" }
	                    ]
	                };
	            }
	        }
	        else {
				self.destroy();
	            error("shieldAutoComplete: No dataSource set", dieOnError);
	            return;
	        }

            // generate an instance-unique event namespace
            self._eventNS = ".shieldAutoComplete" + self.getInstanceId();

			// add the textbox class for the element
			element.addClass("sui-input");

			// add the autoComplete's listbox source element
			// it will be hidden from the ListBox class anyway
			self.listElement = $("<span/>")
				.appendTo($(appendListBoxTo));

			// init the ListBox which will hold the suggestions list appearing below the input
			self.listBox = new ListBox(self.listElement, {
				cls: "sui-autocomplete",
				dataSource: dataSourceOpts,
				readDataSource: false,	// do not refresh the data source on init (only on search)
				textTemplate: options.textTemplate,
				multiple: false,
				width: options.dropDownWidth || element.innerWidth(),
				events: {
					select: function(event) {
                        self._value(shieldFormat.call(self, options.valueTemplate, event.item));
                        self.trigger(SELECT, {item: event.item});
					},
					itemclick: function(event) {
						element.focus();
						self._inputBlur(event, 0);
					},
					blur: function(event) {
						// if element does not have focus, hide the listbox
						self._inputBlur(event, 0);
					}
				}
			});
			self.listBox.element.hide();

            // set the data source property
            self.dataSource = self.listBox.dataSource;

			// add input keydown handler and 
            // an input blur handler with a delay of 100 ms
			element
                .on(KEYDOWN + self._eventNS, proxy(self._inputKeydown, self))
                .on(BLUR + self._eventNS, proxy(self._inputBlur, self, 100));

            // ARIA for autocomplete
            element
                .attr(ARIA_AUTOCOMPLETE, "list")
                .attr(ARIA_CONTROLS, self.listBox.element.attr(ID))
                .attr(ARIA_HASPOPUP, self.listBox.element.attr(ROLE));

            // ARIA for textbox
            element.attr(ROLE, TEXTBOX);
            if (getUType(element) == UTYPE_TEXTAREA) {
                element.attr(ARIA_MULTILINE, TRUE);
            }

	        // add list box data source change handler
	        self.listBox.dataSource.on(CHANGE + self._eventNS, proxy(self._dsChange, self));

			// add a window resize handler
			$(win).on(RESIZE + self._eventNS, proxy(self._position, self));

	        self._open = false;
			if (options.open) {
				self._searchTimeout();
			}
		},

		_checkValueUpdated: function() {
			var self = this,
				element = self.element,
				newValue = element.val();

			// check to see if the old value was changed and if so, fire a change event
			if (self.oldValue !== newValue) {
				self.trigger(CHANGE, {value: self._value()});
				self.oldValue = newValue;
			}
		},

		_restoreOldValue: function() {
			this._value(this.oldValue);
		},

	    _inputKeydown: function (event) {
	        var self = this;

	        switch (event.keyCode) {
				case keyCode.TAB:
					break;
	            case keyCode.UP:
	            case keyCode.DOWN:
	                self._inputUpDown(event);
	                break;
	            case keyCode.ENTER:
					event.preventDefault();
					self.cancelSearch = true;
	                self._hideItemList();
					self._checkValueUpdated();
	                break;
	            case keyCode.ESC:
					event.preventDefault();
	                self.cancelSearch = true;
	                self._hideItemList();
					self._restoreOldValue();
	                break;
	            default:
	                self._searchTimeout(event);
	                break;
	        }
	    },

	    // called when UP or DOWN arrow keys are sent to the input
	    _inputUpDown: function (event) {
	        var self = this;

	        if (!self._open) {
	            // suggestion list is hidden
	            if (self._hasData()) {
					self._showItemList();
				}
	        }
	        else {
	            // suggestions list is open - relay the event to it if there is any data
	            if (self._hasData()) {
	                $(self.listBox.element).trigger(event);
	            }
	        }
	    },

	    _inputBlur: function (event, delay) {
			var self = this;

			// hide the suggestions listbox after some time to allow
	        // it to send all select events to the subscribers
	        setTimeout(function() {
				// only hide and process if listbox does not have the focus
				if (!$(self.listBox.element).is(":focus")) {
					self._hideItemList();
					self._checkValueUpdated();
				}
			}, delay);
	    },

	    _searchTimeout: function (event) {
	        var self = this;

	        clearTimeout(self.searchTimeout);

	        self.searchTimeout = setTimeout(function () {
	            if (self.term !== self._value()) {
                    self.trigger("search", {value: self._value()});
	                self._search();
	            }
	        }, self.options.delay);
	    },

	    _search: function () {
	        var self = this;

	        self.term = self._value();

	        if (self.term.length < self.options.minLength) {
	            self._hideItemList();
	            return;
	        }

	        self.cancelSearch = false;

	        self.pending++;
	        $(self.element).addClass("sui-autocomplete-loading");

	        // update the filter - change all values
            updateFilterValues(self.listBox.dataSource.filter, self.term);

	        // reload the suggestions list box data source - this will also update it when done
			self.listBox.dataSource.read();
	    },

	    _dsChange: function () {
	        var self = this;

	        self.pending--;
	        if (!self.pending) {
	            $(self.element).removeClass("sui-autocomplete-loading");
	        }

	        if (!self.cancelSearch && self._hasData()) {
	            self._showItemList();
	        }
	        else {
	            self._hideItemList();
	        }
	    },

	    _hasData: function () {
			var dsView = this.listBox.dataSource.view;
	        return dsView && dsView.length > 0;
	    },

		_position: function() {
            var self = this,
				element = $(self.element),
                listBoxElement = $(self.listBox.element);

            listBoxElement.width(self.options.dropDownWidth || element.innerWidth());

            // position the autocomplete suggestion list right below the input
            Position.Set(listBoxElement, element, {
                source: "left top",
                target: "left bottom",
                overflow: "none"
            });
		},

	    _showItemList: function () {
	        var self = this,
				listBox = self.listBox,
				listBoxElement = $(listBox.element),
				animation = self.options.animation;

            // NOTE: place this in the upper left corner to minimize positioning
            // errors caused by appearing scrollbars
            listBoxElement.css({
                top: 0,
                left: 0
            });

            // show the suggestion list box
            listBoxElement.show();

			// position the suggestion list right below the input
			self._position();

			// show with animation or not;
			// make sure the selected element is visible
			if (!self._open && animation && animation.enabled) {
				listBoxElement
                    .hide()
                    .slideDown(animation.openDelay, proxy(listBox.ensureActiveViewableINTERNAL, listBox));
			}
			else {
				listBox.ensureActiveViewableINTERNAL();
			}

	        self._open = true;
	    },

		_hideItemList: function() {
			var self = this,
				listBoxElement = $(self.listBox.element),
				animation = self.options.animation;

			// hide with animation or not
			if (animation && animation.enabled) {
				listBoxElement.slideUp(animation.closeDelay);
			}
			else {
				listBoxElement.hide();
			}

			self._open = false;
		},

	    // getter and setter for the input's value
	    _value: function () {
	        return this.element.val.apply(this.element, arguments);
	    },

        // override the base methods for hide/show
        // because they work on self.element only
        hide: function() {
            $(this.listBox.element).hide();
        },

        show: function() {
            $(this.listBox.element).show();
        },

        isVisible: function() {
            return $(this.listBox.element).is(":visible");
        },

        // autocomplete widget destructor
	    destroy: function () {
	        var self = this;

            // unset the data source property
            self.dataSource = null;

			if (self.listBox) {
				self.listBox.dataSource.off(CHANGE + self._eventNS);
				self.listBox.destroy();
				self.listBox = null;
			}

	        self.element
                .off(self._eventNS)
				.removeClass("sui-input");

			$(win).off(RESIZE + self._eventNS);

			if (self.listElement) {
				self.listElement.remove();
			}

			Widget.fn.destroy.call(self);
	    }
	});
    AutoComplete.defaults = autoCompleteDefaults;
    shield.ui.plugin("AutoComplete", AutoComplete);


    /////////////////////////////////////////////////////////
    // NumericTextBox Widget
    // default NumericTextBox options
    numericTextBoxDefaults = {
        enabled: true,      // whether the widget will be initially enabled or not
        cls: "",            // optional CSS class to add for the numeric textbox
        min: 0,             // min value allowed
        max: 100,           // max value allowed
        value: UNDEFINED,   // current value
        step: UNDEFINED,    // value change step
        editable: true,     // allow editing of the input from the textbox, or only through the arrows
        spinners: true,     // show spinners or not
        valueTemplate: UNDEFINED,       // template used for formatting and validating the number input by the user; defaults to a number with the same precision as the step
        textTemplate: UNDEFINED,        // template for rendering the text shown in the textbox
        labels: {
            increase: "Increase value", // tooltip value for the increase spinner button
            decrease: "Decrease value"  // tooltip value for the decrease spinner button
        },
        events: {
			// focus
			// blur
            // change
        }
    };
    // Public methods:
	//		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		mixed value()	/	void value(valueToSelect)
    //      void increment()
    //      void decrement()
    // NumericTextBox class
    NumericTextBox = Widget.extend({
        // initialization method, called by the framework
	    init: function () {
	        // call the parent init
	        Widget.fn.init.apply(this, arguments);
            
            var self = this,
                options = self.options,
                cls = options.cls,
                value = options.value,
                step = options.step,
                editable = options.editable,
                spinners = options.spinners,
                labels = options.labels,
                labelIncrease = labels.increase,
                labelDecrease = labels.decrease,
                dieOnError = options.dieOnError,
                original,
                originalTabindex,
                originalPlaceholder,
                element,
                textElement,
                spinUp,
                spinDown,
                valueDecimalDigits,
                stepDecimalDigits;

            // save the original element and its type
			self._original = original = $(self.element);

            if (getUType(original) != UTYPE_INPUT) {
                error("shieldNumericTextBox: Underlying element is not INPUT", dieOnError);
	            return;
            }

            // initialize the step if not defined,
            // based on the number of decimal points in the value
            if (!isDefined(step)) {
                valueDecimalDigits = getDecimalPoints(isDefined(value) ? value : self._value());

                if (valueDecimalDigits > 0) {
                    options.step = step = 1 / mathPow(10, valueDecimalDigits);
                }
                else {
                    options.step = step = 1;
                }
            }
            else {
                // step is defined - convert it to a number
                options.step = step = toNumber(step);
            }

            // validate the step
            if (!step) {
                error("shieldNumericTextBox: Invalid step", dieOnError);
                return;
            }

            // instance event namespace
            self._eventNS = ".shieldNumericTextBox" + self.getInstanceId();

            // init a wrapper element to contain the elements rendering the combobox;
			// put the original underlying element inside it;
			// also put a text value input or a div, and a check div to show/hide the dd arrow
			self.element = element = original.wrap("<span/>").parent();

            // hide the original element
			original.hide();

            // if value is not defined, try to take it from the original element
            if (!isDefined(value)) {
                value = self._value();
            }

            // init the text element
            if (editable) {
				textElement = $('<input type="text" class="sui-input" />');

                // if underlying element has placeholder, add it to the text element too
                originalPlaceholder = original.attr(PLACEHOLDER);
                if (isDefined(originalPlaceholder)) {
                    textElement.attr(PLACEHOLDER, originalPlaceholder);
                }
			}
			else {
				// put a space inside the span, so it has some height 
				// even if no value is currently selected
				textElement = $('<span class="sui-input">&nbsp;</span>')
                    .attr(TABINDEX, "0");
			}
            self.textElement = textElement;
			textElement.appendTo(element);

            // call the focus and blur private methods whenever the 
            // text display element is being focused or blurred
            textElement
                .on(FOCUS + self._eventNS, proxy(self._focus, self))
                .on(BLUR + self._eventNS, proxy(self._blur, self));

            // add the spinners if allowed
            if (spinners) {
                // spinners handlers
                self._onSpinUpMDProxy = proxy(self._spinUpMD, self);
                self._onSpinDownMDProxy = proxy(self._spinDownMD, self);
                self._onSpinnerMUProxy = proxy(self._spinnerMU, self);

                self.spinUp = spinUp = $('<span class="sui-spinner sui-spinner-up sui-unselectable"/>')
                    .html('<span class="sui-caret-up sui-unselectable" unselectable="on"/>')
                    .attr(UNSELECTABLE, ON)
                    .attr(ALT, labelIncrease)
                    .attr(TITLE, labelIncrease)
                    .on(MOUSEDOWN + self._eventNS, self._onSpinUpMDProxy)
                    .on(MOUSEUP + self._eventNS, self._onSpinnerMUProxy)
                    .on(MOUSEOUT + self._eventNS, self._onSpinnerMUProxy)
					.on(SELECTSTART + self._eventNS, function() { return false; });

                self.spinDown = spinDown = $('<span class="sui-spinner sui-spinner-down sui-unselectable"/>')
                    .html('<span class="sui-caret-down sui-unselectable" unselectable="on"/>')
                    .attr(UNSELECTABLE, ON)
                    .attr(ALT, labelDecrease)
                    .attr(TITLE, labelDecrease)
                    .on(MOUSEDOWN + self._eventNS, self._onSpinDownMDProxy)
                    .on(MOUSEUP + self._eventNS, self._onSpinnerMUProxy)
                    .on(MOUSEOUT + self._eventNS, self._onSpinnerMUProxy)
					.on(SELECTSTART + self._eventNS, function() { return false; });

                element.append(
                    $('<span class="sui-spinners"/>').append(
                        spinUp,
                        spinDown
                    )
                );
            }

	        // add the keydown handler for the element
	        textElement.on(KEYDOWN + self._eventNS, proxy(self._keydown, self));

            // add the core and optional classes
            element.addClass("sui-numeric-textbox" + (spinners ? "" : " sui-numeric-textbox-nosp") + (cls ? (" " + cls) : ""));

            // get the decimal digits in the step
            stepDecimalDigits = getDecimalPoints(step);

            // initialize the textTemplate and valueTemplate if not defined, 
            // based on the step - have the same number of decimal points as the step
            if (!isDefined(options.textTemplate)) {
                options.textTemplate = "{0:n" + stepDecimalDigits + "}";
            }
            if (!isDefined(options.valueTemplate)) {
                options.valueTemplate = "{0:n" + stepDecimalDigits + "}";
            }

            // ARIA
            element
                .attr(ROLE, "spinbutton")
                .attr(ARIA_VALUEMIN, options.min)
                .attr(ARIA_VALUEMAX, options.max);

            // init the enabled state
            self.enabled(options.enabled);

            // set any value
            if (isDefined(value)) {
                self.value(value);
            }

            self._destroyed = false;
        },

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

        _focus: function(event) {
            var self = this;

            if (!self._hasFocus) {
                self._hasFocus = true;

                $(self.element).addClass("sui-numeric-textbox-focus");

                // hack - update the value so that the text element gets re-rendered.
                // this will properly display the right thing - text or value, depending
                // on whether the numeric textbox has the focus and it is editable
                self.value(self.value());

                // raise the focus event
                self.trigger(FOCUS);
            }
        },

        _blur: function(event) {
            var self = this,
                element = $(self.element),
                textElement = $(self.textElement);

            // if editable, set the value now (before the blur logic) in order to update the 
            // underlying element's value in case someone wants it before the delayed logic below is executed.
            // this will make sure any custom-typed value will be in effect
            if (self.options.editable) {
                // get the old val
                var oldVal = self.value(),
                    newVal;

                // update the value with the typed in the textEl
                self._updateIfDirty();

                // get the new value
                newVal = self.value();

                // if the value has changed - fire a CHANGE event
                if (newVal !== oldVal) {
                    self.trigger(CHANGE, {value: newVal});
                }
            }

            // execute the blur logic after some time, 
            // checking whether the text element has the focus and so on
	        setTimeout(function() {
				// don't blur if text element or container has focus,
                // or if widget is destroyed
				if (element.is(":focus") || textElement.is(":focus") || self._destroyed) {
					return;
				}

                self._hasFocus = false;

                element.removeClass("sui-numeric-textbox-focus");

                // hack - update the value so that the text element gets re-rendered.
                // this will properly display the right thing - text or value, depending
                // on whether the numeric textbox has the focus and it is editable.
                // NOTE: we are doing different things when editable - in order update the thing on blur
                if (self.options.editable) {
                    // get the old val
                    var oldVal = self.value(),
                        newVal;

                    // update the value with the typed in the textEl
                    self.value(textElement.val());
                    newVal = self.value();

                    // if the value has changed - fire a CHANGE event
                    if (newVal !== oldVal) {
                        self.trigger(CHANGE, {value: newVal});
                    }
                }
                else {
                    self.value(self.value());
                }

                // trigger a blur event
                self.trigger(BLUR);
			}, 100);
        },

        _keydown: function(event) {
            var self = this,
                code = event.keyCode,
                enabled = self._enabled;

	        switch (code) {
				case keyCode.TAB:
                case keyCode.LEFT:
                case keyCode.RIGHT:
                    break;
                case keyCode.END:
                    self._updateValue("max", false);
                    event.preventDefault();
                    break;
                case keyCode.HOME:
                    self._updateValue("min", false);
                    event.preventDefault();
                    break;
                case keyCode.ESC:
                    if (enabled) {
                        self.value(self.value());
                    }
                    event.preventDefault();
					break;
	            case keyCode.UP:
                    self._updateValue("inc", false);
					event.preventDefault();
	                break;
	            case keyCode.DOWN:
					self._updateValue("dec", false);
					event.preventDefault();
	                break;
	            default:
                    // allow only certain characters to be entered in the field in keydown
                    if (self.options.editable && enabled) {
                        if (
                            (code >= 48 && code <= 57) || // digits
                            (code >= 96 && code <= 105) || // numpad digits
                            code == 190 || code == 110 || // dot
                            code == 173 || code == 109 || code == 189 || // dash
                            code == keyCode.DEL || // delete
                            code == keyCode.BACK || // backspace
                            code == keyCode.ENTER || // enter key
                            (event.ctrlKey && (code == 118 || code == 86))  // Ctrl + V (paste)
                        ) {
                            // set the dirty flag
                            self._dirty = true;
                        }
                        else {
                            // invalid char pressed - cancel the event
                            event.preventDefault();
                        }
                    }
                    else {
                        // not editable - cancel all events
                        event.preventDefault();
                    }
	                break;
	        }
        },

        // mousedown event on spin up arrow
        _spinUpMD: function(event) {
            var self = this;

            event.preventDefault();

            self._updateValue("inc", false);

            self._spinUpCancel = false;

            // after some time (wait for mouseup before that - if it was a single click), 
            // start a timer which will update the value
            setTimeout(function() {
                if (!self._spinUpInt && !self._spinUpCancel) {
                    self._spinUpInt = setInterval(proxy(self._updateValue, self, "inc", false), 20);
                }
            }, 100);
        },

        // mousedown event on spin down arrow
        _spinDownMD: function(event) {
            var self = this;

            event.preventDefault();

            self._updateValue("dec", false);

            self._spinDownCancel = false;

            setTimeout(function() {
                if (!self._spinDownInt && !self._spinDownCancel) {
                    self._spinDownInt = setInterval(proxy(self._updateValue, self, "dec", false), 20);
                }
            }, 100);
        },

        // mouseup event on both spinners - they should clear both interval functions
        _spinnerMU: function(event) {
            var self = this;

            self._spinUpCancel = self._spinDownCancel = true;

            clearInterval(self._spinUpInt);
            clearInterval(self._spinDownInt);
            self._spinUpInt = self._spinDownInt = null;

            //event.preventDefault();
        },

        _updateIfDirty: function() {
            var self = this,
                textElement = $(self.textElement);

            // if dirty - i.e. the user has updated the value by typing something in the textbox, 
            // take the value from the textinput
            if (self._dirty) {
                // set the value
                self.value(textElement.val());

                // clear the dirty flag
                self._dirty = false;
            }
        },

        _updateValue: function(type, bSkipEvent, setFocus) {
            var self = this,
                options = self.options,
                min = options.min,
                max = options.max,
                step = options.step,
                textElement = $(self.textElement),
                changed = false,
                value;

            // if not enabled, do not update the value
            if (!self._enabled) {
                return;
            }

            // if dirty - i.e. the user has updated the value by typing something in the textbox, 
            // take the value from the textinput
            self._updateIfDirty();

            // take the current value
            value = self.value();

            // if value is NaN, make it 0
            if (!isDefined(value)) {
                value = 0;
            }

            // bSkipEvent default is true
			// setFocus default is false
            bSkipEvent = isDefined(bSkipEvent) ? !!bSkipEvent : true;
			setFocus = isDefined(setFocus) ? !!setFocus : true;

            if (type == "inc") {
                // incrementing
                if (value < max) {
                    self.value(value + step);
                    changed = true;
                }
            }
            else if (type == "dec") {
                // decrementing
                if (value > min) {
                    self.value(value - step);
                    changed = true;
                }
            }
            else if (type == "min") {
                self.value(min);
                changed = true;
            }
            else if (type == "max") {
                self.value(max);
                changed = true;
            }

            // set the focus to the text display element
			if (setFocus) {
				textElement.focus();
				if (options.editable) {
					// move the cursor to the end if editable
					cursorAtEnd(textElement);
				}
			}

            // fire event if anything changed
            if (changed && !bSkipEvent) {
                self.trigger(CHANGE, {value: self.value()});
            }
        },

        // public function to increment the numeric textbox value
        increment: function() {
            // increment value, don't fire an event and do not set the focus to the text element
            this._updateValue("inc", true, false);
        },

        // public function to decrement the numeric textbox value
        decrement: function() {
            // decrement value, don't fire an event and do not set the focus to the text element
            this._updateValue("dec", true, false);
        },

        // setter/getter for the numeric textbox value
        value: function() {
            var self = this,
				options = self.options,
				args = [].slice.call(arguments),
                element = self.element,
                textElement = $(self.textElement),
                value,
                text;

			if (args.length > 0) {
				// setter

                if (isDefined(args[0]) && args[0] !== null && args[0] !== "") {
                    // bind the new value between min and max
                    value = mathMax(mathMin(args[0], options.max), options.min);

                    // format the value using the value format function
                    value = shieldFormat.call(self, options.valueTemplate, value);
                    value = toNumber(value);

                    // render the text
                    text = shieldFormat.call(self, options.textTemplate, value) + "";
                }
                else {
                    value = null;
                    text = "";
                }

                // NOTE: we will allow setting empty values for this widget, by 
                // passing null or "" to the this method

                // update the displayed value
                if (options.editable) {
                    // element is editable and enabled - if it has the focus, show the value,
                    // otherwise show the text
                    if (self._hasFocus && self._enabled) {
                        textElement.val(value);
                    }
                    else {
                        textElement.val(text);
                    }
                }
                else {
                    // element is not editable, so show the text
                    textElement.html(text);
                }

                // update the underlying element
                self._value(value);

                // ARIA
                if (value !== null) {
                    element.attr(ARIA_VALUENOW, value);
                }
                else {
                    element.removeAttr(ARIA_VALUENOW);
                }
                element.attr(ARIA_VALUETEXT, htmlEncode(text));
			}
			else {
				// getter

                // return the value of the original element
                return toNumber(self._value());
			}
        },

        _value: function() {
            return this._original.attr.apply(this._original, [VALUE].concat([].slice.call(arguments)));
        },

        // setter/getter for the enabled state of the numeric textbox
        enabled: function() {
            var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-numeric-textbox-disabled");
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-numeric-textbox-disabled");
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
        },

        // putting the numeric textbox on focus
        focus: function() {
            $(this.textElement).focus();
            cursorAtEnd($(this.textElement));
        },

        // numeric textbox destructor
        destroy: function() {
            var self = this;

            // set destroyed to true to prevent some delayed events (like blur)
            // from being fired after the widget has been destroyed
            self._destroyed = true;

            // remove spinners-related stuff
            if (self.options.spinners) {
                // remove the spinners event handlers
                $(self.spinUp)
                    .off(self._eventNS)
                    .remove();

                $(self.spinDown)
                    .off(self._eventNS)
                    .remove();

                self.spinUp = self.spinDown = null;
            }

            // remove the textElement and associated handlers
            $(self.textElement)
                .off(self._eventNS)
                .remove();
            self.textElement = null;

            // at this point the original element should be the only child of its parent, 
			// so unwrap and show it
			self._original
				.unwrap()
				.show();
            self._original = null;

            Widget.fn.destroy.call(self);
        }
    });
    NumericTextBox.defaults = numericTextBoxDefaults;
    shield.ui.plugin("NumericTextBox", NumericTextBox);


    /////////////////////////////////////////////////////////
    // MaskedTextBox Widget
    // masked textbox settings    
    maskedTextBoxDefaults = {
        enabled: true,				// whether the input will be enabled or disabled
        mask: "00-00-0000",         //specifies mask symbol template
        promptChar: "_",            //represents the visual char used in masked input
        value: "",                  //input value
        rules: {
            '0': function(source) { //Digit placeholder, allows digits between 0 and 9                
                return /^[0-9]$/.test(source);
            },
            '9': function(source) { //Digit or space placeholder, allows digits between 0 and 9 or space
                return /^[0-9 ]$/.test(source);
            },
            '#': function(source) { // Digit or space placeholder, allows digits between 0 and 9 or space or +/- symbols
                return /^[0-9 \+\-]$/.test(source);
            },
            'L': function(source) { //Letter placeholder, allows input letters a-z and A-Z.In regular expression equivalent to [a-zA-Z]
                return /^[a-zA-Z]$/.test(source);
            },
            '?': function(source) { //Letter or space placeholder, same as previous placeholder but allowing space too
                return /^[a-zA-Z ]$/.test(source);
            },
            '&': function(source) { // Any non-space character
                return /^[\S]$/.test(source);
            },
            'C': function(source) { // Any character, including space characters
                return /^[.]$/.test(source);
            },
            'A': function(source) { //Alphanumeric.Allows letters and digits only.
                return /^[0-9a-zA-Z]$/.test(source);
            },
            'a': function(source) { //Alphanumeric or space.Allows letters, digits and space only.
                return /^[0-9a-zA-Z ]$/.test(source);
            }
        },
        cultureSpecific: ['.', ',', '$'],       //list of culture specific symbols
        separators: ['/', '-', ' ', '(', ')'],  //list of separators in mask
        cls: UNDEFINED,			   // optional class to apply after applying the base widget classes        
        events: {
            // focus
            // blur
            // change
        }
    };
    MaskedTextBox = Widget.extend({
        // initialization method, called by the framework
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				options = self.options,
                dieOnError = options.dieOnError,
                value = options.value,
				element = $(self.element);

            if (getUType(element) != UTYPE_INPUT) {
                error("shieldMaskedTextBox: Underlying element is not INPUT", dieOnError);
                return;
            }
            if (!self._verifyMask()) {
                error("shieldMaskedTextBox: Invalid mask", dieOnError);
                return;
            }

            // instance-unique event namespace
            self._eventNS = ".shieldMaskedTextBox" + self.getInstanceId();

            //add css style
            element.addClass("sui-input");

            //handle cls
            if (options.cls) {
                element.addClass(options.cls);
            }

            //set value
            // set any value if specified
			if (isDefined(value)) {
				self.value(value);
			}

            element
                .on(FOCUS + self._eventNS, proxy(self._focus, self))
                .on(BLUR + self._eventNS, proxy(self._blur, self))
                .on(KEYDOWN + self._eventNS, proxy(self._keydown, self))
                .on(KEYPRESS + self._eventNS, proxy(self._keypress, self))
                .on(CUT + self._eventNS, proxy(self._cut, self))
                .on(PASTE + self._eventNS, proxy(self._paste, self))
                .on(DRAGSTART + self._eventNS, proxy(self._dragstart, self))
                .on(DRAGENTER + self._eventNS, proxy(self._dragenter, self))
                .on(DRAGOVER + self._eventNS, proxy(self._dragover, self))
                .on(DROP + self._eventNS, proxy(self._drop, self));

            // ARIA (not decided yet what the ARIA is for Masked Text Box)
            element.attr(ROLE, TEXTBOX);

            // initialize the disabled state
            self.enabled(options.enabled);
        },

        _getMask: function () {
            var self = this,
                mask = self.options.mask,
                target = "",
                source,
                i;

            for (i = 0; i < mask.length; i++) {
                source = mask.charAt(i);
                target += self._isCultureSpecific(source) ? self._getCultureSpecific(source) : source;
            }
            return target;
        },

        _isCultureSpecific: function (source) {
            return inArray(source, this.options.cultureSpecific) !== -1;
        },

        _getCultureSpecific: function(source) {
            var currencyInfo = shield.getCurrencyInfo();
            return source == "$" ? currencyInfo.symbol : currencyInfo[source];
        },

        _skipSymbol: function (source) {            
            var self = this,
                separators = self.options.separators;

            return inArray(source, separators) !== -1 || self._isCultureSpecific(source);
        },

        _insertAt: function (source, target, index) {
            return source.substr(0, index) + target + source.substr(index);
        },

        _removeAt: function (source, index) {
            return source.substr(0, index) + source.substr(index + 1);
        },

        _caret: function (begin, end) {
            var self = this,
                element = $(self.element),
                range;

            if (element.length === 0 || element.is(":hidden")) {
                return;
            }

            if (typeof begin == 'number') {
                end = (typeof end === 'number') ? end : begin;
                return element.each(function () {
                    if (element.setSelectionRange) {
                        element.setSelectionRange(begin, end);
                    }
                    else if (element.createTextRange) {
                        range = element.createTextRange();
                        range.collapse(true);
                        range.moveEnd('character', end);
                        range.moveStart('character', begin);
                        range.select();
                    }
                });
            }
			else {
                if (element[0].setSelectionRange) {
                    begin = element[0].selectionStart;
                    end = element[0].selectionEnd;
                }
				else if (doc.selection && doc.selection.createRange) {
                    range = doc.selection.createRange();
                    begin = 0 - range.duplicate().moveStart('character', -100000);
                    end = begin + range.text.length;
                }
                return { begin: begin, end: end };
            }
        },

        _caretTo: function (index) {
            var self = this,
                element = $(self.element);

            if (element.prop("selectionStart") !== UNDEFINED) { //FF, Chrome, IE 9 above                
                element.prop("selectionStart", index);
                element.prop("selectionEnd", index);
            }
            else if (doc.selection) { // IE 8  element.createTextRange    
                element.focus();                
                var range = doc.selection.createRange(); //element.createTextRange();
                range.moveStart("character", -self.value().length);
                range.moveEnd("character", -self.value().length);
                range.moveStart('character', index);
                range.select();
            }
        },

        _isValid: function (source, pos) {
            var self = this,
                mask = self._getMask(),
                rules = self.options.rules,
                target,
                re;

            if (pos >= mask.length) {
                return false;
            }
            target = mask.charAt(pos);
            return isFunc(rules[target]) && rules[target].call(self, source);
        },

        _removeRegion: function (toLeft) {
            var self = this,
				options = self.options,
                mask = self._getMask(),
                content = self._value(),
                range = self._caret(),
                promptChar = options.promptChar,
                pos = range.begin,
                target,
				offset;

            if (pos == range.end) { //no marked text
                if (toLeft) {
                    target = mask.charAt(--pos);
                    if (!self._skipSymbol(target)) {
                        if (pos >= 0) {
                            content = self._removeAt(content, pos);
                            content = self._insertAt(content, promptChar, pos);
                            self._value(content);
                        }
                        else {
                            pos = 0;
                        }
                    }
                }
                else {
                    if (pos < content.length) {
                        target = mask.charAt(pos);
                        if (!self._skipSymbol(target)) {
                            content = self._shiftLeft(content, pos);
                            self._value(content);
                        }
                        else {
                            pos++;
                        }
                    }
                }
            }
            else { //marked text range                
                for (offset = pos; offset < range.end; offset++) {
                    if (self._skipSymbol(mask.charAt(offset))) {
                        continue;
                    }
                    content = self._removeAt(content, offset);
                    content = self._insertAt(content, promptChar, offset);
                }

                while (self._skipSymbol(mask.charAt(pos))) {
                    ++pos;
                }

                for (offset = pos; offset < range.end; offset++) {
                    if (self._skipSymbol(mask.charAt(offset))) {
                        continue;
                    }
                    content = self._shiftLeft(content, pos);
                }
                self._value(content);
            }
            self._caretTo(pos);
        },

        _shiftLeft: function (content, pos) {
            var self = this,
				options = self.options,
                mask = self._getMask(),
                promptChar = options.promptChar,
                tempVal, 
				isValid,
                j = pos, 
				offset;

            while (j < content.length - 1) //shift
            {
                offset = j + 1;
                while (self._skipSymbol(mask.charAt(offset))) {
                    offset++;
                }
                if (offset > content.length - 1) {
                    break;
                }
                tempVal = content.charAt(offset);
                content = self._removeAt(content, j);
                isValid = self._isValid(tempVal, j);
                content = self._insertAt(content, isValid ? tempVal : promptChar, j);
                j = offset;
            }

            content = self._removeAt(content, j);
            content = self._insertAt(content, promptChar, j);

            return content;
        },

        _shiftRightKey: function (content, pos) {
            var self = this,
				options = self.options,
                mask = self._getMask(),
                target = content.charAt(pos),
                promptChar = options.promptChar,
                tempVal, 
				offset, 
				isValid;

            if (target != promptChar) {
                if (pos < content.length - 1) {
                    var i = pos + 1,
						placeholder = content.charAt(i);

                    while (placeholder != promptChar && i <= content.length) {
                        placeholder = content.charAt(++i);
                    }

                    if (placeholder == promptChar) //shift
                    {
                        var j = i;
                        while (j > pos) {

                            if (!self._skipSymbol(mask.charAt(j))) {
                                offset = j - 1; tempVal = content.charAt(offset);
                                while (self._skipSymbol(mask.charAt(offset))) {
                                    tempVal = content.charAt(--offset);
                                }
                                content = self._removeAt(content, j);
                                isValid = self._isValid(tempVal, j);
                                content = self._insertAt(content, isValid ? tempVal : promptChar, j);
                            }
                            j--;
                        }
                    }
                }
            }
            return content;
        },

        _shiftRightPaste: function (content, pos) {
            var self = this,
				options = self.options,
                mask = self._getMask(),
                promptChar = options.promptChar,
                tempVal, 
				tempValNext,
                j = pos, 
				offset, 
				isValid;

            tempValNext = content.charAt(j);
            while (j < content.length - 1) //shift
            {
                offset = j + 1;
                while (self._skipSymbol(mask.charAt(offset))) {
                    offset++;
                }
                if (offset > content.length - 1) {
                    break;
                }
                tempVal = content.charAt(offset);
                content = self._removeAt(content, offset);
                isValid = self._isValid(tempValNext, offset);
                content = self._insertAt(content, isValid ? tempValNext : promptChar, offset);
                tempValNext = tempVal;
                j = offset;
            }
            return content;
        },

        _commit: function (source) {
            var self = this,
                mask = self._getMask(),                
                range = self._caret(),
                pos = range.begin,
                content;

            while (self._skipSymbol(mask.charAt(pos))) {
                ++pos;
			}

            if (!self._isValid(source, pos)) {
                return;
            }

            if (range.end > range.begin) {                
                self._removeRegion(false);
            }

            content = self._value();
            content = self._shiftRightKey(content, pos);
            content = self._removeAt(content, pos);
            content = self._insertAt(content, source, pos);
            self._value(content);
            pos++;
            while (self._skipSymbol(mask.charAt(pos))) {
                pos++;
			}

            self._caretTo(pos);
        },

        _verifyValue: function (source) {
            var self = this,
				mask = self._getMask();

            if (source.length != mask.length) {
                return false;
            }
            for (var pos = 0; pos < mask.length; pos++) {
                if (self._skipSymbol(mask.charAt(pos))) {
                    if (mask.charAt(pos) !== source.charAt(pos)) {
                            return false;
                        }
                        continue;
                    }
                if (!self._isValid(source.charAt(pos), pos)) {
                        return false;
                    }
                }
            return true;
        },

        _verifyMask: function () {
            var self = this,
                mask = self._getMask(),
                rules = self.options.rules,
                source;

            for (var index = 0; index < mask.length; index++) {
                if (!self._skipSymbol(mask.charAt(index))) {
                    source = mask.charAt(index);
                    if (!isFunc(rules[source])) {
                        return false;
                    }
                }
            }
            return true;
        },

        _applyMask: function () {
            var self = this,
				options = self.options,
				mask = self._getMask(),
				placeholder = options.promptChar,
				target = "";

            for (var pos = 0; pos < mask.length;pos++) {
                target += self._skipSymbol(mask.charAt(pos)) ? mask.charAt(pos) : placeholder;
            }
            self._value(target);
        },

        _isEmptyMask: function () {
            var self = this,
                val = self._value(),
				options = self.options,
                mask = self._getMask(),
                placeholder = options.promptChar;

            for (var pos = 0; pos < mask.length; pos++) {
                if (self._skipSymbol(mask.charAt(pos))) {
                    continue;
                }
                if (val.charAt(pos) !== placeholder) {
                    return false;
                }
            }
            return true;
        },

        _clearMaskOnBlur: function () {
            if (this._isEmptyMask()) {
                this._value("");
            }
        },

        _focus: function (event) {
            var self = this,
                oldValue;

            $(self.element).addClass("sui-input-focus");
            oldValue = self._value();
            if (!oldValue || oldValue === "") {
                self._applyMask();
            }
            self.trigger(FOCUS);
        },

        _blur: function (event) {
            this._clearMaskOnBlur();
            this.trigger(BLUR);
        },

        _preventDrag: function (event) {
            if (event.type == DRAGSTART ||
                event.type == DRAGENTER ||
                event.type == DRAGOVER ||
                event.type == DROP) {
                var dataTransfer = event.originalEvent.dataTransfer;
                if (event.type == DRAGSTART) {
                    dataTransfer.effectAllowed = "none";
                }
                else {
                    dataTransfer.dropEffect = "none";
                }
                if (event.stopPropagation) //FF
                {
                    event.preventDefault();
                    event.stopPropagation();
                }
                return false; //(IE)
            }

        },

        _triggerChange: function (oldValue) {
            var self = this,
                event;
            if (oldValue !== self._value()) {
                event = self.trigger(CHANGE, { value: self._value(), old: oldValue });

                if (event.isDefaultPrevented()) {
                    // user prevented the event - put back the old value of the input
                    self._value(self.oldValue);
                }
            }
            clearInterval(self.changeInterval);
            self.changeInterval = UNDEFINED;
        },

        _dragstart: function (event) {
            return this._preventDrag(event);
        },

        _dragenter: function (event) {
            return this._preventDrag(event);
        },

        _dragover: function (event) {
            return this._preventDrag(event);
        },

        _drop: function (event) {
            return this._preventDrag(event);
        },

        _keydown: function (event) {
            var self = this,
                code = event.keyCode,
                enabled = self._enabled,
                oldValue = self._value();

            if (!enabled) {
                event.preventDefault();                
            }

            switch (code) {
                case keyCode.BACK:
                case keyCode.DEL:
                        self._removeRegion(code == keyCode.BACK);
                    if (self.changeInterval === UNDEFINED) {
                        self.changeInterval = setInterval(proxy(self._triggerChange, self, oldValue), 20);
                    }
                    event.preventDefault();
                        break;
                    default:
                        if (event.ctrlKey) {
                            switch (code) {
                                case 118: // Ctrl + V (paste)
                                case 86:
                                case 122: //Ctrl + Z (undo) 
                                case 90:
                                case 121: //Ctrl + Y (redo) 
                                case 89:
                                	if (code == 118 || code == 86) { // paste
                                    	self._paste(event);
                                	}
                                	else if (code == 122 || code == 90) { //undo
                                    	self._undo();
                                    	if (self.changeInterval === UNDEFINED) {
                                        	self.changeInterval = setInterval(proxy(self._triggerChange, self, oldValue), 20);
                                    	}
                                	}
                                	event.preventDefault();                                
                        	}
                    	}
                        break;
               }
        },

        _keypress: function (event) {
            var self = this,
                code = event.keyCode,
                charCode = event.which,
                enabled = self._enabled,
                oldValue = self._value(),
                source;

            if (event.ctrlKey) {
                return;
            }
            
            switch (code) {
                case keyCode.HOME:
                case keyCode.END:
                case keyCode.LEFT:
                case keyCode.RIGHT:
                case keyCode.TAB:
                    if (!browser.ie) {
                        return;
                    }
                    break;
                default:
                    source = String.fromCharCode(charCode);                    
                    self._commit(source);
                    break;
            }

            event.preventDefault();

            if (self.changeInterval === UNDEFINED && oldValue != self._value()) {
                self.changeInterval = setInterval(proxy(self._triggerChange, self, oldValue), 20);                
            }
        },

        _cut: function (event) {
            var self = this,
                range = self._caret();

            if (self.cutInterval === UNDEFINED) {
                self.cutInterval = setInterval(proxy(self._aftercut, self, range), 20);
            }
        },

        _aftercut: function (range) {
            var self = this,
                mask = self._getMask(),
                content = self.value(),
                oldValue = content,
                promptChar = self.options.promptChar,
                pos = range.begin,
                i;

            for (i = pos; i < range.end; i++) {
                content = self._insertAt(content, self._skipSymbol(mask.charAt(i)) ? mask.charAt(i) : promptChar, i);
            }
            self._value(content);
            self._caretTo(pos);

            while (self._skipSymbol(mask.charAt(pos))) {
                ++pos;
            }

            for (var offset = pos; offset < range.end; offset++) {
                if (self._skipSymbol(mask.charAt(offset))) {
                    continue;
                }
                content = self._shiftLeft(content, pos);
            }
            self._value(content);
            self._caretTo(pos);

            clearInterval(self.cutInterval);
            self.cutInterval = UNDEFINED;
            self._triggerChange(oldValue);
        },

        _paste: function (event) {
            var self = this,
                mask = self._getMask(),
                content = self._value(),
                oldValue = content,
                range = self._caret(),
                pos = range.begin,
                promptChar = self.options.promptChar,
                source = event.originalEvent || event,
                data, 
				isValid,
				i,
				offset;

            if (pos == content.length) {
                event.preventDefault();
                return;
            }

            if (source.clipboardData) { //FF, Chrome
                data = source.clipboardData.getData('text/plain');
            }
            else if (win.clipboardData) { //IE
                data = win.clipboardData.getData('Text');
            }

            if (data == null) {
                event.preventDefault();
                return;
            }

            if (pos == range.end) {
                while (self._skipSymbol(mask.charAt(pos))) {
                    pos++;
                }

                for (offset = data.length - 1; offset >= 0; offset--) {
                    content = self._shiftRightPaste(content, pos);
                    content = self._removeAt(content, pos);
                    isValid = self._isValid(data.charAt(offset), pos);
                    content = self._insertAt(content, isValid ? data.charAt(offset) : promptChar, pos); //TODO - should paste placeholder or omit invalid char ??
                }
                pos += data.length;
            }
            else { // marked text
                for (i = pos; i < range.end; i++) {
                    if (self._skipSymbol(mask.charAt(i))) {
                        continue;
                    }
                    content = self._removeAt(content, i);
                    content = self._insertAt(content, promptChar, i);
                }

                for (offset = 0; offset < data.length; offset++) {
                    while (self._skipSymbol(mask.charAt(pos))) {
                        pos++;
                    }
                    content = self._removeAt(content, pos);
                    isValid = self._isValid(data.charAt(offset), pos);
                    content = self._insertAt(content, isValid ? data.charAt(offset) : promptChar, pos);
                    pos++;
                }
            }

            self._value(content);
            self._caretTo(pos);
            event.preventDefault();
            if (self.changeInterval === UNDEFINED) {
                self.changeInterval = setInterval(proxy(self._triggerChange, self, oldValue), 20);
            }
        },

        _undo: function () {
            var self = this;
            self._applyMask();
        },

        // getter and setter for the input's value
        _value: function () {
            return this.element.val.apply(this.element, arguments);
        },

        // setter/getter for the value of the textbox (the entered text)
        value: function () {
            if (arguments.length > 0) {
                var args = [].slice.call(arguments);
                if (!this._verifyValue(args[0])) {
                    return false;
                }
            }
            return this._value.apply(this, arguments);
        },

        // setter/getter for the enabled state of the textbox control
        enabled: function () {
            var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				bEnabled;

            if (args.length > 0) {
                // setter
                bEnabled = !!args[0];

                if (bEnabled) {
                    element
						.removeAttr(DISABLED)
						.removeClass("sui-input-disabled");
                }
                else {
                    element
						.attr(DISABLED, DISABLED)
						.addClass("sui-input-disabled");
                }

                self._enabled = bEnabled;
            }
            else {
                // getter
                return self._enabled;
            }
        },

        // textbox destructor
        destroy: function () {
            var self = this,
				clsOption = self.options.cls;

            self.element
                .off(self._eventNS)
				.removeClass("sui-input" + (clsOption ? (" " + clsOption) : ""));

            Widget.fn.destroy.call(self);
        }
    });
    MaskedTextBox.defaults = maskedTextBoxDefaults;
    shield.ui.plugin("MaskedTextBox", MaskedTextBox);


    /////////////////////////////////////////////////////////
    // ComboBox Widget
    // combobox settings
    comboBoxDefaults = {
        editable: true,				// editable combo box, or not (just a dropdown)
        enabled: true,				// the control is enabled
		open: false,				// the dropdown is open on init
		cls: UNDEFINED,				// optional CSS class to add to the rendering element
        dataSource: UNDEFINED,		// the data source for the possible options
		autoComplete: {
			enabled: false,			// fill dropdown with items matching the search criteria
			delay: 200,				// the delay between input updates and autoComplete search
			minLength: 0,			// min length of string to search for
			filter: UNDEFINED		// filter to use with the dataSource when using autocomplete
		},
		valueTemplate: UNDEFINED,	// item value template
		textTemplate: UNDEFINED,	// item text template
        inputTemplate: UNDEFINED,   // select display value template
		selected: UNDEFINED,		// an integer index of an item to select
		value: UNDEFINED,			// the value of an item to be selected; has a higher precedence than "selected"
		width: UNDEFINED,			// optional width of the element
		height: UNDEFINED,			// optional height of the element
		dropDownWidth: UNDEFINED,	// dropdown width
		dropDownHeight:	200,		// maximum dropdown height
        appendListBoxTo: "body",    // where to append the listbox to; undefined means BODY
		animation: {
			enabled: true,			// enable suggestion list animation
			openDelay: 200,			// animation delay for showing the suggestion list
			closeDelay: 100			// animation delay for hiding the suggestion list
		},
        events: {
            // focus
            // blur
            // select (index, item)
            // change
        }
    };
	// Public methods:
	//		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		int selected()	/	void selected(index, boolSelect)
	//		mixed selectedItem()
	//		mixed value()	/	void value(valueToSelect)
	//		string text()
	// ComboBox class
	ComboBox = Widget.extend({
	    // initialization method, called by the framework
	    init: function () {
			// call the parent init
	        Widget.fn.init.apply(this, arguments);

	        var self = this,
				options = self.options,
				editable = options.editable,
				dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
				autoCompleteOpts = options.autoComplete,
				selected = options.selected,
				value = options.value,
                appendListBoxTo = options.appendListBoxTo,
				original,
				originalTabindex,
                originalPlaceholder,
				element,
				textElement,
				ddElement,
				autoCompleteFilter,
                listBoxParent;

			// save the original element and its type
			self._original = original = $(self.element);
			self._utype = getUType(original);

			// if not dataSource in options and underlying element is not select, raise an error
			if (!dataSourceOpts && self._utype != UTYPE_SELECT) {
				self.destroy();
				error((editable ? "shieldComboBox" : "shieldDropDown") + ": No dataSource or underlying SELECT element found.", dieOnError);
				return;
			}

            // instance unique event namespace
            self._eventNS = ".shieldComboBox" + self.getInstanceId();

			self.pending = 0;

			// init a wrapper element to contain the elements rendering the combobox;
			// put the original underlying element inside it;
			// also put a text value input or a div, and a check div to show/hide the dd arrow
			self.element = element = original.wrap("<span/>").parent();

			// hide the original element
			original.hide();

			// init a dropdown handler that we will use below
			self._onDDHandler = proxy(self._onDD, self);

			// if editable, add an input for the text, otherwise add a span
			if (editable) {
				textElement = $('<input type="text" class="sui-input"/>')
					.focus(function() {
						$(this).parent().addClass("sui-combobox-focus");
					})
					.blur(function() {
						$(this).parent().removeClass("sui-combobox-focus");
						self._blur();
					})
                    // ARIA
                    .attr(ROLE, TEXTBOX)
                    .attr(ARIA_MULTILINE, FALSE);

                // if underlying element has placeholder, add it to the text element too
                originalPlaceholder = original.attr(PLACEHOLDER);
                if (isDefined(originalPlaceholder)) {
                    textElement.attr(PLACEHOLDER, originalPlaceholder);
                }
			}
			else {
				// put a space inside the span, so it has some height 
				// even if no value is currently selected
				textElement = $('<span class="sui-input sui-unselectable">&nbsp;</span>')
					.attr(UNSELECTABLE, ON)
					.on(CLICK + self._eventNS, self._onDDHandler)
					.on(SELECTSTART + self._eventNS, function() { return false; });
			}
			self.textElement = textElement;
			textElement.appendTo(element);

			// add the dropdown button element
			self.ddElement = ddElement = $('<span class="sui-caret-container sui-unselectable"/>')
				.html('<span class="sui-caret sui-unselectable" unselectable="on"/>')
				.attr(UNSELECTABLE, ON)
				.on(CLICK + self._eventNS, self._onDDHandler)
				.appendTo(element);

	        element.addClass(editable ? "sui-combobox" : "sui-dropdown");

			// add the css class if specified
			if (options.cls) {
				element.addClass(options.cls);
			}

			// add tabindex for the element or input so that it can be selected on focus
			originalTabindex = original.attr(TABINDEX);
			if (editable) {
				textElement.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");
			}
			else {
				element.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");
			}

			// apply width and/or height if specified
			if (isDefined(options.width)) {
				element.css(WIDTH, options.width);
			}
			if (isDefined(options.height)) {
				element.css(HEIGHT, options.height);
				textElement.css(HEIGHT, options.height);
				ddElement.css(HEIGHT, options.height);
			}

	        // add the keydown handler for the element
	        element
                .on(KEYDOWN + self._eventNS, proxy(self._keydown, self))
                .on(KEYUP + self._eventNS, proxy(self._keyup, self));

            // focus handler
            self._focusHandler = proxy(self._focus, self);
            if (editable) {
                textElement.on(FOCUS + self._eventNS, self._focusHandler);
            }
            else {
                element.on(FOCUS + self._eventNS, self._focusHandler);
            }

			// blur handler
			element.on(BLUR + self._eventNS, proxy(self._blur, self));

			// initialize a container element for the list of items (rendered in a ListBox)
            // and append it to the proper parent element based on the appendListBoxTo option
			self.listElement = $("<span/>")
				.appendTo($(appendListBoxTo));

			// add the autocomplete filter to dataSource options if needed
			if (autoCompleteOpts) {
				if (isDefined(autoCompleteOpts.filter)) {
					autoCompleteFilter = autoCompleteOpts.filter;
				}
				else if (dataSourceOpts && dataSourceOpts.filter) {
					autoCompleteFilter = dataSourceOpts.filter;
				}
				else {
					// init a filter manually
					if (self._utype == UTYPE_SELECT) {
						autoCompleteFilter = {
							and: [
								{ path: "text", filter: "contains", value: "" }
							]
						};
					}
					else {
						autoCompleteFilter = {
							and: [
								{ path: "", filter: "contains", value: "" }
							]
						};
					}
				}
			}

			// init the ListBox which will hold the item list appearing below the combo
			self.listBox = new ListBox(original, {
				cls: "sui-autocomplete",
				dataSource: dataSourceOpts,
				// do not update the DS on init, bind a listener to the DS.change event and then read it manually
				// NOTE: we want to do this because we want to bind the handler before loading the DS, and bind it
				// after the ListBox internal handler for DS.change has been bound...
				readDataSource: false,
				valueTemplate: options.valueTemplate,
				textTemplate: options.textTemplate,
				multiple: false,
				selected: (isDefined(selected) && isArray(selected)) ? selected[0] : selected,
				values: value,
				width: options.dropDownWidth || element.innerWidth(),
				maxHeight: options.dropDownHeight,
				renderToINTERNAL: self.listElement,	// render the listbox to the list element already created
				wrapOriginalINTERNAL: false,		// do not wrap original element, we have already wrapped it
				// make the listbox unselectable by tabbing for browsers other than smaller IEs;
				// setting -1 tabindex for an element in IE7 and 8 will prevent it from firing the blur and focus events
				tabindexINTERNAL: (browser.ie && browser.version <= 8) ? 0 : -1,
				filterINTERNAL: autoCompleteFilter,
				events: {
					select: function(event) {
						// handle the selection changes from the listbox and fire a change event
						self._onLBSelChanged();
						self.trigger(SELECT, {index: event.index, item: event.item, text: event.text, value: event.value});
					},
					itemclick: function(event) {
                        // NOTE: this event will be called after the select one above

						// focus the element (the container or the input)
						if (editable) {
							textElement.focus();
						}
						else {
							element.focus();
						}

                        // hide the dropdown list of items
						self._hideDD();

                        // trigger an itemclick event for the combobox too, it might be needed for some other widgets internally like the editor
                        self.trigger(ITEMCLICK, {index: event.index, item: event.item, text: event.text, value: event.value});
					},
					blur: function(event) {
                        // handle the blur after some delay, leaving enough time
                        // for the listbox itemclick event to be handled above

                        // NOTE: if calling _blur or _hideDD immediately, this will cause 
                        // problems in IE and Chrome when someone clicks on an item in the listbox, 
                        // which is receiving the focus; an item in the listbox can receive the focus
                        // if it has custom HTML elements like DIVs and SPANs that receive focus, so
                        // if the user specifies such a textTemplate, when someone selects the listbox
                        // (e.g. to scroll with the bar) and then clicks on an item, the click event 
                        // will never reach the item because the whole dropdown will be closed in
                        // this blur handler;
                        // so - delay the closing...

                        setTimeout(proxy(self._blur, self), 20);
					}
				}
			});
			self.listBox.element.hide();

            // set the data source property
            self.dataSource = self.listBox.dataSource;

			// add list box data source change handler
			self.listBox.dataSource.on(CHANGE + self._eventNS, proxy(self._dsChange, self));

            // NOTE: copy the templates from the listbox, in case they were not set for the
            // ComboBox and were left to default to the ListBox ones (which in turn depend on
            // the type of underlying element - input/select)
            options.textTemplate = self.listBox.options.textTemplate;
            options.valueTemplate = self.listBox.options.valueTemplate;

            // ARIA
            element.attr(ROLE, "combobox");
            if (editable) {
                textElement.attr(ARIA_AUTOCOMPLETE, "list");
                textElement.attr(ARIA_CONTROLS, self.listBox.element.attr(ID));
                textElement.attr(ARIA_HASPOPUP, self.listBox.element.attr(ROLE));
            }
            // else - not editable ARIA ???

			// update the data source for the first time
			// NOTE: other initialization will be done in the _dsChange() below
			self.listBox.dataSource.read();

			// add a window resize handler
			$(win).on(RESIZE + self._eventNS, proxy(self._position, self));

	        // initialize the disabled state
	        self.enabled(options.enabled);

			// init the open state
			self._open = false;
			if (options.enabled && options.open) {
				self._showDD(true);
			}

            self._destroyed = false;
	    },

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

        // override the base function for putting the combobox in focus
        focus: function() {
            var self = this;

            if (self.options.editable) {
                // combobox - focus the input
                $(self.textElement).focus();
                cursorAtEnd($(self.textElement));
            }
            else {
                // dropdown - focus the wrapper
                $(self.element).focus();
            }
        },

        _focus: function(event) {
            var self = this;

            if (!self._hasFocus) {
                self._hasFocus = true;

                // save the value
                self._oldValue = self.value();

                // raise the focus event
                self.trigger(FOCUS);
            }
        },

		_blur: function(event) {
			var self = this;

			// hide the suggestions listbox after some time to allow
	        // it to send all select events to the subscribers
	        setTimeout(function() {
				// don't do anything if destroyed or if listbox, text element or container has focus
				if (self._destroyed || self.listBox == null || $(self.listBox.element).is(":focus") || $(self.element).is(":focus") || $(self.textElement).is(":focus")) {
					return;
				}

                // hide the dropdown
                self._hideDD();

                // if the value has been changed since when the element was originally on focus,
                // trigger a change event
                if (self._oldValue !== self.value()) {
                    self.trigger(CHANGE);
                }

                // trigger a blur event
                self.trigger(BLUR);

                self._hasFocus = false;
			}, 100);
		},

		_keydown: function(event) {
			var self = this;

	        switch (event.keyCode) {
				case keyCode.TAB:
					break;
	            case keyCode.UP:
	            case keyCode.DOWN:
					self._keydownUpDown(event);
					event.preventDefault();
	                break;
	            case keyCode.ESC:
				case keyCode.ENTER:
					event.preventDefault();
	                self.cancelSearch = true;
	                self._hideDD();
	                break;
	            default:
					self._keydownDefault(event);
	                break;
	        }
		},

        _keyup: function(event) {
            var self = this,
                eventKey = event.keyCode;

            // if editable combobox and the underlying element is an input, 
            // set its value to what is currently typed
            if (self.options.editable && self._utype == UTYPE_INPUT && 
                eventKey != keyCode.UP && eventKey != keyCode.DOWN && eventKey != keyCode.ENTER && eventKey != keyCode.TAB
            ) {
                $(self._original).attr(VALUE, $(self.textElement).val());
            }
        },

		_keydownUpDown: function(event) {
			// proxy the event to the dropdown items listbox if not disabled
			if (this._enabled) {
				$(this.listBox.element).trigger(event);
			}
		},

		_keydownDefault: function(event) {
			var self = this;

            // clear the listbox selection
            self.listBox.clearSelection();

			// process for autocomplete search
			self._searchTimeout(event);
		},

	    _searchTimeout: function (event) {
	        var self = this,
				autoCompleteOptions = self.options.autoComplete;

			if (!autoCompleteOptions || !autoCompleteOptions.enabled) {
				return;
			}

	        clearTimeout(self.searchTimeout);

	        self.searchTimeout = setTimeout(function () {
	            if (self.term !== $(self.textElement).val()) {
	                self._search();
	            }
	        }, autoCompleteOptions.delay);
	    },

	    _search: function () {
	        var self = this,
				dataSource = self.listBox.dataSource;

	        self.term = $(self.textElement).val();

	        if (self.term.length < self.options.autoComplete.minLength) {
	            self._hideDD();
	            return;
	        }

	        self.cancelSearch = false;

	        self.pending++;
	        $(self.textElement).addClass("sui-autocomplete-loading");

	        // update the filter - change all values
            updateFilterValues(self.listBox.dataSource.filter, self.term);

	        // reload the suggestions list box data source - this will also update it when done
			self.listBox.dataSource.read();
	    },

	    _dsChange: function () {
	        var self = this,
				original = self._original,
				utype = self._utype,
				textValue = self.textElement.val();

			if (!self._dsLoaded) {
				// DS is loaded for the first time
				self._dsLoaded = true;

				// if no item is selected and it is a dropdown, select the 0th item
				if (!self.options.editable && self.listBox.selected().length <= 0) {
					self.listBox.selected(0);
				}

				// apply any selection
				self._onLBSelChanged();

				// return, we don't want to do any more things
				return;
			}

	        self.pending--;
	        if (!self.pending) {
	            $(self.textElement).removeClass("sui-autocomplete-loading");
	        }

	        if (!self.cancelSearch && self._hasData()) {
	            self._showDD(true);
	        }
	        else {
	            self._hideDD();
	        }

			// sync the value of the underlying input/select with the value of the self.textElement
			if (utype == UTYPE_SELECT) {
				original.val(textValue);
			}
			else if (utype == UTYPE_INPUT) {
				original.attr(VALUE, textValue);
			}

			// trigger a change event
			self.trigger(SELECT, {index: -1, item: textValue});
	    },

	    _hasData: function () {
			var dsView = this.listBox.dataSource.view;
	        return dsView && dsView.length > 0;
	    },

		_onLBSelChanged: function() {
			var self = this,
                options = self.options,
				editable = options.editable,
				listBox = self.listBox,
				selectedItems = listBox.selectedItems(),
				value,
				text,
                input;

			if (selectedItems && selectedItems.length > 0) {
                value = shieldFormat.call(self, options.valueTemplate, selectedItems[0]);
                text = shieldFormat.call(self, options.textTemplate, selectedItems[0]);

                // render the select value to be shown if template provided, 
                // if not - default to the text template
                if (isDefined(options.inputTemplate)) {
                    input = shieldFormat.call(self, options.inputTemplate, selectedItems[0]);
                }
                else {
                    input = text;
                }

				if (editable) {
					// text element is input
					self.textElement.val(input);

                    // ARIA
                    self.textElement.attr(ARIA_ACTIVEDESCENDANT, listBox.element.attr(ARIA_ACTIVEDESCENDANT));
				}
				else {
                    // text element is span
					self.textElement.html(input);
				}
			}
			else {
				// nothing selected
				if (editable) {
					// clear the text and value ???
					self.textElement.val("");

                    // ARIA
                    self.textElement.removeAttr(ARIA_ACTIVEDESCENDANT);
				}
				else {
					// we should never reach here, but do it in case there are no items in the dropdown list
					self.textElement.html("&nbsp;");
				}
			}
		},

		_onDD: function(event) {
			var self = this,
				textElement = self.textElement;

			// focus the input if editable ComboBox
			if (self.options.editable) {
				textElement.focus();
				cursorAtEnd(textElement);
			}
			else {
				self.element.focus();
			}

			if (self._open) {
				self._hideDD();
			}
			else {
				// show if any items
				if (self._hasData()) {
					self._showDD(false);
				}
			}
		},

		_position: function() {
            var self = this,
				element = $(self.element),
                listBoxElement = $(self.listBox.element);

            listBoxElement.width(self.options.dropDownWidth || element.innerWidth());

            Position.Set(listBoxElement, element, {
                source: "left top",
                target: "left bottom",
                overflow: "none"
            });
		},

	    _showDD: function (disableAnimation) {
	        var self = this,
				listBox = self.listBox,
				listBoxElement = $(listBox.element),
				animation = self.options.animation;

			if (!self._enabled) {
				return;
			}

            // NOTE: place this in the upper left corner to minimize positioning
            // errors caused by appearing scrollbars
            listBoxElement.css({
                top: 0,
                left: 0
            });

			// show the list box
            listBoxElement.show();

            // position the suggestion list right below the input
            self._position();

            if (!disableAnimation && animation && animation.enabled) {
                listBoxElement
                    .hide()
                    .slideDown(animation.openDelay, proxy(listBox.ensureActiveViewableINTERNAL, listBox));
            }
            else {
				listBox.ensureActiveViewableINTERNAL();
            }

	        self._open = true;

            // ARIA
            $(self.element).attr(ARIA_EXPANDED, TRUE);
	    },

		_hideDD: function() {
			var self = this,
				listBoxElement = $(self.listBox.element),
				animation = self.options.animation;

			// hide with animation or not
			if (animation && animation.enabled) {
				listBoxElement.slideUp(animation.closeDelay);
			}
			else {
				listBoxElement.hide();
			}

			self._open = false;

            // ARIA
            $(self.element).attr(ARIA_EXPANDED, FALSE);
		},

		// setter/getter for the enabled state of the combobox control
	    enabled: function () {
	        var self = this,
				editable = self.options.editable,
				element = $(self.element),
				textElement = self.textElement,
				ddElement = self.ddElement,
				original = self._original,
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass(editable ? "sui-combobox-disabled" : "sui-dropdown-disabled");
					textElement.removeAttr(DISABLED);
					ddElement.removeAttr(DISABLED);
					original.removeAttr(DISABLED);
				}
				else {
					// hide the dropdown when being disabled
					if (self._open) {
						self._hideDD();
					}

					element
						.attr(DISABLED, DISABLED)
						.addClass(editable ? "sui-combobox-disabled" : "sui-dropdown-disabled");
					textElement.attr(DISABLED, DISABLED);
					ddElement.attr(DISABLED, DISABLED);
					original.attr(DISABLED, DISABLED);
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
	    },

		// setter/getter for the index of the currently selected item in the combobox (zero-based)
		selected: function() {
			var self = this,
				listBox = self.listBox,
				args = [].slice.call(arguments),
				selInd;

			if (args.length > 0) {
				// setter
				selInd = args[0];

				// clear the dropdown listbox current selection
				listBox.clearSelection();

				if (isDefined(selInd)) {
					selInd = toInt(selInd);
					if (selInd > -1) {
						listBox.selected(selInd);
					}
					else {
						// unselection - if editable, select the first element
						if (!self.options.editable) {
							listBox.selected(0);
						}
					}
				}

				// handle the new selection
				self._onLBSelChanged();
			}
			else {
				// getter
				selInd = listBox.selected();
				if (selInd && selInd.length > 0) {
					// at least one item selected - return the first one
					// only one should be selected though
					return selInd[0];
				}
				else {
					// no items selected
					return -1;
				}
			}
		},

        // getter for the currently selected item in the combobox
		selectedItem: function() {
			var self = this,
				// get the selected items from the listbox
				selItems = self.listBox.selectedItems();

			if (selItems && selItems.length > 0) {
				return selItems[0];
			}
			else {
				return null;
			}
		},

		// setter/getter for the value of the currently selected item in the combobox
		value: function() {
			var self = this,
				listBox = self.listBox,
				args = [].slice.call(arguments),
				listBoxValues;

			if (args.length > 0) {
				// setter

				// set the value to the listbox, clearing the selection before that
				listBox.clearSelection();
				listBox.values(args[0]);

				// handle the new selection
				self._onLBSelChanged();
			}
			else {
				// getter

				// get the values from the listbox
				listBoxValues = listBox.values();

				if (listBoxValues && listBoxValues.length > 0) {
					return listBoxValues[0];
				}
				else {
                    if (self.options.editable) {
                        return $(self.textElement).val();
                    }
                    else {
                        return null;
                    }
				}
			}
		},

		// getter for the text of the currently selected item in the combobox
		text: function() {
			var self = this,
				texts = self.listBox.texts();

			if (texts && texts.length > 0) {
				return texts[0];
			}
			else {
				if (self.options.editable) {
                    return $(self.textElement).val();
                }
                else {
                    return null;
                }
			}
		},

        // combobox destructor
	    destroy: function () {
	        var self = this,
				element = $(self.element),
				textElement = $(self.textElement),
				ddElement = $(self.ddElement);

            // do not destroy more than once
            if (self._destroyed) {
                return;
            }

            // set destroyed to true in order to prevent some delayed events
            // like blur to be fired after widget is destroyed
            self._destroyed = true;

            // indicate the data source was not loaded, in order to
            self._dsLoaded = false;

			// remove internal event handlers
			textElement.off(self._eventNS);
			ddElement.off(self._eventNS);
			self._onDDHandler = null;

			$(win).off(RESIZE + self._eventNS);

			element.off(self._eventNS);

            // unset the data source property
            self.dataSource = null;

			// remove the listbox
			if (self.listBox) {
				self.listBox.dataSource.off(CHANGE + self._eventNS);
				self.listBox.destroy();
				self.listBox = null;
			}
			$(self.listElement).remove();

			// remove the text and dd elements
			textElement.remove();
			ddElement.remove();

			// at this point the original element should be the only child of its parent, 
			// so unwrap and show it
			self._original
				.unwrap()
				.show();
            self._original = null;

			Widget.fn.destroy.call(self);
	    }
	});
    ComboBox.defaults = comboBoxDefaults;
    shield.ui.plugin("ComboBox", ComboBox);


	/////////////////////////////////////////////////////////
    // DropDown Widget - essentially a non-editable ComboBox
	dropDownDefaults = extend({}, comboBoxDefaults, {
		editable: false,
		autoComplete: UNDEFINED
	});
	DropDown = ComboBox.extend({
		init: function (element, userOptions) {
			// make sure some settings are always disabled
			if (userOptions) {
				userOptions.editable = false;
				userOptions.autoComplete = UNDEFINED;
			}

			// call the parent ComboBox class init
            ComboBox.prototype.init.call(this, element, userOptions);
        }
	});
	DropDown.defaults = dropDownDefaults;
    shield.ui.plugin("DropDown", DropDown);


    /////////////////////////////////////////////////////////
    // Button Widget
    // default button settings
    buttonDefaults = {
        enabled: true,	// whether the button will be enabled or disabled
		cls: UNDEFINED,	// optional class to apply after applying core widget classes
        toggle: false,	// is the button toggable (has 2 states or only one)
        checked: false,	// whether the button is checked (only works with toggle: true)
        events: {
            // click
        }
    };
	// Public methods:
	//		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		bool checked()	/	void checked(bChecked)
	// Input class
	Button = Widget.extend({
	    init: function () {
	        // call the parent init
	        Widget.fn.init.apply(this, arguments);

	        var self = this,
				element = $(self.element),
				options = self.options,
				cls = options.cls;

            // instance-unique event namespace
            self._eventNS = ".shieldButton" + self.getInstanceId();

	        element.addClass("sui-button");

			if (cls) {
				element.addClass(cls);
			}

	        // bind to the button element's click event - it should fire for
	        // mouse clicks, space and enter keys when on focus
	        // NOTE: not sure whether it will fire on touch
	        element.on(CLICK + self._eventNS, proxy(self._click, self));

            // ARIA
            element.attr(ROLE, BUTTON);

	        // initialize the disabled state
	        self.enabled(options.enabled);

	        // init the checked state
	        if (options.toggle) {
	            self._checked = !!options.checked;
	            if (self._checked) {
	                element.addClass("sui-button-checked");
	            }
	            else {
	                element.removeClass("sui-button-checked");
	            }

                // ARIA
                element.attr(ARIA + "-pressed", self._checked ? TRUE : FALSE);
	        }
	    },

	    _click: function (event) {
	        var self = this,
				element = $(self.element);

	        if (self._enabled) {
	            // if toggable, toggle the checked state
	            if (self.options.toggle) {
	                self._checked = !self._checked;
	                if (self._checked) {
	                    element.addClass("sui-button-checked");
	                }
	                else {
	                    element.removeClass("sui-button-checked");
	                }

                    // ARIA
                    element.attr(ARIA + "-pressed", self._checked ? TRUE : FALSE);
	            }

	            // trigger the click event
	            self.trigger(CLICK, event);
	        }
	    },

		// setter/getter for the checked state of the button
	    checked: function () {
	        var self = this,
				element = $(self.element),
				args = [].slice.call(arguments);

			if (args.length > 0) {
				// setter
				if (self.options.toggle) {
					self._checked = !!args[0];
					if (self._checked) {
						element.addClass("sui-button-checked");
					}
					else {
						element.removeClass("sui-button-checked");
					}

                    // ARIA
                    element.attr(ARIA + "-pressed", self._checked ? TRUE : FALSE);
				}
			}
			else {
				return self._checked;
			}
	    },

		// setter/getter for the enabled state of the button
		enabled: function() {
			var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-button-disabled")
                        .removeAttr(ARIA_DISABLED);
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-button-disabled")
                        .attr(ARIA_DISABLED, TRUE);
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
		},

        // button destructor
	    destroy: function () {
	        var self = this,
				clsOption = self.options.cls;

	        self.element
                .off(CLICK + self._eventNS)
                .removeClass("sui-button sui-button-checked sui-button-disabled" + (clsOption ? (" " + clsOption) : ""));

	        Widget.fn.destroy.call(self);
	    }
	});
    Button.defaults = buttonDefaults;
    shield.ui.plugin("Button", Button);


    /////////////////////////////////////////////////////////
    // SplitButton widget
    // default splitbutton settings
    splitButtonDefaults = extend({}, buttonDefaults, {
        /* inherited Button properties
        enabled: true,	// whether the button will be enabled or disabled
		cls: UNDEFINED,	// optional class to apply after applying core widget classes
        toggle: false,	// is the button toggable (has 2 states or only one)
        checked: false,	// whether the button is checked (only works with toggle: true)
        */
        menu: UNDEFINED,        // String, Array or jQuery identifying the UL to init the menu items from
		dataSource: UNDEFINED,  // data source configuration for the menu items
        events: {
            // click - inherited from Button
            // menuClick - see Menu for details
        }
	});
	// Public methods (inherited from Button)
	//		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		bool checked()	/	void checked(bChecked)
    SplitButton = Button.extend({
        init: function () {
	        // call the parent init
	        Button.fn.init.apply(this, arguments);

            // if no contextmenu, return, leaving only the button defined
            if (!shield.ui.ContextMenu) {
                return;
            }

            // create the context-menu related stuff
            var self = this,
				element = $(self.element),
				options = self.options,
                menuOption = options.menu,
				cls = options.cls;

            // init the contextmenu handle
            self._handle = $('<button type="button"><span class="sui-caret-down"/></button>');
            element.after(self._handle);

            self._handleButton = new Button(self._handle, {
                cls: "sui-button-split-handle" + (cls ? (' ' + cls) : ''),
                events: {
                    click: function(e) {
                        if (self.menu.visible()) {
                            self.menu.visible(false);
                        }
                        else {
                            // take the button offset to position the contextmenu,
                            // which is added to the document
                            var offset = $(element).offset();
                            self.menu.visible(true, {x: offset.left, y: offset.top + $(element).outerHeight()});
                        }
                    }
                }
            });

            // init the context menu
            if (isDefined(menuOption)) {
                self._menuElement = $(menuOption);
            }
            else {
                self._menuElement = $('<ul/>');
                self._customMenuElement = true;
                self._handle.after(self._menuElement);
            }

            // ARIA - generate an ID for the context menu if not there
            if (!self._menuElement.attr(ID)) {
                self._menuElement.attr(ID, strid());
            }

            self.menu = new shield.ui.ContextMenu(self._menuElement, {
                cls: "sui-button-split-menu",
                dataSource: options.dataSource,
                minWidth: element.outerWidth() + self._handle.outerWidth() - 2,
                events: {
                    click: proxy(self.trigger, self, "menuClick")
                }
            });

            // ARIA (supplemental to Button's)
            $(self._handle)
                .attr(ARIA_HASPOPUP, TRUE)
                .attr(ARIA_CONTROLS, self._menuElement.attr(ID));
        },

        // setter/getter for the enabled state of the SplitButton
		enabled: function() {
            var self = this;

            if (arguments && arguments.length > 0) {
                // setter
                Button.fn.enabled.apply(self, arguments);
                if (self._handleButton) {
                    self._handleButton.enabled.apply(self._handleButton, arguments);
                }
                if (self.menu && !arguments[0]) {
                    // hide the menu if disabling
                    self.menu.visible(false);
                }
            }
            else {
                // getter
                return Button.fn.enabled.apply(self, arguments);
            }
		},

        // setter/getter for the visible state of the SplitButton
        visible: function() {
            var self = this;

            if (arguments && arguments.length > 0) {
                // setter
                Button.fn.visible.apply(self, arguments);
                if (self._handleButton) {
                    self._handleButton.visible.apply(self._handleButton, arguments);
                }
                if (self.menu && !arguments[0]) {
                    // hide the menu if hiding
                    self.menu.visible(false);
                }
            }
            else {
                // getter
                return Button.fn.visible.apply(self, arguments);
            }
        },

        // SplitButton destructor
        destroy: function() {
            var self = this;

            // destroy the context-menu related stuff
            if (self.menu) {
                self.menu.destroy();
                self.menu = UNDEFINED;
            }
            if (self._menuElement) {
                if (self._customMenuElement) {
                    $(self._menuElement).remove();
                    self._customMenuElement = UNDEFINED;
                }
                self._menuElement = UNDEFINED;
            }

            if (self._handleButton) {
                self._handleButton.destroy();
                self._handleButton = UNDEFINED;
            }
            if (self._handle) {
                $(self._handle).remove();
                self._handle = UNDEFINED;
            }

            // destroy the parent stuff
            Button.fn.destroy.call(self);
        }
    });
    SplitButton.defaults = splitButtonDefaults;
    shield.ui.plugin("SplitButton", SplitButton);


    /////////////////////////////////////////////////////////
    // CheckBox Widget
    // default checkbox settings
    checkBoxDefaults = {
        enabled: true,	// whether the checkbox will be enabled or disabled
        enableThreeStates: false, // whether the checkbox has intermediate state
        enableLabelClick: true, // whether the checkbox change it state when label asociated with it is clicked
        checked: false,	// whether the checkbox is checked. If the enableThreeStates is set to true the checked property can be null
        label: "", // The corresponding label of the checkbox
        events: {
            // click
        }
    };
	// Public methods:
    //		bool enabled()  /	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
    //		bool checked()  /	void checked(newValue)
	// CheckBox class
	CheckBox = Widget.extend({
	    init: function () {
			var self = this,
				options,
				label,
				tabIndex,
                wrapper,
                elementId;

	        // call the parent init
	        Widget.fn.init.apply(this, arguments);

            self._eventNS = ".shieldCheckBox" + self.getInstanceId();

			options = self.options;

			var element = $(self.element)
				.addClass("sui-checkbox-input");

            // generate an ID for the element if none set
            elementId = element.attr(ID);
            if (!elementId) {
                element.attr(ID, elementId = strid());
            }

			tabIndex = element.attr(TABINDEX);
            
            wrapper = self.wrapper = element
                .wrap('<span class="sui-checkbox"/>').parent()
                .attr(TABINDEX, isDefined(tabIndex) ? tabIndex : 0);

	        var checkBoxElement = $('<span class="sui-checkbox-element sui-checkbox-unchecked"/>');
	        checkBoxElement.appendTo(wrapper);
	        self.checkBoxElement = checkBoxElement;

	        $('<span class="sui-checkmark"/>').appendTo(checkBoxElement);

	        if (options.label) {
	            label = $('<label class="sui-checkbox-label"/>');
	            label.appendTo(wrapper);
	            label.attr("for", elementId);
	            label.get(0).innerHTML = options.label;
	            if (options.enableLabelClick) {
	                label.addClass("sui-checkbox-label-hover");
	            }
	        }
	        else {
	            label = element.parent().parent();
	            if (label && !label.is('label')) {
	                label = $('label[for="' + elementId + '"]');
	            }

	            if (label && options.enableLabelClick) {
	                label.addClass("sui-checkbox-label-hover");
	            }
	        }

            // ARIA
            wrapper.attr(ROLE, "checkbox");
            if (label) {
                var labelId = label.attr(ID);
                if (!labelId) {
                    label.attr(ID, labelId = strid());
                }
                wrapper.attr(ARIA_LABELLEDBY, labelId);
            }

	        if (element.attr(CHECKED)) {
	            options.checked = true;
	        }

	        self.enabled(options.enabled);
	        self.checked(options.checked);

	        // bind to the wrapper's click event and 
            // add the keydown handler for the element
	        wrapper
                .on(CLICK + self._eventNS, proxy(self._click, self))
                .on(KEYDOWN + self._eventNS, proxy(self._keydown, self));

            if (label && options.enableLabelClick) {
                // bind to the label's element's click event
                label
                    .on(CLICK + self._eventNS, proxy(self._click, self))
                    .on(KEYDOWN + self._eventNS, proxy(self._keydown, self));
	        }

	        wrapper.onselectstart = function () { return false; };
	        wrapper.onmousedown = function () { return false; };
	    },

	    _click: function (event) {
	        var self = this,
				element = $(self.element);
	        
	        if (!self._enabled) {
	            return;
	        }

	        if (self._checked) {
	            if (self.options.enableThreeStates) {
	                self._checked = null;
	            }
	            else {
	                self._checked = false;
	            }
	        }
	        else if (self._checked === false) {
	            self._checked = true;
	        }
	        else if (self._checked === null) {
	            self._checked = false;
	        }

	        self.checked(self._checked);

	        // trigger the click event
	        self.trigger(CLICK, event);

	        // needed when checkbox's parent is label
	        event.preventDefault();
	        event.stopPropagation();
	    },

	    _keydown: function (event) {
	        if (event.keyCode == keyCode.SPACE) {
	            this._click(event);
	        }
	    },

        // override those because the base hide/show work only with self.element
        hide: function() {
            $(this.wrapper).hide();
        },

        show: function() {
            $(this.wrapper).show();
        },

        isVisible: function() {
            return $(this.wrapper).is(":visible");
        },

        // getter/setter for the checked state of the checkbox
	    checked: function () {
	        var self = this,
                args = [].slice.call(arguments),
	            element = $(self.element),
                wrapper = self.wrapper,
                checkmark = wrapper.find(".sui-checkmark"),
                chChecked;

	        if (args.length > 0) {
	            self._checked = chChecked = args[0];

	            if (chChecked) {
	                wrapper.find(".sui-checkbox-element")
                        .removeClass("sui-checkbox-unchecked sui-checkbox-indeterminate")
                        .addClass("sui-checkbox-checked");

                    // ARIA
                    wrapper.attr(ARIA_CHECKED, TRUE);

	                element.attr(CHECKED, CHECKED);
	                element.data("1");
	                if (browser.ie && browser.version <= 8) {
	                    checkmark.css("filter", "progid:DXImageTransform.Microsoft.Matrix(SizingMethod='auto expand', M11=0.7071067811865476, M12=0.7071067811865475, M21=-0.7071067811865475, M22=0.7071067811865476)");
	                }
	            }
	            else if (chChecked === false) {
	                wrapper.find(".sui-checkbox-element")
                        .removeClass("sui-checkbox-checked sui-checkbox-indeterminate")
                        .addClass("sui-checkbox-unchecked");

                    // ARIA
                    wrapper.attr(ARIA_CHECKED, FALSE);

	                element.removeAttr(CHECKED);
	                element.data("0");

	                checkmark.css("filter", "");
	            }
	            else if (chChecked === null && self.options.enableThreeStates) {
	                wrapper.find(".sui-checkbox-element")
                        .removeClass("sui-checkbox-checked sui-checkbox-unchecked")
                        .addClass("sui-checkbox-indeterminate");

                    // ARIA
                    wrapper.attr(ARIA_CHECKED, "mixed");

	                element.removeAttr(CHECKED);
	                element.data("2");

	                checkmark.css("filter", "");
	            }
	        }
	        else {
	            return self._checked;
	        }
	    },

        // setter/getter for the enabled state of the checkbox
	    enabled: function () {
	        var self = this,
                args = [].slice.call(arguments),
				element = $(self.element);

	        if (args.length > 0) {
	            var chbEnabled = !!args[0];

	            if (chbEnabled) {
	                self.wrapper
                        .removeAttr(DISABLED)
                        .removeClass("sui-checkbox-disabled");
	                element.removeAttr(DISABLED);
	            }
	            else {
	                self.wrapper
                        .attr(DISABLED, DISABLED)
                        .addClass("sui-checkbox-disabled");
	                element.attr(DISABLED, DISABLED);
	            }

	            self._enabled = chbEnabled;
	        }
	        else {
	            return self._enabled;
	        }
	    },

        // checkbox destructor
	    destroy: function () {
	        var self = this;

	        self.element
                .removeClass("sui-checkbox-input")
                .removeAttr(TABINDEX);

	        if (self.checkBoxElement) {
	            self.checkBoxElement.off(self._eventNS);
	        }

	        if (self.wrapper) {
	            self.wrapper
                    .find(".sui-checkbox-label")
                    .off(self._eventNS)
                    .end()
					.removeAttr(DISABLED)
					.removeClass("sui-checkbox-disabled")
                    .replaceWith(self.element);

	            self.wrapper = null;
	        }

	        Widget.fn.destroy.call(self);
	    }
	});
    CheckBox.defaults = checkBoxDefaults;
    shield.ui.plugin("CheckBox", CheckBox);


    /////////////////////////////////////////////////////////
    // RadioButton Widget
    // default radiobutton settings
    radioButtonDefaults = {
        enabled: true,	// whether the radiobutton will be enabled or disabled
        enableLabelClick: true, // whether the radiobutton change it state when label asociated with it is clicked
        checked: false,	// whether the radiobutton is checked. If the enableThreeStates is set to true the checked property can be null
        label: "", // The corresponding label of the radiobutton
        events: {
            // click
        }
    };
    // Public methods:
    //		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
    //		bool checked()  /	void checked(newValue)
    // RadioButton class
    RadioButton = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
                element = $(self.element),
				options = self.options,
				label,
				tabIndex,
                wrapper,
                elementId;

            // instnace-unique event namespace
            self._eventNS = ".shieldRadioButton" + self.getInstanceId();

			element.addClass("sui-radiobutton-input");

            // generate an ID for the element if none set
            elementId = element.attr(ID);
            if (!elementId) {
                element.attr(ID, elementId = strid());
            }

            tabIndex = element.attr(TABINDEX);

            wrapper = self.wrapper = element.wrap('<span class="sui-radiobutton"/>').parent();

            wrapper.attr(TABINDEX, isDefined(tabIndex) ? tabIndex : 0);

            var radioButtonElement = $('<span class="sui-radiobutton-element"/>');
            radioButtonElement.appendTo(wrapper);
            self.radioButtonElement = radioButtonElement;

            $('<span class="sui-checkmark"/>').appendTo(radioButtonElement);

            if (options.label) {
                label = $('<label class="sui-radiobutton-label"/>');
                label.appendTo(wrapper);
                label.attr("for", elementId);
                label.get(0).innerHTML = options.label;
                if (options.enableLabelClick) {
                    label.addClass("sui-radiobutton-label-hover");
                }
            }
            else {
                label = element.parent().parent();
                if (label && !label.is('label')) {
                    label = $('label[for="' + elementId + '"]');
                }

                if (label && options.enableLabelClick) {
                    label.addClass("sui-radiobutton-label-hover");
                }
            }

            // ARIA
            wrapper.attr(ROLE, "radio");
            if (label) {
                var labelId = label.attr(ID);
                if (!labelId) {
                    label.attr(ID, labelId = strid());
                }
                wrapper.attr(ARIA_LABELLEDBY, labelId);
            }

            if (element.attr(CHECKED)) {
                options.checked = true;
            }

            self.enabled(options.enabled);

            if (options.checked) {
                self.checked(options.checked);
            }
            else {
                self._checked = false;
            }

            // bind to the radiobutton element's click event
            wrapper
                .on(CLICK + self._eventNS, proxy(self._click, self))
                .on(KEYDOWN + self._eventNS, proxy(self._keydown, self));

            if (label && options.enableLabelClick) {
                // bind to the label's element's click event
                label
                    .on(CLICK + self._eventNS, proxy(self._click, self))
                    .on(KEYDOWN + self._eventNS, proxy(self._keydown, self));
            }

            wrapper.onselectstart = function () { return false; };
            wrapper.onmousedown = function () { return false; };
        },

        _click: function (event) {
            var self = this;

            if (!self._enabled) {
	            return;
	        }

            // always set this to checked 
            self.checked(true);

            // trigger the click event
            self.trigger(CLICK, event);

            // needed when radiobutton's parent is label
            event.preventDefault();
            event.stopPropagation();
        },

        _keydown: function (event) {
            if (event.keyCode == keyCode.SPACE) {
                this._click(event);
            }
        },

        // override those because the base hide/show work only with self.element
        hide: function() {
            $(this.wrapper).hide();
        },

        show: function() {
            $(this.wrapper).show();
        },

        isVisible: function() {
            return $(this.wrapper).is(":visible");
        },

        // getter/setter for the checked state of the radiobutton
        checked: function () {
            var self = this,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                self._uncheckAllFromSameGroup();
                self._checkInternal(args[0]);
            }
            else {
                return self._checked;
            }
        },

        _checkInternal: function (checked) {
            var self = this,
				element = $(self.element),
                wrapper = self.wrapper;

            self._checked = checked;

            if (checked) {
                wrapper.find(".sui-radiobutton-element")
                    .removeClass("sui-radiobutton-unchecked sui-radiobutton-indeterminate")
                    .addClass("sui-radiobutton-checked");

                // ARIA
                wrapper.attr(ARIA_CHECKED, TRUE);

                element.attr(CHECKED, CHECKED);
            }
            else {
                wrapper.find(".sui-radiobutton-element")
                    .removeClass("sui-radiobutton-checked");

                // ARIA
                wrapper.attr(ARIA_CHECKED, FALSE);

                element.removeAttr(CHECKED);
            }
        },

        _uncheckAllFromSameGroup: function() {
            var self = this,
				element = $(self.element);

            // get all inputs with type radio and name this element's name, excluding the current element
            // and call _checkInternal(false) on each swidget;
            // also triggers an internal change event for the rest of the radios in the group
            $('input[type="radio"][name="' + element.attr("name") + '"]').not(element).each(function () {
                var radioButton = $(this).swidget();
                if (radioButton) {
                    radioButton._checkInternal(false);
                    radioButton.trigger(CHANGE);
                }
            });
        },

        // getter/setter for the enabled state of the radiobutton
        enabled: function () {
            var self = this,
                args = [].slice.call(arguments),
				element = $(self.element);

            if (args.length > 0) {
                var rbEnabled = !!args[0];

                if (rbEnabled) {
                    self.wrapper
					    .removeAttr(DISABLED)
					    .removeClass("sui-radiobutton-disabled");
                    element.removeAttr(DISABLED);
                }
                else {
                    self.wrapper
					    .attr(DISABLED, DISABLED)
					    .addClass("sui-radiobutton-disabled");
                    element.attr(DISABLED, DISABLED);
                }

                self._enabled = rbEnabled;
            }
            else {
                return self._enabled;
            }
        },

        // radiobutton destructor
        destroy: function () {
            var self = this;

            self.element
                .removeClass("sui-radiobutton-input")
                .removeAttr(TABINDEX);

            if (self.radioButtonElement) {
                self.radioButtonElement.off(self._eventNS);
                self.radioButtonElement = null;
            }

            if (self.wrapper) {
                if (self.label) {
                    self.label.off(self._eventNS);
                    self.label = null;
                }

				self.wrapper
					.removeAttr(DISABLED)
					.removeClass("sui-radiobutton-disabled");

				self.wrapper.replaceWith(self.element);
				self.wrapper = null;				
            }

            Widget.fn.destroy.call(self);
        }
    });
    RadioButton.defaults = radioButtonDefaults;
    shield.ui.plugin("RadioButton", RadioButton);


    /////////////////////////////////////////////////////////
    // Switch Widget
    // default radiobutton settings
    switchDefaults = {
        cls: UNDEFINED,
        enabled: true,
        checked: UNDEFINED,
        onText: UNDEFINED,
        offText: UNDEFINED,
        events: {
            // click
        }
    };
    // Public methods:
    //		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
    //		bool checked()		/	void checked(newValue)
    // RadioButton class
    Switch = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				options = self.options,
                dieOnError = options.dieOnError,
                cls = options.cls,
                checked = options.checked,
                original,
                originalTabindex,
                element,
                handle,
                inner,
                wrapper;

            // save the original element and its type
			self._original = original = $(self.element);

            if (getUType(original) !== UTYPE_INPUT || original.attr('type') !== 'checkbox') {
                error("shieldSwitch: Underlying element must ne an input of type checkbox.", dieOnError);
				return;
            }

            // instance-unique event namespace
            self._eventNS = ".shieldSwitch" + self.getInstanceId();

            self.element = element = original.wrap('<div class="sui-switch sui-unselectable' + (cls ? (' ' + cls) : '') + '" />').parent();

            inner = $('<div class="sui-switch-inner sui-unselectable" />').appendTo(element);
            self._text = $('<span class="sui-switch-text sui-unselectable" />').appendTo(inner);
            self._handle = handle = $('<div class="sui-switch-handle sui-unselectable" />').appendTo(element);
            handle.height(element.height());

            original.hide();

            // add tabindex for the element so that it can be selected on focus
			originalTabindex = original.attr(TABINDEX);
			element.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");

            element
                .on(CLICK + self._eventNS, proxy(self._click, self))
                .on(KEYDOWN + self._eventNS, proxy(self._keydown, self));

            checked = isDefined(checked) ? !!checked : !!original.attr(CHECKED);

            // ARIA
            element.attr(ROLE, SWITCH);

            self.checked(checked, false);

            self.enabled(options.enabled);
        },

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

        _keydown: function(event) {
            var self = this;

            if (event.keyCode === keyCode.SPACE) {
                self._click(event);
                event.preventDefault();
            }
        },

        _click: function(event) {
            var self = this;

            if (!self._enabled) {
                return;
            }

            // toggle checked
            self.checked(!self._checked);

            // trigger the click event
            self.trigger(CLICK, event);

            // needed when radiobutton's parent is label
            event.preventDefault();
            event.stopPropagation();
        },

        // getter/setter for the checked state of the switch
        checked: function () {
            var self = this,
                options = self.options,
                onText = options.onText,
                offText = options.offText,
                element = $(self.element),
                handle = $(self._handle),
                text = $(self._text),
                original = self._original,
				args = [].slice.call(arguments),
				bChecked,
                animate,
                animationDuration = 100;

            if (args.length > 0) {
                // setter
				bChecked = !!args[0];
                animate = isDefined(args[1]) ? !!args[1] : true;
                if (!animate) {
                    animationDuration = 0;
                }

                if (bChecked) {
                    original.attr(CHECKED, CHECKED);

                    // animation
                    handle.animate({
                        'left': element.width() - handle.width() - 2
                    }, animationDuration, function() {
                        element
                            .addClass("sui-switch-checked")
                            .attr(ARIA_CHECKED, TRUE); // ARIA

                        if (isDefined(onText)) {
                            text.html(onText);
                            element.attr(ARIA_LABEL, htmlEncode(onText));  // ARIA
                        }
                    });
				}
				else {
                    original.removeAttr(CHECKED);

                    // animation
                    handle.animate({
                        'left': -2
                    }, animationDuration, function() {
                        element
                            .removeClass("sui-switch-checked")
                            .attr(ARIA_CHECKED, FALSE); // ARIA

                        if (isDefined(offText)) {
                            text.html(offText);
                            element.attr(ARIA_LABEL, htmlEncode(offText));  // ARIA
                        }
                    });
				}

				self._checked = bChecked;
            }
            else {
                // getter
                return self._checked;
            }
        },

		// setter/getter for the enabled state of the switch
		enabled: function() {
			var self = this,
				element = $(self.element),
                original = self._original,
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-switch-disabled");
                    original.removeAttr(DISABLED);
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-switch-disabled");
                    original.attr(DISABLED, DISABLED);
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
		},

        destroy: function() {
            var self = this;

            $(self.element).off(self._eventNS);

            $(self._inner).remove();
            $(self._handle).remove();

			self._original
				.unwrap()
				.show();

            self._original = self._inner = self._handle = null;

            Widget.fn.destroy.call(self);
        }
    });
    Switch.defaults = switchDefaults;
    shield.ui.plugin("Switch", Switch);

})(jQuery, shield, this);