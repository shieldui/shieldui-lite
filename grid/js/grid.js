(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,
        shieldFormat = shield.format,
        support = shield.support,
        shieldExport = shield.exp,
        get = shield.get,
        iid = shield.iid,
        strid = shield.strid,
        keyCode = shield.Constants.KeyCode,

        is = shield.is,
        isFunc = is.func,
        isString = is.string,
        isObject = is.object,
        isBoolean = is["boolean"],
        isDefined = is.defined,
        isNumber = is.number,
        isUndefined = is["undefined"],
        isNull = is["null"],

        toInt = shield.to["int"],

		doc = document,
        abs = Math.abs,
        mathMin = Math.min,
        mathMax = Math.max,

        each = $.each,
        proxy = $.proxy,
        extend = $.extend,
		map = $.map,
        grep = $.grep,
        inArray = $.inArray,

		userAgent = navigator.userAgent,
		isOpera = win.opera,
		isIE = /msie/i.test(userAgent) && !isOpera,
        isIE7 = isIE && doc.documentMode === 7,
        isIE8 = isIE && doc.documentMode === 8,
        isIE10 = isIE && doc.documentMode === 10,
		docMode8 = doc.documentMode === 8,
		isWebKit = /AppleWebKit/.test(userAgent),
		isFirefox = /Firefox/.test(userAgent),

        ROLE = "role",
        ID = "id",
        ARIA_SORT = "aria-sort",
        ARIA_READONLY = "aria-readonly",
        ASCENDING = "ascending",
        DESCENDING = "descending",
        TABINDEX = "tabindex",
        TRUE = "true",
        FALSE = "false",
        HEIGHT = "height",
        WIDTH = "width",
        SELECTABLE = "sui-selectable",
        SELECTED = "sui-selected",
        CHANGE = "change",
        FOCUS = "focus",
        BLUR = "blur",
        START = "start",
        SCROLL = "scroll",
        COMMAND = "command",
        SELECTIONCHANGING = "selectionChanging",
        SELECTIONCHANGED = "selectionChanged",
        SELECTSTART = "selectstart",
        DATABOUND = "dataBound",
        VIRTUAL_ROWS_LOADED = "virtualRowsLoaded",
        KEYDOWN = "keydown",
        MOUSEDOWN = "mousedown",
        MOUSEMOVE = "mousemove",
        MOUSEUP = "mouseup",
        RESIZE = "resize",
        CLICK = "click",
        DOUBLECLICK = "dblclick",
        SORT = "sort",
        DETAILCREATED = "detailCreated",
        COLUMNREORDER = "columnReorder",
        COLUMN_RESIZE = "columnResize",
        GROUPSREORDER = "groupsReorder",
        GROUP = "group",
        UNGROUP = "ungroup",
        EDITORCREATING = "editorCreating",
        FILTERWIDGETCREATING = "filterWidgetCreating",
        GETCUSTOMFILTERVALUE = "getCustomFilterValue",
        CLEARFILTER = "clearFilter",
        EXPANDBUTTONCREATE = "expandButtonCreate",
        CANCEL = "cancel",
        EDIT = "edit",
        INSERT = "insert",
        SAVE = "save",
        DELETE = "delete",
        ERROR = "error",
        COLLAPSE = "collapse",
        EXPAND = "expand",
        EDITWINDOWOPEN = "editWindowOpen",
        INSERTWINDOWOPEN = "insertWindowOpen",
        DISPLAY = "display",
        NONE = "none",
        DISABLED = "disabled",
        CUSTOM_FILTER = "@@custom",

        SUI_VIEWINDEX = "sui-viewindex",
        SUI_FIELDNAME = "sui-fieldname",

        defaults;


    function normalizeAttributes(attributes) {
        var attr,
            result = " ";

        if (attributes) {
            if (isString(attributes)) {
                return attributes;
            }

            for (attr in attributes) {
                if (attributes.hasOwnProperty(attr)) {
                    result += attr + '="' + attributes[attr] + '"';
                }
            }
        }

        return result;
    }

    function hasAttribute(element, attribute) {
        var attr = $(element).attr(attribute);
        return isDefined(attr) && attr !== false;
    }

    function getElementsFromEvent() {
        var args = [].slice.call(arguments),
            event = args.shift(),
            cell,
            row,
            currentCell,
            i;

        // try to take the cell from each element passed, stop when found
        for (i=0; i<args.length; i++) {
            cell = $(event.target).closest(".sui-cell", args[i]);
            if (cell.length) {
                break;
            }
        }

        if (!cell.length) {
            return null;
        }

        row = cell[0].parentNode;
        currentCell = cell[0];

        if (row == null || currentCell == null) {
            return null;
        }
        else {
            return {
                row: row,
                cell: currentCell
            };
        }
    }

    function elementsSelected(elements) {
        return elements && ($(elements.row).hasClass(SELECTED) || $(elements.cell).hasClass(SELECTED));
    }

    function isEventTargetInsideCell(e, element) {
        return $(e.target).closest(".sui-cell", element).length > 0;
    }

    function focusFirst(element) {
        var first = $(element)
            .find(
                '.sui-checkbox:not(.sui-checkbox-disabled), .sui-radiobutton:not(.sui-radiobutton-disabled), .sui-input:not(.sui-input-disabled), ' + 
                '.sui-combobox:not(.sui-combobox-disabled), .sui-dropdown:not(.sui-dropdown-disabled), ' + 
                '.sui-listbox:not(.sui-listbox-disabled), .sui-switch:not(.sui-switch-disabled), ' +
                'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex]:not([tabindex="-1"]), *[contenteditable]'
            )
            .filter(':visible')
            .first();

        if ($(first).length > 0) {
            $(first).focus();
        }
    }


    // the default configuration options for the grid
    defaults = {
        columns: [],
        rowHover: true,
        scrolling: false,
        paging: false,
        columnReorder: false,
        showHeader: true,
        grouping: {
            showGroupHeader: false,
            allowDragToGroup: false,
            message: "Drag a column header here to group by a column"
        }
    };


    // Toolbar class
    // class which describes the toolbar of the grid
    var Toolbar = Class.extend({
        init: function (options, grid) {
            var self = this,
                toolbar,
                position,
                currentToolbarWrapper,
                toolbars,
                i;

            self._grid = grid;

            for (i = 0; i < options.length; i++) {
                toolbar = options[i];
                position = toolbar.position ? toolbar.position : "top";
                currentToolbarWrapper = $('<div class="sui-toolbar"/>');

                if (position === "top") {
                    toolbars = grid.element.find(".sui-toolbar");
                    if (toolbars.length > 0) {
                        $(toolbars[0]).after(currentToolbarWrapper);
                    }
                    else {
                        grid.element.prepend(currentToolbarWrapper);
                    }
                }
                else {
                    currentToolbarWrapper.addClass("sui-toolbar-bottom");
                    currentToolbarWrapper.appendTo(grid.element);
                }

                if (toolbar.template) {
                    self._initializeTemplate(toolbar, currentToolbarWrapper);
                }
                else {
                    if (toolbar.buttons.length > 0) {
                        self._buildButtons(currentToolbarWrapper, toolbar);
                    }
                }
            }
        },

        // build all buttons and add them into the toolbar
        _buildButtons: function (currentToolbarWrapper, toolbar) {
            var self = this,
                buttons = toolbar.buttons,
                i;

            for (i = 0; i < buttons.length; i++) {
                self._buildButton(buttons[i], currentToolbarWrapper);
            }
        },

        // build single shildui button and appned it to the given container
        _buildButton: function (buttonOptions, container) {
            var self = this,
                commandName = buttonOptions.commandName,
                commandHandler = buttonOptions.click,
                wrapperButton,
                btn;

            if (shield.ui.Button) {
                wrapperButton = $('<button type="button">' + buttonOptions.caption + '</button>')
                    .appendTo(container);

                // override the command handler if a commandName is set
                if (commandName == "insert") {
                    commandHandler = self._insertButtonClicked;
                }
                else if (commandName == "save") {
                    commandHandler = self._saveButtonClicked;
                }
                else if (commandName == "cancel") {
                    commandHandler = self._cancelButtonClicked;
                }
                

                // build the button with the given options
                btn = new shield.ui.Button(wrapperButton, {
                    cls: buttonOptions.cls,
                    events: {
                        click: proxy(commandHandler, self._grid)
                    }
                });
            }
        },

        

        // handle the click event of insert button
        _insertButtonClicked: function (e, skipCommand) {
            var self = this,
                options = self.options,
                newRowPosition = options.editing.insertNewRowAt,
                dataSource = self.dataSource,
                virtual = self._hasVirtualScrolling(),
                insertLast = false,
                model,
                row,
                index,
                args,
                key;

            if (!skipCommand) {
                // fire a command event if not supressed
                args = self.trigger(COMMAND, { commandName: INSERT, cancel: false });
                if (args.cancel) {
                    return;
                }
            }

            // if there is sorting, reset the sorting and 
            // go to the first page of the pager if any
            if (dataSource.sort && dataSource.sort.length > 0) {
                dataSource.sort = [];
                self._sortingInProgress = true;
                // update the pager manually in order to prevent read
                if (self.pager) {
                    dataSource.skip = 0;
                    dataSource.take = self.pager.pageSize();
                    self.pager.refresh(true);
                }
                // read the data source once, and call the same function 
                // again when done reading, indicating to it not to fire the insert command again
                dataSource.read().always(proxy(self._toolbar._insertButtonClicked, self, e, true));
                return;
            }

            self._editingInProcess = true;

            if (newRowPosition === "pagebottom") {
                // insert at the bottom of the page - this will add it before the last item on the page,
                // which (the last item) will be moved to the next page and the new one will appear last
                index = mathMax(0, self.contentTable.find(">tbody > tr").length - 1);

                // if no pagination, or no next page, insert as last
                if (!options.paging || (self.pager && !self.pager.hasNext())) {
                    index += 1;
                    insertLast = true;
                }
            }
            else {
                // insert at the top of the page
                index = 0;
            }

            // insert an empty item at the specified position - either at the end, or in a page
            model = insertLast ? dataSource.add({}) : dataSource.insertView(index, {});

            // make all fields in the model null
            for (key in model.fields) {
                if (model.fields.hasOwnProperty(key)) {
                    model.data[key] = null;
                }
            }

            self._editing._insertedItems.push(model);

            row = self.contentTable.find(">tbody > tr").eq(index);

            if (self.options.editing.mode != "popup") {
                self._editing._putRowInEditMode(row, 0);
            }
            else {
                self._initializePopupForm(0, true);
            }

            self.trigger(INSERT);
        },

        // handle the click event of save button
        _saveButtonClicked: function (e) {
            var self = this,
                rowIndex,
                editableCells = self.contentTable.find(">tbody > tr > .sui-editable-cell"),
                args;

            if (editableCells.length > 0) {
                rowIndex = editableCells.get(0).parentNode.rowIndex;
                self._updateItem(rowIndex, null);
                if (self._errorDuringEdit) {
                    self._errorDuringEdit = false;
                    return;
                }
            }

            args = self.trigger(COMMAND, { commandName: SAVE, cancel: false });

            if (!args.cancel) {
                // save the datasource, this will trigger a datasource change event
                self.dataSource.save();
                self.trigger(SAVE);
            }
        },

        // handle the click event of cancel button
        _cancelButtonClicked: function (e) {
            var self = this,
                args = self.trigger(COMMAND, { commandName: CANCEL, cancel: false });

            if (!args.cancel) {
                self.dataSource.cancel();
                self.trigger(CANCEL);
            }
        },

        // initialize template and instantiate it into the toolbar
        _initializeTemplate: function (toolbar, container) {
            var self = this,
                template = toolbar.template;

            // if template is defined (string or function) - use it for the cell value, 
            // otherwise use the format string or function.
            if (isFunc(template)) {
                // template is a function - execute it passing the container;
                // if the result is not null, undefined or an empty string, add it as a value
                var value = template.call(self._grid, container);
                if (isDefined(value) && !isNull(value) && value !== "") {
                    container.html(value);
                }
            }
            else {
                // template is a string
                container.html(template);
            }
        },

        destroy: function () {
            // WARNING: making this null might nullify other grid references
            //this._grid = null;
        }
    });


    // Editing class
    // class which describes the editing into the grid
    var Editing = Class.extend({
        init: function (options, grid) {
            var self = this;

            self._grid = grid;
            self.options = options;

            self._eventNS = ".shieldGridEditing" + iid();

            self._editors = {};
            self._insertedItems = [];

            if (options.enabled) {
                self._initEditing();
            }

            self._grid.dataSource.on(ERROR + self._eventNS, proxy(self._dsError, self));
        },

        _dsError: function (e) {
            var self = this,
                editor = self._editors[e.path];

            self._grid.trigger(ERROR, { type: e.type, path: e.path, value: e.value, editor: editor, reason: e.reason });
            self._errorDuringEdit = true;
        },

        // initialize editing. Attach events to the cell. 
        _initEditing: function () {
            var self = this,
                options = self.options,
                optionsEvent = options.event,
                eventNS = self._eventNS;

            if (isUndefined(optionsEvent)) {
                return;
            }

            if (optionsEvent === "click") {
                self._grid.element.on(CLICK + eventNS, ".sui-cell", proxy(self._editingTriggered, self));
            }
            else if (optionsEvent === "doubleclick") {
                self._grid.element.on(DOUBLECLICK + eventNS, ".sui-cell", proxy(self._editingTriggered, self));
            }

            $(doc).on(CLICK + eventNS, proxy(self._documentClicked, self));
        },

        // update previous item which was in edit mode and put current item in edit mode
        _editingTriggered: function (e) {
            var self = this,
                cell = e.target,
                row = $(e.target).parent(),
                rowIndex = row.get(0).rowIndex,
                options = self.options,
                mode = options.mode,
                type = options.type,
                ds = self._grid.dataSource,
                isBatch = options.batch,
                editableCells,
                currentRowIndex,
                args = self._grid.trigger(COMMAND, { commandName: EDIT, cancel: false, row: row, cell: cell, index: self._grid._getRowIndex(row) });

            if (args.cancel) {
                return;
            }

            if (isBatch) {
                editableCells = self._grid.contentTable.find(">tbody > tr > .sui-editable-cell");
                if (editableCells.length > 0) {
                    rowIndex = editableCells.get(0).parentNode.rowIndex;

                    if (row.get(0).nodeName.toUpperCase() === "TR" && (row.get(0).rowIndex != rowIndex || type != 'row')) {
                        var allUpdatedCellsKyes = self._grid._updateItem(rowIndex, cell);
                        if (self._errorDuringEdit) {
                            self._errorDuringEdit = false;
                            allUpdatedCellsKyes = null;
                            return;
                        }
                        currentRowIndex = row.get(0).rowIndex;

                        self._grid._putRowInViewMode(rowIndex, null);

                        // batch update with updated cells
                        if (!self._grid._populateInsertedItem && allUpdatedCellsKyes && allUpdatedCellsKyes.length > 0) {
                            self._grid._renderUpdateMarkers(allUpdatedCellsKyes, rowIndex);
                        }

                        self._grid._populateInsertedItem = false;

                        if (currentRowIndex === rowIndex) {
                            cell = self._grid.contentTable.find(">tbody > tr").eq(rowIndex).get(0).cells[cell.cellIndex];
                        }

                        rowIndex = currentRowIndex;
                    }
                    else {
                        return;
                    }
                }

                if (isUndefined(type) || type === 'cell') {
                    self._putCellInEditMode(cell, rowIndex);
                }
                else if (type === 'row') {
                    self._putRowInEditMode(row, cell.cellIndex);
                }
                else {
                    // error when options.type is not "row" or "cell"
                    shield.error("Invalid editing.type declaration. The editing.type must be 'row' or 'cell'.", options.dieOnError);
                }
            }
            else {
                if (ds.tracker && ds.tracker.changes && ds.tracker.changes.added && ds.tracker.changes.added.length > 0) {
                    if (row.get(0).nodeName.toUpperCase() === "TR" && (row.get(0).rowIndex != rowIndex || type != 'row')) {
                        ds.cancel();
                    }
                }
                else {
                    if (isUndefined(mode) || mode === 'inline') {
                        editableCells = self._grid.contentTable.find(">tbody > tr > .sui-editable-cell");
                        if (editableCells.length > 0) {
                            rowIndex = editableCells.get(0).parentNode.rowIndex;

                            if (row.get(0).nodeName.toUpperCase() === "TR" && (row.get(0).rowIndex != rowIndex || type != 'row')) {
                                self._grid._updateItem(rowIndex, cell);
                                if (self._errorDuringEdit) {
                                    self._errorDuringEdit = false;
                                    return;
                                }
                                currentRowIndex = row.get(0).rowIndex;
                                self._grid._closeAllEditedRows();

                                if (currentRowIndex === rowIndex) {
                                    cell = self._grid.contentTable.find(">tbody > tr").eq(rowIndex).get(0).cells[cell.cellIndex];
                                }

                                rowIndex = currentRowIndex;
                            }
                            else {
                                return;
                            }
                        }

                        if (isUndefined(type) || type === 'cell') {
                            self._putCellInEditMode(cell, rowIndex);
                        }
                        else if (type === 'row') {
                            self._putRowInEditMode(row, cell.cellIndex);
                        }
                        else {
                            // error when options.type is not "row" or "cell"
                            shield.error("Invalid editing.type declaration. The editing.type must be 'row' or 'cell'.", options.dieOnError);
                        }
                    }
                }
            }

            self._grid.trigger(EDIT, { row: row, cell: cell, index: self._grid._getRowIndex(row) });
        },

        _documentClicked: function (e) {
            var self = this,
                isBatch = self.options.batch,
                target = $(e.target),
                editableCells,
                rowIndex;

            if (self._grid._editingInProcess || self._grid._preventClosingEditors) {
                self._grid._editingInProcess = false;
                return;
            }

            if (!target.hasClass("sui-cell") &&
                !target.parents().hasClass("sui-cell") &&
                !target.parents().hasClass("sui-calendar") &&
                !target.parents().hasClass("sui-listbox")) {

                editableCells = self._grid.contentTable.find(">tbody > tr > .sui-editable-cell");

                if (editableCells.length > 0) {
                    rowIndex = editableCells.get(0).parentNode.rowIndex;

                    var allUpdatedCellsKyes = self._grid._updateItem(rowIndex, null);

                    if (self._errorDuringEdit) {
                        self._errorDuringEdit = false;
                        return;
                    }

                    self._grid._putRowInViewMode(rowIndex, null);

                    // batch update with updated cells
                    if (isBatch && !self._grid._populateInsertedItem && allUpdatedCellsKyes && allUpdatedCellsKyes.length > 0) {
                        self._grid._renderUpdateMarkers(allUpdatedCellsKyes, rowIndex);
                    }

                    self._grid._populateInsertedItem = false;
                }
            }
        },

        _getColumnIndex: function (cell) {
            // get column index from cell index
            return cell.cellIndex - $(cell.parentNode).find(".sui-indent-cell, .sui-expand-cell, .sui-expand-cell-disabled, .sui-collapse-cell").length;
        },

        _putCellInEditMode: function (cell, rowIndex) {
            var self = this,
                columnIndex = self._getColumnIndex(cell),
                grid = self._grid,
                ds = grid.dataSource,
                dataItem,
                column = grid.columns[columnIndex],
                rows,
                i,
                shouldFocusControl = false;

            if (!column || !column.field) {
                return;
            }

            if (column.editable === false) {
                return;
            }

            if (ds.group && ds.group.length > 0) {
                rows = self._grid.contentTable.find(">tbody > tr > .sui-row, >tbody > tr > .sui-alt-row");
                for (i = 0; i < rows.length; i++) {
                    if (rows[i] == cell.parentNode) {
                        rowIndex = i;
                        break;
                    }
                }
            }

            dataItem = ds.editView(rowIndex).data;

            if (arguments.length > 2) {
                if (arguments[2] == columnIndex) {
                    shouldFocusControl = true;
                }
            }
            else {
                shouldFocusControl = true;
            }

            if (column.editor) {
                self._instantiateCustomEditor(column, cell, dataItem, rowIndex, shouldFocusControl);
            }
            else {
                var columnType = isDefined(ds.schema.options.fields) ? ds.schema.options.fields[column.field].type : String,
                    value = get(dataItem, column.field);

                switch (columnType) {
                    case Number:
                        self._instantiateNumeric(cell, value, shouldFocusControl);
                        break;
                    case Date:
                        self._instantiateDatePicker(cell, value, shouldFocusControl);
                        break;
                    case String:
                        self._instantiateTextBox(cell, value, shouldFocusControl);
                        break;
                    case Boolean:
                        self._instantiateCheckBox(cell, value, shouldFocusControl);
                        break;
                    default:
                        break;
                }
            }

            // focus the first focusable element in the cell
            focusFirst(cell);
        },

        _prepareCell: function (cell) {
            $(cell)
                .empty()
                .addClass("sui-editable-cell");
        },

        _instantiateCustomEditor: function (column, cell, dataItem, index, shouldFocusControl, _field) {
            var self = this,
                cellIndex,
                field,
                value;

            if (!_field) {
                cellIndex = self._getColumnIndex(cell);
                field = self._grid.columns[cellIndex].field;

                self._prepareCell(cell);
            }
            else {
                field = _field;
            }

            value = column.editor.call(self._grid, cell, dataItem, index, shouldFocusControl);

            $(cell).html(value);
            self._editors[field] = "custom";
        },

        _instantiateNumeric: function (cell, value, shouldFocusControl, _field) {
            var self = this,
                input,
                wrapperInput,
                cellIndex,
                field;

            if (!_field) {
                cellIndex = self._getColumnIndex(cell);
                field = self._grid.columns[cellIndex].field;

                self._prepareCell(cell);
            }
            else {
                field = _field;
            }

            wrapperInput = $('<input name="' + field + '"/>');
            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.NumericTextBox) {
                input = new shield.ui.NumericTextBox(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                self._editors[field] = input;
            }
        },

        _instantiateDatePicker: function (cell, value, shouldFocusControl, _field) {
            var self = this,
                input,
                wrapperInput,
                cellIndex,
                field;

            if (!_field) {
                cellIndex = self._getColumnIndex(cell);
                field = self._grid.columns[cellIndex].field;

                self._prepareCell(cell);
            }
            else {
                field = _field;
            }

            wrapperInput = $('<input name="' + field + '"/>');
            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.DatePicker) {
                input = new shield.ui.DatePicker(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                self._editors[field] = input;
            }
        },

        _instantiateTextBox: function (cell, value, shouldFocusControl, _field) {
            var self = this,
                input,
                wrapperInput,
                cellIndex,
                field;

            if (!_field) {
                cellIndex = self._getColumnIndex(cell);
                field = self._grid.columns[cellIndex].field;
                self._prepareCell(cell);
            }
            else {
                field = _field;
            }

            wrapperInput = $('<input type="text" name="' + field + '"/>');
            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value, cls: "sui-input-textbox" });

            if (shield.ui.TextBox) {
                input = new shield.ui.TextBox(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                self._editors[field] = input;
            }
        },

        _instantiateCheckBox: function (cell, value, shouldFocusControl, _field) {
            var self = this,
                input,
                wrapperInput,
                cellIndex,
                field;

            if (!_field) {
                cellIndex = self._getColumnIndex(cell);
                field = self._grid.columns[cellIndex].field;
                self._prepareCell(cell);
            }
            else {
                field = _field;
            }

            wrapperInput = $('<input type="checkbox" name="' + field + '"/>');
            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.CheckBox) {
                input = new shield.ui.CheckBox(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                input.checked(value);

                self._editors[field] = input;
            }
        },

        _putRowInEditMode: function (row, cellIndex) {
            var self = this,
                cells = row.find(".sui-cell"),
                buttonsCells,
                i;

            for (i = 0; i < cells.length; i++) {
                self._putCellInEditMode(
                    cells[i],
                    row.get(0).rowIndex,
                    // NOTE: for determining this index, see how the _getColumnIndex works
                    cellIndex - row.find(".sui-indent-cell, .sui-expand-cell, .sui-expand-cell-disabled, .sui-collapse-cell").length
                );
            }

            // focus the first focusable element in the row
            focusFirst(row);

            buttonsCells = row.find(".sui-edit");
            if (buttonsCells.length > 0) {
                self._grid._changeEditColumnButtons(row.get(0).rowIndex, $(row.children(".sui-button-cell")[0]));
            }
        },

        _destroyRow: function (rowIndex) {
            var self = this,
                grid = self._grid,
                row = grid.contentTable.find(">tbody > tr").eq(rowIndex),
                columns = grid.columns,
                i,
                colEditor;

            for (i = 0; i < columns.length; i++) {
                colEditor = self._editors[columns[i].field];
                if (colEditor) {
                    if (isFunc(colEditor.destroy)) {
                        self._editors[columns[i].field].destroy();
                    }
                    delete self._editors[columns[i].field];
                }
            }

            row.remove();
        },

        destroy: function () {
            var self = this,
                i,
                el,
                eventNS = self._eventNS;

            self._grid.dataSource.off(ERROR + eventNS);

            self._grid.element.off(eventNS, ".sui-cell");

            $(doc).off(CLICK + eventNS);

            if (self._editors) {
                for (i = 0; i < self._editors.length; i++) {
                    el = self._editors[i].editor.element();
                    self._editors[i].editor.destroy();
                    el.remove();
                }
            }

            // WARNING: making this null might nullify other grid references
            //self._grid = null;

            self._errorDuringEdit = self.options = null;
        }
    });


    // Column class
    var Column = Class.extend({
        init: function (options) {
            var self = this;

            if (isString(options)) {
                self.field = options;
                self.resizable = true;
                self.sortable = true;
                self.filterable = true;
                self.editable = true;
                self.visible = true;
                self.locked = false;
            }
            else if (isObject(options)) {
                self.field = options.field;
                self.title = options.title;
                self.format = options.format;
                self.width = options.width;
                self.minWidth = options.minWidth;
                self.maxWidth = options.maxWidth;
                self.resizable = isDefined(options.resizable) ? !!options.resizable : true;
                self.attributes = options.attributes;
                self.headerAttributes = options.headerAttributes;
                self.headerTemplate = options.headerTemplate;
                self.columnTemplate = options.columnTemplate;
                self.footerTemplate = options.footerTemplate;
                self.groupFooterTemplate = options.groupFooterTemplate;
                self.buttons = options.buttons;
                self.editor = options.editor;
                self.customFilter = options.customFilter;
                self.sortable = isDefined(options.sortable) ? !!options.sortable : true;
                self.filterable = isDefined(options.filterable) ? !!options.filterable : true;
                self.editable = isDefined(options.editable) ? !!options.editable : true;
                self.visible = isDefined(options.visible) ? !!options.visible : true;
                self.locked = self.visible ? !!options.locked : false;
            }
        },

        destroy: function () {
            var self = this;

            if (self.buttons) {
                self.buttons.length = 0;
            }

            // set the fields to null
            self.field =
                self.title =
                self.editor =
                self.editable =
                self.format =
                self.width =
                self.minWidth =
                self.maxWidth =
                self.resizable =
                self.attributes =
                self.headerAttributes =
                self.headerTemplate =
                self.buttons =
                self.customFilter =
                self.footerTemplate =
                self.groupFooterTemplate =
                self.sortable =
                self.filterable =
                self.visible = 
                self.locked = 
                self.columnTemplate = null;
        }
    });


    // ColumnResizing class
    var ColumnResizing = Class.extend({
        options: {
            ns: ".shieldGridColumnResizing",
            width: 12,
            offset: 6,
            min: 12
        },

        init: function (grid) {
            var self = this;

            self.grid = grid;
            self.options = extend(true, {}, ColumnResizing.fn.options);

            // make the event NS unique
            self._eventNS = self.options.ns + iid();

            grid.headerTable.on(MOUSEMOVE + self._eventNS, ".sui-headercell", proxy(self._showHandle, self));
        },

        _showHandle: function (e) {
            if (this.resizing) {
                return;
            }

            var self = this,
                options = self.options,
                grid = self.grid,
                handle = self.handle,
                x = e.pageX,
                params = self.params = self._params($(e.currentTarget)),
                isAtNextCellEdge = x >= params.offset.left && x <= (params.offset.left + options.offset) && params.headerIndex > 0;

            if (params.isRtl) {
                isAtNextCellEdge = x >= (params.offset.left + params.width - options.offset) && x <= (params.offset.left + params.width) && params.headerIndex > 0;
            }

            // cursor is at leftmost edge of the header -> use the previous header
            if (isAtNextCellEdge) {
                params = self.params = self._params(params.header.prev());
            }

            if (!params.column || !params.column.resizable || params.column.locked) {
                return;
            }

            if (x >= params.threshold && x <= params.edge + options.offset) {
                if (!handle) {
                    handle = self.handle = $('<div class="sui-resizable-handle"/>')
                        .on(MOUSEDOWN + self._eventNS, proxy(self._down, self))
                        .appendTo(params.header.parents(".sui-headercontent"));
                }

                handle.css({
                    top: params.position.top,
                    left: handle.parent()[0].scrollLeft + params.handleLeft,
                    width: options.width,
                    height: params.height
                }).show();
            }
            else if (handle) {
                handle.hide();
            }
        },

        _params: function (header) {
            var self = this,
                options = self.options,
                offset = header.offset(),
                position = header.position(),
                isRtl = support.isRtl(self.grid.element),
                width = header.outerWidth(),
                edge = offset.left + (isRtl ? options.width : width),
                headerIndex = header.index(),
                // WARNING: calling private method on the Grid class
                column = self.grid._getColumnByField(header.attr("data-field")),
                min = column ? (column.minWidth >= 0 ? +column.minWidth : options.min) : null,
                max = column ? (column.maxWidth >= min ? +column.maxWidth : null) : null;

            return {
                header: header,
                headerIndex: headerIndex,
                column: column,
                min: min,
                max: max,
                offset: offset,
                isRtl: isRtl,
                width: width,
                current: width,
                height: header.outerHeight(),
                edge: edge,
                threshold: edge - options.width + (isRtl ? -1 : 1) * options.offset,
                position: position,
                handleLeft: position.left + (isRtl ? options.width : width) - options.width + (isRtl ? -1 : 1) * options.offset
            };
        },

        _down: function (e) {
            var self = this,
                grid = self.grid,
                params = self.params,
                selector;

            // do not trigger for any button other than left button
            if (e.button > 1 || !params) {
                return;
            }

            selector = "> colgroup col:nth-child(" + (params.headerIndex + 1) + ")";

            params.origin = e.pageX;

            params.cols = $()
                .add(grid.headerTable.find(selector))
                .add(grid.contentTable.find(selector));

            self.resizing = true;
            self._cancelled = null;

            self.handle.hide();

            $(doc)
                .on(MOUSEMOVE + self._eventNS, proxy(self._move, self))
                .on(MOUSEUP + self._eventNS, proxy(self._up, self));

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                params = self.params,
                diff,
                width,
                commandArgs;

            if (!self.resizing) {
                return;
            }

            diff = (params.isRtl ? -1 : 1) * (e.pageX - params.origin);
            width = mathMax(params.width + diff, params.min);

            if (params.max) {
                width = mathMin(width, params.max);
            }

            // trigger a command and cancel if requested
            commandArgs = self.grid.trigger(COMMAND, {commandName: COLUMN_RESIZE, cancel: false, field: params.column.field, width: width});
            if (commandArgs && commandArgs.cancel) {
                self._cancelled = true;
                return;
            }

            if (width !== params.current) {
                params.cols.width(params.current = width);

                // WARNING: calling private methods on the Grid class
                // adjust the row heights, passing true to reinitialize scrolling
                self.grid._fixHeaderPadding();
                self.grid._adjustHeightsLocked(true);
            }
        },

        _up: function () {
            var self = this,
                grid = self.grid,
                params = self.params,
                width = params.current,
                column = params.column || {},
                columnOption = (grid.options.columns || [])[$(grid.columns).index(column)] || {};

            self.resizing = false;
            self.params = null;

            column.width = columnOption.width = width + "px";

            $(doc).off(self._eventNS);

            shield.selection(true);

            // fire the column resize event
            if (self._cancelled !== true) {
                grid.trigger(COLUMN_RESIZE, {field: column.field, width: width});
            }

            self._cancelled = null;
        },

        destroy: function () {
            var self = this;

            self.grid.headerTable.off(self._eventNS);

            // WARNING: making this null might nullify other grid references
            //self.grid = null;

            self._cancelled = null;

            if (self.handle) {
                self.handle
                    .off(self._eventNS)
                    .remove();

                self.handle = null;
            }
        }
    });

    // Filtering class
    var Filtering = Class.extend({
        init: function (grid) {
            var self = this;

            self.grid = grid;
            self._filters = {};

            self._eventNS = ".shieldGridFiltering" + iid();

            self._createFilterRow();
        },

        _createFilterRow: function () {
            var self = this,
                grid = self.grid,
                table = grid.headerTable,
                thead = table.find(">thead"),
                tr,
                indentCellsCount = thead.find(".sui-indent-cell").length,
                schema = grid.dataSource.schema,
                columnType,
                dataField,
                cell,
                columns = grid.columns,
                fields,
                i;

            self._tr = tr = $('<tr class="sui-filter-row"/>');

            for (i = 0; i < indentCellsCount; i++) {
                $('<th class="sui-indent-cell"/>').appendTo(tr);
            }

            if (schema && schema.options.fields) {
                fields = schema.options.fields;
            }

            for (i = 0; i < columns.length; i++) {
                columnType = fields && fields[columns[i].field] ? fields[columns[i].field].type : null;

                dataField = columns[i].field ? columns[i].field.replace(/[\"\']/g, "@") : '';
                cell = $('<th class="sui-filter-cell" data-field="' + dataField + '" role="gridcell" tabindex="-1"/>')
                    .appendTo(tr);

                if (columns[i].filterable !== false) {
                    // add filtering controls only if dataField defined
                    if (dataField.length > 0) {
                        self._initializeEditor(cell, columnType, columns[i].field, columns[i]);
                        self._appendFilterButton(cell);
                    }
                }
            }

            tr.appendTo(thead);

            $(doc).on(CLICK + self._eventNS, proxy(self._documentClicked, self));

            // init the default filter state
            for (i = 0; i < columns.length; i++) {
                dataField = columns[i].field ? columns[i].field.replace(/[\"\']/g, "@") : '';
                if (columns[i].filterable !== false) {
                    if (dataField.length > 0) {
                        var filter = self._getFilter(columns[i].field);

                        if (filter) {
                            // set filter value to the filter input
                            self._setEditorValue(columns[i].field, columns[i], filter.value);

                            // show a remove filter button for that field column
                            self._addRemoveFilterButton(columns[i].field);
                        }
                    }
                }
            }
        },

        _documentClicked: function (e) {
            var self = this,
                height,
                top;

            if (self.listBox && !$(e.target).hasClass("sui-filter-button") && !$(e.target).hasClass("sui-filter-button-content")) {
                var parent = self.listBox.element.parent();

                if (parent.css(DISPLAY) == NONE) {
                    return;
                }

                self._filterByField = null;
                height = parent.height();
                top = parent.offset().top;
                if (self._slideUp) {
                    parent.animate({
                        height: 0,
                        top: top + height
                    }, 150, function () {
                        parent.css({
                            display: NONE,
                            height: height
                        });
                    });
                }
                else {
                    parent.animate({
                        height: 0
                    }, 150, function () {
                        parent.css({
                            display: NONE,
                            height: height
                        });
                    });
                }
            }
        },

        _appendFilterButton: function (cell) {
            if (shield.ui.Button) {
                var wrapperButton = $('<button type="button"><span class="sui-sprite sui-filter-button-content"/></button>')
                    .appendTo(cell);

                // build the button with the given options
                var btn = new shield.ui.Button(wrapperButton, {
                    cls: "sui-filter-button",
                    events: {
                        click: proxy(this._filterButtonClicked, this)
                    }
                });
            }
        },

        _filterButtonClicked: function (e) {
            var self = this,
                grid = self.grid,
                data,
                height,
                top,
                schema = grid.dataSource.schema,
                filtering = grid.options.filtering,
                stringFunc = filtering.stringFunc ? filtering.stringFunc : [
                    { "func": "eq", "name": "Equal to" }, 
                    { "func": "neq", "name": "Not equal to" }, 
                    { "func": "con", "name": "Contains" },
                    { "func": "notcon", "name": "Not contains" }, 
                    { "func": "starts", "name": "Starts with" }, 
                    { "func": "ends", "name": "Ends with" }, 
                    { "func": "gt", "name": "Greater than" },
                    { "func": "lt", "name": "Less than" }, 
                    { "func": "gte", "name": "Greater than or equal" }, 
                    { "func": "lte", "name": "Less than or equal" }, 
                    { "func": "isnull", "name": "Is null" }, 
                    { "func": "notnull", "name": "Is not null" }
                ],
                nonStingFunc = filtering.nonStingFunc ? filtering.nonStingFunc : [
                    { "func": "eq", "name": "Equal to" }, 
                    { "func": "neq", "name": "Not equal to" }, 
                    { "func": "gt", "name": "Greater than" },
                    { "func": "lt", "name": "Less than" }, 
                    { "func": "gte", "name": "Greater than or equal" }, 
                    { "func": "lte", "name": "Less than or equal" }, 
                    { "func": "isnull", "name": "Is null" },
                    { "func": "notnull", "name": "Is not null" }
                ],
                field = e.target.element.parent().attr("data-field").replace(/[@]/g, "'");

            self._filterByField = field;

            if (schema && schema.options.fields) {
                var fields = schema.options.fields;
                if (fields && fields[field] && fields[field].type === String) {
                    data = stringFunc;
                }
                else {
                    data = nonStingFunc;
                }
            }
            else {
                data = stringFunc;
            }

            if (shield.ui.ListBox) {
                if (!self.listBox) {
                    self._menuWrapper = $('<div style="display:none;"/>')
                        .appendTo(doc.body);

                    self.listBox = new shield.ui.ListBox(self._menuWrapper, extend({}, {}, {
                        dataSource: {
                            data: data
                        },
                        textTemplate: "{name}",
                        valueTemplate: "{func}",
                        multiple: false,
                        width: 150,
                        maxHeight: 300,
                        events: {
                            select: proxy(self._selectFilterFunction, self)
                        }
                    }));

                    if (self.grid.element.parent().hasClass("sui-rtl")) {
                        self.listBox.element.parent().addClass("sui-rtl");
                    }
                    else {
                        self.listBox.element.parent().css(DISPLAY, NONE);
                    }
                }

                height = self.listBox.element.parent().height();

                self._positionListBox(e);

                if (self._slideUp) {
                    top = e.target.element.offset().top - height;
                    self.listBox.element.parent().css({
                        top: e.target.element.offset().top
                    });

                    self.listBox.element.parent().animate({
                        height: height,
                        top: top - self.listBox.element.parent().innerHeight()
                    }, 150);
                }
                else {
                    self.listBox.element.parent().animate({
                        height: height
                    }, 150);
                }
            }

            self._selectFilterMenuValue(field);
        },

        _getFilter: function(field) {
            var self = this,
                filter = self.grid.dataSource.filter,
                andFilter,
                result,
                i;

            if (filter && filter.and && filter.and.length > 0) {
                andFilter = filter.and;
                for (i = 0; i < andFilter.length; i++) {
                    if (andFilter[i].path === field) {
                        result = andFilter[i];
                    }
                }
            }

            return result;
        },

        _selectFilterMenuValue: function (field) {
            var self = this,
                filter = self._getFilter(field),
                selectedFilter = filter ? filter.filter : UNDEFINED;

            if (selectedFilter) {
                self.listBox.values(selectedFilter);
            }
            else {
                self.listBox.clearSelection();
            }
        },

        _selectFilterFunction: function (e) {
            var self = this,
                andFilterArr,
                args,
                shouldPushFilter = true,
                value = self._filters[self._filterByField] == CUSTOM_FILTER ? CUSTOM_FILTER : self._filters[self._filterByField].value(),
                func = e.item.func,
                currentFilter = { path: self._filterByField, filter: func, value: value };

            if (value == CUSTOM_FILTER) {
                args = self.grid.trigger(GETCUSTOMFILTERVALUE, { field: self._filterByField, value: null });
                value = args.value;
                currentFilter = { path: self._filterByField, filter: func, value: value };
            }

            if ((value === "" || value === null) &&
                func != "notnull" && func != "isnull") {
                return;
            }

            if (self.grid.dataSource.filter && self.grid.dataSource.filter.and) {
                andFilterArr = self.grid.dataSource.filter.and;

                for (var i = 0; i < andFilterArr.length; i++) {
                    if (andFilterArr[i].path === self._filterByField) {
                        andFilterArr[i] = currentFilter;
                        shouldPushFilter = false;
                    }
                }

                if (shouldPushFilter) {
                    andFilterArr.push(currentFilter);
                }
            }
            else {
                self.grid.dataSource.filter = {
                    and: [
                        currentFilter
                    ]
                };
            }

            self.grid.dataSource.read();

            self._addRemoveFilterButton(self._filterByField);
        },

        _addRemoveFilterButton: function (field) {
            var self = this,
                cells,
                $cell,
                cell;

            if (shield.ui.Button) {
                cells = $(self._tr).children("th");

                for (var i = 0; i < cells.length; i++) {
                    $cell = $(cells[i]);

                    if ($cell.attr("data-field") && ($cell.attr("data-field").replace(/[@]/g, "'") == field)) {
                        cell = cells[i];
                        break;
                    }
                }

                if ($cell && $cell.find(".sui-clear-filter-button").length === 0) {
                    var wrapperButton = $('<button type="button"><span class="sui-sprite sui-clear-filter-button-content"></span></button>')
                        .appendTo(cell);

                    // build the button with the given options
                    var btn = new shield.ui.Button(wrapperButton, {
                        cls: "sui-clear-filter-button",
                        events: {
                            click: proxy(this._clearFilterButtonClicked, this)
                        }
                    });
                }
            }
        },

        _clearFilterButtonClicked: function (e) {
            var self = this,
                element,
                field = e.target.element.parent().attr("data-field").replace(/[@]/g, "'"),
                filters = self.grid.dataSource.filter.and,
                i;

            for (i = 0; i < filters.length; i++) {
                if (filters[i].path == field) {
                    filters.splice(i, 1);
                }
            }

            element = e.target.element;
            e.target.destroy();
            element.remove();

            if (self._filters[field] != CUSTOM_FILTER) {
                self._filters[field].value(null);
            }
            else {
                self.grid.trigger(CLEARFILTER, { field: field, value: null });
            }

            self.grid.dataSource.read();
        },

        _positionListBox: function (e) {
            var self = this,
                button = e.target.element,
                offset = button.offset(),
                top = offset.top,
                left = offset.left,
                elWidth = self.listBox.element.parent().innerWidth(),
                elHeight = self.listBox.element.parent().innerHeight(),
                buttonWidth = button.innerWidth(),
                buttonHeight = button.innerHeight();

            if (left < 0) {
                left = 1;
            }

            if ((left + elWidth) > win.innerWidth) {
                left = win.innerWidth - elWidth - 20;
            }

            self._slideUp = false;

            if (top + elHeight > win.innerHeight) {
                top = top - elHeight;
                buttonHeight = 0;
                self._slideUp = true;
            }

            if (top < 0) {
                top = offset.top;
                buttonHeight = button.innerHeight();
                self._slideUp = false;
            }

            self.listBox.element.parent().css({
                position: 'absolute',
                zIndex: 10002,
                top: top + buttonHeight,
                left: left,
                height: 0,
                display: ""
            });
        },

        _setEditorValue: function(field, column, value) {
            var self = this,
                control;

            if (!column.customFilter) {
                control = self._filters[field];
                if (control) {
                    control.value(value);
                }
            }
        },

        _initializeEditor: function (cell, columnType, field, column) {
            var self = this;

            if (column.customFilter) {
                self._filters[field] = CUSTOM_FILTER;
                column.customFilter.call(self, cell);
            }
            else {
                switch (columnType) {
                    case Number:
                        self._instantiateNumeric(cell, field);
                        break;
                    case Date:
                        self._instantiateDatePicker(cell, field);
                        break;
                    case String:
                        self._instantiateTextBox(cell, field);
                        break;
                    default:
                        self._instantiateTextBox(cell, field);
                        break;
                }
            }
        },

        _instantiateNumeric: function (cell, field) {
            var self = this,
                input,
                wrapperInput = $('<input/>').appendTo(cell),
                args = self.grid.trigger(FILTERWIDGETCREATING, { field: field, options: {} }),
                options = extend({}, args.options);

            if (shield.ui.NumericTextBox) {
                input = new shield.ui.NumericTextBox(wrapperInput, options);
                self._filters[field] = input;
            }
        },

        _instantiateDatePicker: function (cell, field) {
            var self = this,
                input,
                wrapperInput = $('<input/>').appendTo(cell),
                args = self.grid.trigger(FILTERWIDGETCREATING, { field: field, options: {} }),
                options = extend({}, args.options);

            if (shield.ui.DatePicker) {
                input = new shield.ui.DatePicker(wrapperInput, options);
                self._filters[field] = input;
            }
        },

        _instantiateTextBox: function (cell, field) {
            var self = this,
                input,
                wrapperInput = $('<input type="text"/>').appendTo(cell),
                args = self.grid.trigger(FILTERWIDGETCREATING, { field: field, options: {} }),
                options = extend({}, args.options);

            if (shield.ui.TextBox) {
                input = new shield.ui.TextBox(wrapperInput, options);
                self._filters[field] = input;
            }
        },

        destroy: function () {
            var self = this,
                key;

            // WARNING: making this null might nullify other grid references
            //self.grid = null;

            for (key in self._filters) {
                if (self._filters.hasOwnProperty(key)) {
                    if (self._filters[key] != CUSTOM_FILTER) {
                        self._filters[key].destroy();
                    }
                    self._filters[key] = null;
                }
            }

            if (self.listBox) {
                self.listBox.destroy();
                self.listBox = null;
            }

            $(self._menuWrapper).remove();
            $(self._tr).remove();

            $(doc).off(CLICK + self._eventNS);

            self._filterByField = self._filters = self._slideUp = self._menuWrapper = self._tr = null;
        }
    });


    // Sorting class
    var Sorting = Class.extend({
        init: function (options, grid) {
            var self = this;

            self.grid = grid;
            self.sortExpressions = [];

            self._eventNS = ".shieldGridSorting" + iid();

            if (isBoolean(options)) {
                self.allowUnsort = true;
                self.multiple = false;
                self.firstAscending = true;
                self.ascText = "&#9650;";
                self.descText = "&#9660;";
            }
            else if (isObject(options)) {
                self.allowUnsort = isUndefined(options.allowUnsort) ? true : options.allowUnsort;
                self.multiple = options.multiple;
                self.firstAscending = isUndefined(options.firstAscending) ? true : options.firstAscending;
                self.ascText = isUndefined(options.ascText) ? "&#9650;" : options.ascText;
                self.descText = isUndefined(options.descText) ? "&#9660;" : options.descText;
            }

            self._initialize();
        },

        destroy: function () {
            var self = this,
                headerTable = self.grid.headerTable;

            self.allowUnsort = self.multiple = self.sortExpressions = null;
            self.length = 0;

            // remove all links added by sorting
            headerTable.find(".sui-headercell .sui-link").each(function() {
                $(this).parent().html($(this).html());
            });

            headerTable.off(self._eventNS);

            // remove all span elements in the header that have a class starting with sui-
            // (those are the up/down arrows added by the sorting)
            headerTable.find('.sui-headercell span[class^="sui-"]').remove();

            //self.grid = null;
            // WARNING: making this null might nullify other grid references
        },

        _initialize: function () {
            var self = this,
                grid = self.grid,
                dsSort = grid.dataSource.sort,
                columns = grid.columns,
                columnHeaderCells = {},
                headerCells = grid.headerTable.find(".sui-headercell"),
                i,
                j,
                currentSort;

            headerCells.each(function () {
                var headerCell = $(this),
                    fieldName = headerCell.attr('data-field'),
                    // WARNING: calling private method on Grid
                    column = grid._getColumnByField(fieldName),
                    text;

                columnHeaderCells[fieldName] = headerCell;

                if (column && column.sortable !== false) {
                    text = headerCell.html();
                    headerCell.empty();

                    // ARIA
                    headerCell.removeAttr(ARIA_SORT);

                    $('<a href="#" class="sui-link sui-unselectable" unselectable="on" tabindex="-1"/>')
                        .appendTo(headerCell)
                        .html(text);
                }
            });

            grid.headerTable.on(CLICK + self._eventNS, '.sui-link', proxy(self._clickHandler, self));

            if (dsSort) {
                for (i = 0; i < dsSort.length; i++) {
                    currentSort = dsSort[i];
                    for (j = 0; j < columns.length; j++) {
                        if (columns[j].sortable !== false) {
                            if (currentSort.path == columns[j].field) {
                                var headerCell = $(columnHeaderCells[columns[j].field]),
                                    link = headerCell.find(".sui-link"),
                                    suffix = ASCENDING,
                                    cssClass = "sui-asc",
                                    text = self.ascText;

                                if (currentSort.desc) {
                                    suffix = DESCENDING;
                                    text = self.descText;
                                    cssClass = "sui-desc";
                                }

                                // ARIA
                                $(headerCell).attr(ARIA_SORT, suffix);

                                link.addClass(cssClass);

                                $('<span class="sui-' + suffix + '">' + text + '</span>')
                                    .appendTo(link);
                            }
                        }
                    }
                }
            }
        },

        _clickHandler: function (e) {
            var self = this,
                element = $(e.target).closest(".sui-link"),
                grid = self.grid,
                // WARNING: calling private method on Grid
                column = grid._getColumnByField(element.parent().attr('data-field'));

            if (element.hasClass("sui-desc")) {
                if (self.allowUnsort && self.firstAscending) {
                    self._sortInternal(column, true, true);
                }
                else {
                    self._sortInternal(column, false, false);
                }
            }
            else if (element.hasClass("sui-asc")) {
                if (self.allowUnsort && !self.firstAscending) {
                    self._sortInternal(column, false, true);
                }
                else {
                    self._sortInternal(column, true, false);
                }
            }
            else {
                if (self.firstAscending) {
                    self._sortInternal(column, false, false);
                }
                else {
                    self._sortInternal(column, true, false);
                }
            }

            return false;
        },

        _sortInternal: function (column, desc, unsort) {
            var self = this,
                grid = self.grid,
                dataSource = grid.dataSource,
                dsSort = dataSource.sort,
                args = grid.trigger(COMMAND, { commandName: SORT, cancel: false, column: column, desc: desc, unsort: unsort });

            if (!args.cancel) {
                if (dsSort) {
                    if (!self.multiple && dsSort) {
                        dsSort.length = 0;
                    }
                    else {
                        var item = grep(dsSort, function (e) {
                            return (e.path === column.field && e.desc === (unsort ? desc : !desc));
                        });

                        if (item.length > 0) {
                            var index = inArray(item[0], dsSort);
                            dsSort.splice(index, 1);
                        }
                    }

                    if (!unsort) {
                        dsSort.push({ path: column.field, desc: desc });
                    }
                }
                else {
                    if (!unsort) {
                        dsSort = dataSource.sort = [{ path: column.field, desc: desc }];
                    }
                }

                // WARNING: calling private method on Grid
                grid._refreshOnSort();

                grid.trigger(SORT, { column: column, desc: desc, unsort: unsort });
            }
        },

        _sort: function (fieldName, desc, unsort) {
            var self = this,
                grid = self.grid,
                dataSource = grid.dataSource,
                dsSort = dataSource.sort,
                item,
                index;

            if (dsSort) {
                item = grep(dsSort, function (e) { return (e.path === fieldName && e.desc === desc); });
            }

            if (!item || item.length <= 0) {
                if (!self.multiple && dsSort) {
                    dsSort.length = 0;
                }

                if (dsSort) {
                    var shouldRefresh = false,
                        currentItem = grep(dsSort, function (e) { return (e.path === fieldName && e.desc != desc); });

                    if (currentItem && currentItem.length > 0) {
                        index = inArray(currentItem[0], dsSort);
                        dsSort.splice(index, 1);
                        shouldRefresh = true;
                    }
                    if (!unsort) {
                        dsSort.push({ path: fieldName, desc: desc });
                        shouldRefresh = true;
                    }

                    if (shouldRefresh) {
                        // WARNING: calling private method on Grid
                        grid._refreshOnSort();
                    }
                }
                else {
                    if (!unsort) {
                        dataSource.sort = [{ path: fieldName, desc: desc }];
                        // WARNING: calling private method on Grid
                        grid._refreshOnSort();
                    }
                }
            }
            else {
                if (unsort) {
                    index = inArray(item[0], dsSort);
                    dsSort.splice(index, 1);
                    // WARNING: calling private method on Grid
                    grid._refreshOnSort();
                }
            }
        }
    });


    // Selection class
    var Selection = Class.extend({
        init: function (options, grid) {
            var self = this,
                eventNS;

            eventNS = self._eventNS = ".shieldGridSelection" + iid();

            if (isBoolean(options)) {
                self.type = "row";
                self.multiple = false;
                self.toggle = false;
                self.spreadsheet = true;
                self.drawArea = false;
                self.disableTextSelection = false;
                self._selectOnMouseDown = false;
            }
            else if (isObject(options)) {
                self.type = options.type ? options.type : "row";
                self.multiple = !!options.multiple;
                self.toggle = isDefined(options.toggle) ? options.toggle : false;
                self.spreadsheet = isDefined(options.spreadsheet) ? options.spreadsheet : true;
                self.drawArea = isDefined(options.drawArea) ? options.drawArea : options.multiple;
                self.disableTextSelection = isDefined(options.disableTextSelection) ? options.disableTextSelection : false;
                self._selectOnMouseDown = !self.drawArea && (options.selectEvent == MOUSEDOWN);
            }

            self.grid = grid;
            self.lastSelected = null;

            $(grid.headerTable).add(grid.frozenHeaderTable)
                .addClass("sui-non-selectable");

            $(grid.contentTable).add(grid.frozenContentTable)
                .addClass(SELECTABLE);

            $(grid.contentTable).add(grid.frozenContentTable)
                .on(MOUSEDOWN + eventNS, proxy(self._mouseDownHandler, self))
                .on(MOUSEMOVE + eventNS, proxy(self._mouseMoveHandler, self));

            $(doc).on(MOUSEUP + eventNS, proxy(self._mouseUpHandler, self));

            // hack for IE<10, the older version of IE do not recognize user-select: none; or -ms-user-select: none;
            if (isIE) {
                $(grid.contentTable).add(grid.frozenContentTable)
                    .on(SELECTSTART + eventNS, function () { return false; });
            }

            if (self.multiple && self.drawArea) {
                self.area = $(doc.createElement('span'))
                    .addClass("sui-area sui-area-color");
            }
        },

        destroy: function () {
            var self = this,
                eventNS = self._eventNS,
                grid = self.grid;

            $(grid.contentTable).add(grid.frozenContentTable)
                .off(eventNS);

            $(doc).off(eventNS);

            if (self.area) {
                self.area.remove();
            }

            // WARNING: making this null might nullify other grid references
            //self.grid = null;

            self.type = 
                self.multiple = 
                self.lastSelected = 
                self.toggle = 
                self.spreadsheet = 
                self.area = 
                self.x = 
                self.y = 
                self.elements = null;
        },

        select: function (el) {
            var self = this,
                elements,
                elementsLen,
                curr,
                i;

            if (el) {
                elements = $(el);
                elementsLen = elements.length;
                
                if (elementsLen > 0) {
                    for (i=0; i<elementsLen; i++) {
                        curr = $(elements.get(i));

                        // select the element
                        self._selectElement(curr);

                        // if last element in the selection list, save it, so that shift selection works
                        if (i == elementsLen-1) {
                            self.lastSelected = curr;
                        }
                    }
                }

                return;
            }

            // return the selected elements from the content table 
            // (nothing from the frozen one will be returned)
            return self.grid.contentTable.find("." + SELECTED);
        },

        clear: function () {
            var self = this;

            if (self.type == "row") {
                self._clearSelectedRows();
            }
            else {
                self._clearSelectedCells();
            }
        },

        _getParentTable: function (current) {
            if (!current) {
                return undefined;
            }
            if (current[0].nodeName.toUpperCase() == "TABLE") {
                return current[0];
            }
            if (current.parent()) {
                return this._getParentTable(current.parent());
            }
        },

        _mouseDownHandler: function (e) {
            var self = this,
                grid = self.grid,
                x = e.pageX,
                y = e.pageY,
                current = $(e.target),
                parentTable = self._getParentTable(current);

            self.x = x;
            self.y = y;

            if (current[0].nodeName.toUpperCase() == "TD" && parentTable != $(grid.contentTable)[0] && parentTable != $(grid.frozenContentTable)[0]) {
                return;
            }

            if ((
                    current.hasClass("sui-cell") || current.hasClass("sui-row") || current.hasClass("sui-alt-row") || 
                    isEventTargetInsideCell(e, grid.contentTable) || isEventTargetInsideCell(e, grid.frozenContentTable)
                ) &&
                !current.hasClass("sui-detail-cell") &&
                !current.hasClass("sui-detail-row") &&
                !current.hasClass("sui-collapse-cell") &&
                !current.hasClass("sui-expand-cell") &&
                !current.hasClass("sui-expand-cell-disabled") &&
                !current.hasClass("sui-indent-cell")
            ) {
                if (self.multiple && self.drawArea) {
                    self.area
                        .appendTo(doc.body)
                        .css({
                            left: x + 1,
                            top: y + 1,
                            width: 0,
                            height: 0
                        });
                }

                $(doc).on(MOUSEMOVE + self._eventNS, proxy(self._mouseMoveHandler, self));

                if (self.drawArea || self.disableTextSelection) {
                    shield.selection(false);
                }

                self.elements = getElementsFromEvent(e, grid.contentTable, grid.frozenContentTable);

                // if event element and selection to be done on mousedown and element is not selected, perform and process it now
                if (self.elements && self._selectOnMouseDown && !elementsSelected(self.elements)) {
                    self._performAndProcessSelection(e);
                }
            }
        },

        _mouseMoveHandler: function (e) {
            var self = this,
                x = e.pageX,
                y = e.pageY,
                start = self.x,
                end = self.y,

            position = {
                left: start > x ? x : start,
                top: end > y ? y : end,
                width: abs(x - self.x),
                height: abs(y - self.y)
            };

            if (self.multiple && self.drawArea) {
                self.area.css(position);
            }

            // do we need this?
            //e.preventDefault();
        },

        _mouseUpHandler: function (e) {
            var self = this,
                area = self.area;

            $(doc).off(MOUSEMOVE + self._eventNS);

            if (self.drawArea || self.disableTextSelection) {
                shield.selection(true);
            }

            // if event element and selection not on mousedown or element is selected, perform and process it now - in the mouseup event
            if (self.elements && (!self._selectOnMouseDown || elementsSelected(self.elements))) {
                self._performAndProcessSelection(e);
            }

            if (area) {
                area.remove();
            }
        },

        _performAndProcessSelection: function(e) {
            var self = this,
                grid = self.grid,
                area = self.area,
                elements = self.elements,
                isCtrlPressed = e.ctrlKey,
                toBeSelected = [],
                viewIndices = [],
                indices = [],
                current,
                currViewIndex,
                args,
                i;

            // fire the selectionChanging command
            args = grid.trigger(COMMAND, {
                commandName: SELECTIONCHANGING,
                cancel: false
            });

            if (args.cancel) {
                self.elements = null;
                return;
            }

            self.elementsToBeSelected = [];

            if (self.type == "row") {
                self._performRowSelection(area, isCtrlPressed, elements, e);
            }
            else {
                self._performCellSelection(area, isCtrlPressed, elements, e)
            }

            for (i = 0; i < self.elementsToBeSelected.length; i++) {
                current = self.elementsToBeSelected[i];

                if (
                    (current.hasClass("sui-cell") || current.hasClass("sui-row") || current.hasClass("sui-alt-row")) &&
                    !current.hasClass("sui-detail-cell") &&
                    !current.hasClass("sui-detail-row") &&
                    !current.hasClass("sui-collapse-cell") &&
                    !current.hasClass("sui-expand-cell") &&
                    !current.hasClass("sui-expand-cell-disabled") &&
                    !current.hasClass("sui-indent-cell")
                ) {
                    // add the row and information about its indices
                    toBeSelected.push(current);

                    // add indices of the rows of the selected rows or cells
                    // WARNING: calling private method on Grid
                    currViewIndex = grid._getRowIndex(self.type == "row" ? current : $(current).parent());
                    viewIndices.push(currViewIndex);
                    indices.push(currViewIndex >= 0 ? grid.dataSource.getDataIndex(currViewIndex) : currViewIndex);
                }
            }

            args = grid.trigger(COMMAND, {
                commandName: SELECTIONCHANGED,
                cancel: false,
                toBeSelected: toBeSelected,
                viewIndices: viewIndices,
                indices: indices
            });

            if (!args.cancel) {
                for (i = 0; i < toBeSelected.length; i++) {
                    self._selectElement(toBeSelected[i]);
                }

                grid.trigger(SELECTIONCHANGED, {
                    selected: toBeSelected,
                    viewIndices: viewIndices,
                    indices: indices
                });

                self.elements = null;
            }
        },

        _performRowSelection: function (area, isCtrlPressed, elements, e) {
            var self = this;

            if ($(e.target).hasClass("sui-expand-cell") ||
                $(e.target).hasClass("sui-expand-cell-disabled") ||
                $(e.target).hasClass("sui-collapse-cell") ||
                ($(e.target) && $(e.target).parent() &&
                ($(e.target).parent().hasClass("sui-expand-cell") || $(e.target).parent().hasClass("sui-expand-cell-disabled") || $(e.target).parent().hasClass("sui-collapse-cell")))) {
                return;
            }

            if (!self.drawArea || e.type === KEYDOWN || (area && area.height() === 0 && area.width() === 0)) {
                if (self.multiple) {
                    self._processMultiRowSelection(e, elements);
                }
                else {
                    self._processSingleRowSelection(e, elements);
                }
            }
            else if (!self.multiple) {
                self._processSingleRowSelection(e, elements);
            }
            else {
                var rows = self.grid.contentTable.find(">tbody > tr"),
                    last = null;

                each(rows, function (index, item) {
                    var row = $(item),
                        top = row.offset().top;

                    if (top < e.pageY) {
                        last = item.rowIndex;
                    }
                });

                if (!isCtrlPressed) {
                    self._clearSelectedRows();
                }

                self._selectRowRange(elements.row.rowIndex, last, isCtrlPressed);
            }
        },

        _performCellSelection: function (area, isCtrlPressed, elements, e) {
            var self = this;

            if ($(e.target).hasClass("sui-expand-cell") ||
                $(e.target).hasClass("sui-expand-cell-disabled") ||
                $(e.target).hasClass("sui-collapse-cell") ||
                ($(e.target) && $(e.target).parent() &&
                ($(e.target).parent().hasClass("sui-expand-cell") || $(e.target).parent().hasClass("sui-expand-cell-disabled") || $(e.target).parent().hasClass("sui-collapse-cell")))) {
                return;
            }

            if (!self.drawArea || e.type === KEYDOWN || (area && area.height() === 0 && area.width() === 0)) {
                if (self.multiple) {
                    self._processMultiCellSelection(e, elements);
                }
                else {
                    self._processSingleCellSelection(e, elements);
                }
            }
            else if (!self.multiple) {
                self._processSingleCellSelection(e, elements);
            }
            else {
                var cells = self.grid.contentTable.find(">tbody > tr > td"),
                    toBeSelected = [],
                    i;

                each(cells, function (index, item) {
                    var cell = $(item),
                        cellWidth = cell.get(0).clientWidth,
                        cellHeight = cell.get(0).clientHeight,
                        cellTopY = cell.offset().top,
                        cellLeftY = cell.offset().left,
                        cellBottomY = cellTopY + cellHeight,
                        cellRightX = cellLeftY + cellWidth,
                        leftX = mathMin(e.pageX, self.x),
                        rightX = mathMax(e.pageX, self.x),
                        topY = mathMin(e.pageY, self.y),
                        bottomY = mathMax(e.pageY, self.y),
                        qualifyX = false,
                        qualifyY = false;

                    if (cellTopY < topY) {
                        if (cellBottomY > topY) {
                            qualifyX = true;
                        }
                    }
                    else {
                        if (cellTopY < bottomY) {
                            qualifyX = true;
                        }
                    }

                    if (cellLeftY < leftX) {
                        if (cellRightX > leftX) {
                            qualifyY = true;
                        }
                    }
                    else {
                        if (cellLeftY < rightX) {
                            qualifyY = true;
                        }
                    }

                    if (qualifyX && qualifyY) {
                        toBeSelected.push(item);
                    }
                });

                if (!isCtrlPressed) {
                    self._clearSelectedCells();
                }

                for (i = 0; i < toBeSelected.length; i++) {
                    var selectedCell = $(toBeSelected[i]);
                    if (selectedCell.hasClass(SELECTED)) {
                        self._deselectElement($(toBeSelected[i]));
                    }
                    else {
                        self.elementsToBeSelected.push($(toBeSelected[i]));
                    }
                }
            }
        },

        _selectRowRange: function (startRowIdex, endRowIndex, isCtrlPressed) {
            var self = this,
                start = mathMin(startRowIdex, endRowIndex),
                end = mathMax(startRowIdex, endRowIndex),
                contentRows = self.grid.contentTable.find(">tbody > tr"),
                i,
                contentRow;

            for (i = start; i <= end; i++) {
                contentRow = $(contentRows[i]);

                if (isCtrlPressed) {
                    if (contentRow.hasClass(SELECTED)) {
                        self._deselectElement(contentRow);
                    }
                    else {
                        self.elementsToBeSelected.push(contentRow);
                    }
                }
                else {
                    self.elementsToBeSelected.push(contentRow);
                }
            }
        },

        _clearSelectedRows: function () {
            var self = this,
                grid = self.grid;

            $(grid.frozenContentTable).find("> tbody > tr." + SELECTED).each(function() {
                self._deselectElement($(this));
            });

            $(grid.contentTable).find("> tbody > tr." + SELECTED).each(function() {
                self._deselectElement($(this));
            });
        },

        _clearSelectedCells: function () {
            var self = this,
                grid = self.grid;

            $(grid.frozenContentTable).find(">tbody > tr > td." + SELECTED).each(function() {
                self._deselectElement($(this));
            });

            $(grid.contentTable).find(">tbody > tr > td." + SELECTED).each(function() {
                self._deselectElement($(this));
            });
        },

        _processSingleRowSelection: function (e, elements) {
            var self = this,
                toggle = self.toggle,
                multiple = self.multiple,
                row = $(elements.row),
                isSelected = row.hasClass(SELECTED);

            if (!multiple) {
                self._clearSelectedRows();
            }

            if (toggle) {
                if (isSelected) {
                    self._deselectElement(row);
                }
                else {
                    self.elementsToBeSelected.push(row);
                }
            }
            else {
                self._clearSelectedRows();
                self.elementsToBeSelected.push(row);
            }

            self.lastSelected = row;
        },

        _processMultiRowSelection: function (e, elements) {
            var self = this,
                grid = self.grid,
                isCtrlPressed = e.ctrlKey,
                isShifPressed = e.shiftKey,
                row = $(elements.row);

            if (isCtrlPressed) {
                if (row.hasClass(SELECTED)) {
                    self._deselectElement(row);
                    self.lastSelected = row;
                }
                else {
                    self.elementsToBeSelected.push(row);
                    self.lastSelected = row;
                }
            }
            else if (isShifPressed) {
                var selectedRows = grid.contentTable.find(">tbody > tr." + SELECTED);

                if (self.lastSelected) {
                    var lastSelectedRow = self.lastSelected,
                        last = lastSelectedRow.get(0).rowIndex,
                        rows = grid.contentTable.find(">tbody > tr"),
                        current = row.get(0).rowIndex,
                        from = mathMin(current, last),
                        to = mathMax(current, last);

                    self._clearSelectedRows();

                    for (var i = from; i <= to; i++) {
                        if (i !== last) {
                            var currentRow = $(rows[i]);
                            self.elementsToBeSelected.push(currentRow);
                        }
                    }
                    self.elementsToBeSelected.push($(rows[last]));
                }
                else {
                    self.elementsToBeSelected.push(row);
                    self.lastSelected = row;
                }
            }
            else {
                self._processSingleRowSelection(e, elements);
            }
        },

        _processSingleCellSelection: function (e, elements) {
            var self = this,
                toggle = self.toggle,
                multiple = self.multiple,
                cell = $(elements.cell),
                isSelected = cell.hasClass(SELECTED),
                lastSelected = self.lastSelected;

            if (!multiple) {
                self._clearSelectedCells();
            }

            if (toggle) {
                if (isSelected) {
                    self._deselectElement(cell);
                }
                else {
                    self.elementsToBeSelected.push(cell);
                }
            }
            else {
                self._clearSelectedCells();
                self.elementsToBeSelected.push(cell);
            }

            self.lastSelected = cell;
        },

        _processMultiCellSelection: function (e, elements) {
            var self = this,
                grid = self.grid,
                isCtrlPressed = e.ctrlKey,
                isShifPressed = e.shiftKey,
                cell = $(elements.cell);

            if (isCtrlPressed) {
                if (cell.hasClass(SELECTED)) {
                    self._deselectElement(cell);
                    self.lastSelected = cell;
                }
                else {
                    self.elementsToBeSelected.push(cell);
                    self.lastSelected = cell;
                }
            }
            else if (isShifPressed) {
                if (self.lastSelected) {
                    var lastSelectedCell = self.lastSelected,
                        tableElement = grid.contentTable.get(0),
                        columnsLength = tableElement.rows[0].cells.length,
                        lastRowIndex = lastSelectedCell.parent().get(0).rowIndex,
                        last = lastRowIndex * columnsLength + lastSelectedCell.get(0).cellIndex,
                        cells = grid.contentTable.find(">tbody > tr > td"),
                        currentRowIndex = cell.parent().get(0).rowIndex,
                        current = currentRowIndex * columnsLength + cell.get(0).cellIndex,
                        from = mathMin(current, last),
                        to = mathMax(current, last),
                        i;

                    self._clearSelectedCells();

                    if (self.spreadsheet) {
                        var lastSelectedCellIndex = lastSelectedCell[0].cellIndex,
                            currentCellIndex = cell[0].cellIndex;

                        from = mathMin(lastSelectedCellIndex, currentCellIndex);
                        to = mathMax(lastSelectedCellIndex, currentCellIndex);

                        var fromRow = mathMin(lastRowIndex, currentRowIndex),
                            toRow = mathMax(lastRowIndex, currentRowIndex);

                        for (i = fromRow; i <= toRow; i++) {
                            var r = tableElement.rows[i],
                                j;

                            for (j = from; j <= to; j++) {
                                self.elementsToBeSelected.push($(r.cells[j]));
                            }
                        }
                    }
                    else {
                        for (i = from; i <= to; i++) {
                            if (i !== last) {
                                var currentRow = $(cells[i]);
                                self.elementsToBeSelected.push(currentRow);
                            }
                        }
                    }
                    self.elementsToBeSelected.push($(cells[last]));
                }
                else {
                    self.elementsToBeSelected.push(cell);
                    self.lastSelected = cell;
                }
            }
            else {
                self._processSingleCellSelection(e, elements);
            }
        },

        _selectElement: function (el) {
            el.addClass(SELECTED);
        },

        _deselectElement: function (el) {
            el.removeClass(SELECTED);
        }
    });


    // GroupReorder class
    var GroupReorder = Class.extend({
        options: {
            ns: ".shieldGridGroupReorder",
            returnDuration: 50,
            returnEasing: "ease-out",
            dragTreshold: 20,
            draggedTemplate: "<div style='border-color:transparent;' class='sui-grid sui-grid-core'><div class='sui-group-panel-indicator'><span class='sui-group-title'>{0}</span><span class='sui-group-close-button'></span></div></div>"
        },

        init: function (grid) {
            var self = this;

            self.grid = grid;
            self.options = extend(true, {}, GroupReorder.fn.options);

            self._eventNS = self.options.ns + iid();

            self._events(true);
        },

        _events: function (on) {
            var self = this,
                gridElement = self.grid.element;

            if (on) {
                self._downProxy = proxy(self._down, self);
                gridElement.on(MOUSEDOWN + self._eventNS, ".sui-group-panel-indicator", self._downProxy);
            }
            else {
                gridElement.off(MOUSEDOWN + self._eventNS, ".sui-group-panel-indicator", self._downProxy);
                self._downProxy = null;
            }
        },

        _down: function (e) {
            var self = this,
                // get the first element having that class, starting with the event's target
                // and traversing up in the dom through its ancestors (parents)
                target = $(e.target).closest(".sui-group-panel-indicator"),
                offset = target.offset(),
                gridEl = self.grid.element,
                gridOffset = gridEl.offset(),
                x = e.pageX,
                y = e.pageY;

            self.dataField = target.attr("data-field");

            //do not trigger for any button other than left button
            if (e.button > 1) {
                return;
            }

            self._moveProxy = proxy(self._move, self);
            self._upProxy = proxy(self._up, self);

            $(doc)
                .on(MOUSEMOVE + self._eventNS, self._moveProxy)
                .on(MOUSEUP + self._eventNS, self._upProxy);

            self.start = {
                left: x - offset.left,
                top: y - offset.top,
                x: x,
                y: y,
                target: target,
                // find the index of the target element, in the set of all header cells
                // in the parent row, skipping indent and other non sui-headercell cells
                index: target.parent().find(".sui-group-panel-indicator").index(target),
                positions: self._positions(target),
                gridPosition: {
                    left: gridOffset.left,
                    top: gridOffset.top,
                    width: gridEl.outerWidth(),
                    height: gridEl.outerHeight()
                },
                isRtl: support.isRtl(gridEl)
            };

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                options = self.options,
                dragged = self.dragged,
                start = self.start,
                x = e.pageX,
                y = e.pageY,
                treshold = options.dragTreshold;

            if (!dragged) {
                if (abs(start.x - x) > treshold || abs(start.y - y) > treshold) {
                    self.dragged = $(shieldFormat(options.draggedTemplate, start.target.html()))
                        .css({
                            position: "absolute",
                            left: x - start.left,
                            top: y - start.top,
                            zIndex: 999
                        })
                        .find("table").css("width", "auto")
                        .end()
                        .find("th")
                        .attr("style", start.target[0].style.cssText)
                        .css({
                            width: start.target.width(),
                            height: start.target.height()
                        })
                        .end()
                        .appendTo(doc.body)
                }
            }
            else {
                dragged.css({
                    left: x - start.left,
                    top: y - start.top
                });

                self.hovered = self._index(x, y);

                self._indicator();
            }
        },

        _positions: function (target) {
            var items = target.parent().children(".sui-group-panel-indicator"),
                i = 0,
                item,
                offset,
                pos = [];

            for (i; i < items.length; i++) {
                item = items.eq(i);
                offset = item.offset();

                pos.push({
                    left: offset.left,
                    top: offset.top,
                    width: item.outerWidth(),
                    height: item.outerHeight()
                });
            }

            return pos;
        },

        _index: function (x, y) {
            var start = this.start,
                gpos = start.gridPosition,
                pos,
                i,
                isOnHeader,
                isOnGrid;

            for (i = 0; i < start.positions.length; i++) {
                pos = start.positions[i];

                isOnHeader = pos.left <= x && x <= (pos.left + pos.width) && pos.top <= y && y <= (pos.top + pos.height);
                isOnGrid = gpos.left <= x && x <= (gpos.left + gpos.width) && gpos.top <= y && y <= (gpos.top + gpos.height);

                if (isOnHeader && isOnGrid) {
                    return i;
                }
            }

            return -1;
        },

        _indicator: function () {
            var self = this,
                start = self.start,
                index = self.hovered,
                position = start.positions[index],
                indicator = self.reorderIndicator,
                gridLeft = start.gridPosition.left,
                gridRight = start.gridPosition.left + start.gridPosition.width,
                items = start.target.parent().children(".sui-group-panel-indicator"),
                oppositeEdgeCondition = start.isRtl ? (start.index < index) : (start.index > index),
                indicatorX;

            items.removeClass("sui-reorder-target");

            if (indicator) {
                indicator.hide();
            }

            if (index != null && index > -1) {
                items.eq(index).addClass("sui-reorder-target");

                if (!indicator) {
                    indicator = self.reorderIndicator = $("<div class='sui-grid-reorder-indicator'><span class='sui-grid-indicator-top' /><span class='sui-grid-indicator-bottom' /></div>")
                        .appendTo(doc.body);
                }

                if (index !== start.index) {
                    indicatorX = position.left + (oppositeEdgeCondition ? 0 : position.width);

                    indicator.css({
                        left: mathMin(mathMax(gridLeft, indicatorX), gridRight),
                        top: position.top,
                        height: position.height
                    }).show();
                }
            }
        },

        _up: function (e) {
            var self = this,
                options = self.options,
                grid = self.grid,
                dragged = self.dragged,
                start = self.start,
                newIndex = self.hovered,
                commandArgs,
                dataField = self.dataField;

            self._detachDocumentEvents();
            if (dragged) {
                if (newIndex != null && newIndex > -1) {
                    dragged.remove();

                    commandArgs = grid.trigger(COMMAND, { commandName: GROUPSREORDER, cancel: false, index: start.index, newIndex: newIndex });

                    if (!commandArgs.cancel) {
                        var groups = grid.dataSource.group;

                        for (var i = 0; i < groups.length; i++) {
                            if (groups[i].field == dataField) {
                                var tmp = groups[i];
                                groups[i] = groups[newIndex];
                                groups[newIndex] = tmp;
                                break;
                            }
                        }
                    }
                }
                else {
                    //animate return
                    setTimeout(function () {
                        dragged.remove();
                    }, support.transitions ? options.returnDuration : 0);

                    if (self.grid.dataSource.group) {
                        commandArgs = grid.trigger(COMMAND, { commandName: UNGROUP, cancel: false, field: dataField });

                        if (!commandArgs.cancel) {
                            self.grid.ungroup(dataField);
                            grid.trigger(UNGROUP, commandArgs);
                        }
                    }
                }
            }

            self.dragged = self.dataField = self.hovered = newIndex = null;

            self._indicator();

            if (self.reorderIndicator) {
                self.reorderIndicator.remove();
                self.reorderIndicator = null;
            }

            self.start = null;

            $(doc).off(self._eventNS);

            shield.selection(true);

            if (commandArgs && !commandArgs.cancel) {
                delete commandArgs.cancel;
                delete commandArgs.commandName;
                grid.dataSource.read();
                grid.trigger(GROUPSREORDER, commandArgs);
            }
        },

        _detachDocumentEvents: function () {
            var self = this;

            self._moveProxy = self._upProxy = null;

            $(doc).off(self._eventNS);
        },

        destroy: function () {
            var self = this;

            self.dataField = null;
            self._detachDocumentEvents();
            self._events(false);
        }
    });

    // ColumnGroupReorder class
    var ColumnGroupReorder = Class.extend({
        options: {
            ns: ".shieldGridColumnGroupReorder",
            returnDuration: 150,
            returnEasing: "ease-out",
            dragTreshold: 20,
            draggedTemplate: "<div class='sui-grid sui-grid-core'><div class='sui-gridheader'><table class='sui-table'><thead><tr class='sui-columnheader'><th class='sui-headercell'>{0}</th></tr></thead></table></div></div>"
        },

        init: function (grid) {
            var self = this;
            self.grid = grid;
            self.options = extend(true, {}, ColumnReorder.fn.options);

            // make the event ns unique
            self._eventNS = self.options.ns + iid();

            self._events(true);
            grid.headerTable.addClass("sui-reorderable");
        },

        _events: function (on) {
            var self = this,
                gridElement = self.grid.element;

            if (on) {
                self._downProxy = proxy(self._down, self);
                gridElement.on(MOUSEDOWN + self._eventNS, ".sui-headercell", self._downProxy);
            }
            else {
                gridElement.off(MOUSEDOWN + self._eventNS, ".sui-headercell", self._downProxy);
                self._downProxy = null;
            }
        },

        _down: function (e) {
            var self = this,
                // get the first element having that class, starting with the event's target
                // and traversing up in the dom through its ancestors (parents)
                target = $(e.target).closest(".sui-headercell"),
                offset = target.offset(),
                gridEl = self.grid.element,
                gridOffset = gridEl.offset(),
                x = e.pageX,
                y = e.pageY;

            //do not trigger for any button other than left button
            if (e.button > 1) {
                return;
            }

            var field = target.attr("data-field");
            var groups = self.grid.dataSource.group;
            if (groups) {
                for (var j = 0; j < groups.length; j++) {
                    if (field === groups[j].field) {
                        return;
                    }
                }
            }

            $(doc)
                .on(MOUSEMOVE + self._eventNS, proxy(self._move, self))
                .on(MOUSEUP + self._eventNS, proxy(self._up, self));

            self.start = {
                left: x - offset.left,
                top: y - offset.top,
                x: x,
                y: y,
                target: target,
                index: 1000,
                positions: self._positions(target),
                gridPosition: {
                    left: gridOffset.left,
                    top: gridOffset.top,
                    width: gridEl.outerWidth(),
                    height: gridEl.outerHeight()
                },
                isRtl: support.isRtl(gridEl)
            };

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                options = self.options,
                dragged = self.dragged,
                start = self.start,
                x = e.pageX,
                y = e.pageY,
                treshold = options.dragTreshold;


            if (!dragged) {
                if (abs(start.x - x) > treshold || abs(start.y - y) > treshold) {
                    self.dragged = $(shieldFormat(options.draggedTemplate, start.target.html()))
                        .css({
                            position: "absolute",
                            left: x - start.left,
                            top: y - start.top,
                            zIndex: 999
                        })
                        .find("table").css("width", "auto")
                        .end()
                        .find("th")
                        .attr("style", start.target[0].style.cssText)
                        .css({
                            width: start.target.width(),
                            height: start.target.height()
                        })
                        .end()
                        .appendTo(doc.body)
                }
            }
            else {
                dragged.css({
                    left: x - start.left,
                    top: y - start.top
                });

                self.hovered = self._index(x, y);
                self._indicator();
            }
        },

        _positions: function (target) {
            var items = this.grid.element.find(".sui-group-panel-indicator"),
                i = 0,
                item,
                offset,
                pos = [];

            for (i; i < items.length; i++) {
                item = items.eq(i);
                offset = item.offset();

                pos.push({
                    left: offset.left,
                    top: offset.top,
                    width: item.outerWidth(),
                    height: item.outerHeight()
                });
                if (i == items.length - 1) {
                    pos.push({
                        left: offset.left,
                        top: offset.top,
                        width: item.outerWidth(),
                        height: item.outerHeight()
                    });
                }
            }

            return pos;
        },

        _index: function (x, y) {
            var start = this.start,
                gpos = start.gridPosition,
                pos,
                i,
                isOnHeader,
                isOnGroupPanel,
                groupPanel = this.grid.element.find(".sui-group-panel"),
                isOnGrid;

            if (start.positions.length > 0) {
                for (i = 0; i < start.positions.length; i++) {
                    pos = start.positions[i];

                    isOnHeader = pos.left <= x && x <= (pos.left + pos.width) && pos.top <= y && y <= (pos.top + pos.height);
                    isOnGrid = gpos.left <= x && x <= (gpos.left + gpos.width) && gpos.top <= y && y <= (gpos.top + gpos.height);

                    isOnGroupPanel = groupPanel.offset().left <= x && x <= (groupPanel.offset().left + groupPanel.width()) && groupPanel.offset().top <= y && y <= (groupPanel.offset().top + groupPanel.height());

                    if (isOnHeader && isOnGrid) {
                        return i;
                    }
                }
            }
            else {
                isOnGroupPanel = groupPanel.offset().left <= x && x <= (groupPanel.offset().left + groupPanel.width()) && groupPanel.offset().top <= y && y <= (groupPanel.offset().top + groupPanel.height());
            }

            if (isOnGroupPanel) {
                this.isOnGroupPanel = true;
                return this.grid.element.find(".sui-group-panel-indicator").length;
            }

            return -1;
        },

        _indicator: function () {
            var self = this,
                start = self.start,
                index = self.hovered,
                position = start.positions[index],
                indicator = self.reorderIndicator,
                gridLeft = start.gridPosition.left,
                gridRight = start.gridPosition.left + start.gridPosition.width,
                items = start.target.parent().children(".sui-group-panel-indicator"),
                oppositeEdgeCondition = start.isRtl ? (start.index < index) : (start.index > index),
                indicatorX;

            items.removeClass("sui-reorder-target");

            if (indicator) {
                indicator.hide();
            }

            if (index != null && index > -1) {
                items.eq(index).addClass("sui-reorder-target");

                if (!indicator) {
                    indicator = self.reorderIndicator = $("<div class='sui-grid-reorder-indicator'><span class='sui-grid-indicator-top' /><span class='sui-grid-indicator-bottom' /></div>")
                        .appendTo(doc.body);
                }
                if (this.isOnGroupPanel) {
                    oppositeEdgeCondition = false;
                }
                if (position) {
                    indicatorX = position.left + (oppositeEdgeCondition ? 0 : position.width);
                    this.isOnGroupPanel = null;
                    indicator.css({
                        left: mathMin(mathMax(gridLeft, indicatorX), gridRight),
                        top: position.top,
                        height: position.height
                    }).show();
                }
                else {
                    indicatorX = gridLeft + (!oppositeEdgeCondition ? 0 : start.gridPosition.width);
                    this.isOnGroupPanel = null;
                    indicator.css({
                        left: indicatorX,
                        top: start.gridPosition.top,
                        height: self.grid.element.find(".sui-group-panel-empty").outerHeight()
                    }).show();
                }
            }
        },

        _up: function (e) {
            var self = this,
                options = self.options,
                grid = self.grid,
                dragged = self.dragged,
                start = self.start,
                newIndex = self.hovered,
                commandArgs;

            if (dragged) {
                dragged
                    .css({
                        left: start.x - start.left,
                        top: start.y - start.top,
                        transition: shieldFormat("left {0} {1}ms, top {0} {1}ms", options.returnEasing, options.returnDuration)
                    });

                if (newIndex != null && newIndex > -1) {
                    dragged.remove();
                    var dataField = start.target.attr("data-field");

                    commandArgs = grid.trigger(COMMAND, { commandName: GROUP, cancel: false, field: dataField, index: newIndex });

                    if (!commandArgs.cancel) {
                        grid.group(dataField, newIndex, "asc");
                    }
                }
                else {
                    //animate return
                    setTimeout(function () {
                        dragged.remove();
                    }, support.transitions ? options.returnDuration : 0);
                }
            }

            self.dragged = self.hovered = newIndex = null;

            self._indicator();

            if (self.reorderIndicator) {
                self.reorderIndicator.remove();
                self.reorderIndicator = null;
            }

            self.start = null;

            $(doc).off(self._eventNS);

            shield.selection(true);

            if (commandArgs && !commandArgs.cancel) {
                delete commandArgs.cancel;
                delete commandArgs.commandName;
                grid.dataSource.read();
                grid.trigger(GROUP, commandArgs);
            }
        },

        destroy: function () {
            this._events(false);
            this.grid.headerTable.removeClass("sui-reorderable");
        }
    });

    // ColumnReorder class
    var ColumnReorder = Class.extend({
        options: {
            ns: ".shieldGridColumnReorder",
            returnDuration: 150,
            returnEasing: "ease-out",
            dragTreshold: 20,
            draggedTemplate: "<div class='sui-grid sui-grid-core'><div class='sui-gridheader'><table class='sui-table'><thead><tr class='sui-columnheader'><th class='sui-headercell'>{0}</th></tr></thead></table></div></div>"
        },

        init: function (grid) {
            var self = this;
            self.grid = grid;
            self.options = extend(true, {}, ColumnReorder.fn.options);

            self._eventNS = self.options.ns + iid();

            self._events(true);
            grid.headerTable.addClass("sui-reorderable");
        },

        _events: function (on) {
            var self = this,
                gridElement = self.grid.element;

            if (on) {
                self._downProxy = proxy(self._down, self);
                gridElement.on(MOUSEDOWN + self._eventNS, ".sui-headercell", self._downProxy);
            }
            else {
                gridElement.off(MOUSEDOWN + self._eventNS, ".sui-headercell", self._downProxy);
                self._downProxy = null;
            }
        },

        _down: function (e) {
            var self = this,
                // get the first element having that class, starting with the event's target
                // and traversing up in the dom through its ancestors (parents)
                target = $(e.target).closest(".sui-headercell"),
                offset = target.offset(),
                gridEl = self.grid.element,
                gridOffset = gridEl.offset(),
                x = e.pageX,
                y = e.pageY;

            // do not trigger for any button other than left button
            if (e.button > 1) {
                return;
            }

            $(doc)
                .on(MOUSEMOVE + self._eventNS, proxy(self._move, self))
                .on(MOUSEUP + self._eventNS, proxy(self._up, self));

            self.start = {
                left: x - offset.left,
                top: y - offset.top,
                x: x,
                y: y,
                target: target,
                // find the index of the target element, in the set of all header cells
                // in the parent row, skipping indent and other non sui-headercell cells
                index: target.parent().find(".sui-headercell").index(target),
                positions: self._positions(target),
                gridPosition: {
                    left: gridOffset.left,
                    top: gridOffset.top,
                    width: gridEl.outerWidth(),
                    height: gridEl.outerHeight()
                },
                isRtl: support.isRtl(gridEl)
            };

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                options = self.options,
                dragged = self.dragged,
                start = self.start,
                x = e.pageX,
                y = e.pageY,
                treshold = options.dragTreshold;

            if (!dragged) {
                if (abs(start.x - x) > treshold || abs(start.y - y) > treshold) {
                    self.dragged = $(shieldFormat(options.draggedTemplate, start.target.html()))
                        .css({
                            position: "absolute",
                            left: x - start.left,
                            top: y - start.top,
                            zIndex: 999
                        })
                        .find("table").css("width", "auto")
                        .end()
                        .find("th")
                        .attr("style", start.target[0].style.cssText)
                        .css({
                            width: start.target.width(),
                            height: start.target.height()
                        })
                        .end()
                        .appendTo(doc.body)
                }
            }
            else {
                dragged.css({
                    left: x - start.left,
                    top: y - start.top
                });

                self.hovered = self._index(x, y);

                self._indicator();
            }
        },

        _positions: function (target) {
            var items = target.parent().children(".sui-headercell"),
                i = 0,
                item,
                offset,
                pos = [];

            for (i; i < items.length; i++) {
                item = items.eq(i);
                offset = item.offset();

                pos.push({
                    left: offset.left,
                    top: offset.top,
                    width: item.outerWidth(),
                    height: item.outerHeight()
                });
            }

            return pos;
        },

        _index: function (x, y) {
            var start = this.start,
                gpos = start.gridPosition,
                pos,
                i,
                isOnHeader,
                isOnGrid;

            for (i = 0; i < start.positions.length; i++) {
                pos = start.positions[i];

                isOnHeader = pos.left <= x && x <= (pos.left + pos.width) && pos.top <= y && y <= (pos.top + pos.height);
                isOnGrid = gpos.left <= x && x <= (gpos.left + gpos.width) && gpos.top <= y && y <= (gpos.top + gpos.height);

                if (isOnHeader && isOnGrid) {
                    return i;
                }
            }

            return -1;
        },

        _indicator: function () {
            var self = this,
                start = self.start,
                index = self.hovered,
                position = start.positions[index],
                indicator = self.reorderIndicator,
                gridLeft = start.gridPosition.left,
                gridRight = start.gridPosition.left + start.gridPosition.width,
                items = start.target.parent().children(".sui-headercell"),
                oppositeEdgeCondition = start.isRtl ? (start.index < index) : (start.index > index),
                indicatorX;

            items.removeClass("sui-reorder-target");

            if (indicator) {
                indicator.hide();
            }

            if (index != null && index > -1) {
                items.eq(index).addClass("sui-reorder-target");

                if (!indicator) {
                    indicator = self.reorderIndicator = $("<div class='sui-grid-reorder-indicator'><span class='sui-grid-indicator-top' /><span class='sui-grid-indicator-bottom' /></div>")
                        .appendTo(doc.body);
                }

                if (index !== start.index) {
                    indicatorX = position.left + (oppositeEdgeCondition ? 0 : position.width);

                    indicator.css({
                        left: mathMin(mathMax(gridLeft, indicatorX), gridRight),
                        top: position.top,
                        height: position.height
                    }).show();
                }
            }
        },

        _up: function (e) {
            var self = this,
                options = self.options,
                grid = self.grid,
                dragged = self.dragged,
                start = self.start,
                newIndex = self.hovered,
                commandArgs;

            if (dragged) {
                dragged
                    .css({
                        left: start.x - start.left,
                        top: start.y - start.top,
                        transition: shieldFormat("left {0} {1}ms, top {0} {1}ms", options.returnEasing, options.returnDuration)
                    });

                if (newIndex != null && newIndex > -1) {
                    dragged.remove();

                    commandArgs = grid.trigger(COMMAND, { commandName: COLUMNREORDER, cancel: false, index: start.index, newIndex: newIndex });

                    if (!commandArgs.cancel) {
                        grid.reorderColumn(start.index, newIndex);
                    }
                }
                else {
                    //animate return
                    setTimeout(function () {
                        dragged.remove();
                    }, support.transitions ? options.returnDuration : 0);
                }
            }

            self.dragged = self.hovered = newIndex = null;

            self._indicator();

            if (self.reorderIndicator) {
                self.reorderIndicator.remove();
                self.reorderIndicator = null;
            }

            self.start = null;

            $(doc).off(self._eventNS);

            shield.selection(true);

            if (commandArgs && !commandArgs.cancel) {
                delete commandArgs.cancel;
                delete commandArgs.commandName;

                grid.trigger(COLUMNREORDER, commandArgs);
            }
        },

        destroy: function () {
            this._events(false);
            this.grid.headerTable.removeClass("sui-reorderable");
        }
    });


    // Grid class encapsulating the main grid logic
    var Grid = Widget.extend({
        // initialization method, called by the framework
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this;

            self._eventNS = ".shieldGrid" + self.getInstanceId();

            self.refresh();

            
        },

        // destructor
        destroy: function () {
            this._destroyInternal();
            Widget.fn.destroy.call(this);
        },

        _destroyInternal: function () {
            var self = this,
                options = self.options,
                i,
                key,
                el,
                eventNS = self._eventNS;

            //when the grid is never initialized, there's nothing to destroy
            if (!self.contentWrapper) {
                return;
            }

            if (self._markedCells) {
                for (key in self._markedCells) {
                    if (self._markedCells.hasOwnProperty(key)) {
                        self._markedCells[key].length = 0;
                    }
                }
                self._markedCells = null;
            }

            $(win).off(eventNS);

            self._destroyFrozenContainers();

            if (self.sorting) {
                self.sorting.destroy();
                self.sorting = null;
            }

            if (self.virtualizedContainer) {
                self.virtualizedContainer.destroy();
                self.virtualizedContainer = null;
            }

            if (self.columns) {
                for (i = 0; i < self.columns.length; i++) {
                    self.columns[i].destroy();
                }
            }

            if (self.contentWrapper) {
                self.contentWrapper.off(SCROLL);
            }

            self.scrollableWrapper = null;

            if (self._selectable) {
                self._selectable.destroy();
                self._selectable = null;
            }

            if (options.scrolling) {
                self.contentWrapper.parent().remove();
                self.headerWrapper.parent().remove();
            }
            else {
                self.contentWrapper.remove();
                self.headerWrapper.remove();
            }

            if (self._hasDetailTemplate()) {
                self.contentTable.off(eventNS);
            }

            if (self.popupWindow) {
                self.popupWindow.destroy();
            }

            if (self._footer) {
                $(self._footer).remove();
                self._footer = null;
            }

            self.columns =
                self._gridColumns =
                self._windowEditingIndex =
                self.contentWrapper =
                self.headerWrapper =
                self.contentTable =
                self.hederTable = null;

            if (self._buttons) {
                for (i = 0; i < self._buttons.length; i++) {
                    el = self._buttons[i].button.element;
                    self._buttons[i].button.destroy();
                    el.remove();
                }
                self._buttons.length = 0;
            }

            if (self.pager) {
                self.pager.destroy();
                self.pager = null;

                if (self.pagerWrapper) {
                    self.pagerWrapper.parent().remove();
                    self.pagerWrapper = null;
                }
            }

            if (self.loadingPanel) {
                self.loadingPanel = null;
                clearTimeout(self.loadingPanelTimeout);
                self.loadingPanelTimeout = null;
            }

            if (self._columnResizing) {
                self._columnResizing.destroy();
                self._columnResizing = null;
            }

            if (self._toolbar) {
                self._toolbar.destroy();
                self._toolbar = null;
            }

            if (self._editing) {
                self._editing.destroy();
                self._editing = null;
            }

            if (self._columnReorder) {
                self._columnReorder.destroy();
                self._columnReorder = null;
            }

            self._sortingInProgress =
                self._loadingVirtualRows = 
                self._scrollLeft =
                self._scrollTop =
                self._populateInsertedItem =
                self._preventClosingEditors =
                self._editingInProcess = null;

            if (self._filter) {
                self._filter.destroy();
                self._filter = null;
            }

            if (self._groupReorder) {
                self._groupReorder.destroy();
                self._groupReorder = null;
            }

            if (self._columnGroupReorder) {
                self._columnGroupReorder.destroy();
                self._columnGroupReorder = null;
            }

            // unbind all DS events added by this instance
            // NOTE: do not destroy the data source
            self.dataSource.off(eventNS);

            self.element
                .off(eventNS)
                .removeClass("sui-grid sui-grid-core")
                .css(HEIGHT, "")
                .empty();
        },

        

        _resizeHandler: function () {
            var self = this;

            // for frozen
            self._adjustWidthsLocked();
            self._adjustHeightsLocked();

            // NOTE: do not reinitialize scrolling, because if we have virtual scrolling,
            // it will reset the grid and scroll to the top, losing the current scroll
            //if (this.options.scrolling) {
            //    this._scrolling();
            //}
        },

        _hasDetailTemplate: function () {
            var options = this.options;
            return options.detailTemplate || (options.events && options.events.detailCreated);
        },

        _hasVirtualScrolling: function () {
            var options = this.options;
            return options.scrolling && options.scrolling.virtual && !options.paging && !this._hasDetailTemplate();
        },

        _canExpandCollapse: function () {
            return this.options.detailExpandCollapse !== false;
        },

        _resolveColumns: function (columns) {
            var self = this,
                i;

            self.columns = [];

            if (is.array(columns)) {
                for (i=0; i<columns.length; i++) {
                    self.columns.push(new Column(columns[i]));
                }
            }
            else {
                // error when columns are not array
                shield.error("Invalid columns declaration. The columns have to be array.", self.options.dieOnError);
            }

            // initialize the _gridColumns internal dict
            self._gridColumns = {};
            for (i=0; i<self.columns.length; i++) {
                self._gridColumns[self.columns[i].field] = {
                    index: i
                };
            }
        },

        _createWrappers: function () {
            var self = this,
                element = self.element,
                contentWrapper,
                headerWrapper;

            self._wrapper();

            contentWrapper = $("<div/>").prependTo(element);
            contentWrapper.addClass("sui-gridcontent");

            headerWrapper = $("<div/>").prependTo(element);
            headerWrapper.addClass("sui-gridheader");

            if (!self.options.showHeader) {
                headerWrapper.css(DISPLAY, NONE);
                contentWrapper.addClass("sui-no-header");
            }

            self.headerWrapper = headerWrapper;
            self.contentWrapper = contentWrapper;
        },

        _wrapper: function () {
            var height = this.options.height,
                element = this.element;

            if (!element.is("div")) {
                element = element.wrap("<div/>").parent();
            }

            element.addClass("sui-grid sui-grid-core");

            if (element) {
                element.css(HEIGHT, height);
            }
        },

        _createGroupPanel: function () {
            var self = this,
                grouping = self.options.grouping,
                groupHeaderElement,
                group,
                groupPanel,
                shouldAttachGroupreordering = false,
                dataSource = self.dataSource,
                i;

            groupPanel = self.element.find(".sui-group-panel");
            if (groupPanel.length > 0) {
                groupPanel.remove();
            }

            if (grouping.showGroupHeader) {
                if (!dataSource.group ||
                    dataSource.group.length === 0) {
                    $(self.element).prepend($('<div class="sui-group-panel sui-group-panel-empty">' + grouping.message + "</div>"));
                }
                else {
                    groupHeaderElement = $('<div class="sui-group-panel"/>');

                    $(self.element).prepend(groupHeaderElement);

                    for (i = 0; i < dataSource.group.length; i++) {
                        group = dataSource.group[i];
                        self._createGroupHeaderIndicator(group, groupHeaderElement);
                        shouldAttachGroupreordering = true;
                    }

                    if (shouldAttachGroupreordering && grouping.allowDragToGroup) {
                        if (self._groupReorder) {
                            self._groupReorder.destroy();
                        }
                        self._groupReorder = new GroupReorder(self);

                        if (self._columnGroupReorder) {
                            self._columnGroupReorder.destroy();
                        }
                        self._columnGroupReorder = new ColumnGroupReorder(self);
                    }
                }
            }
        },

        _createGroupHeaderIndicator: function (group, groupHeaderElement) {
            var self = this,
                closeButton,
                sortButton,
                indicator;

            indicator = $('<div class="sui-group-panel-indicator" data-field="' + group.field + '"/>')
                .appendTo(groupHeaderElement);

            if (group.order == "desc") {
                sortButton = $('<span class="sui-descending">&#9660;</span>')
                    .appendTo(indicator);
            }
            else {
                sortButton = $('<span class="sui-ascending">&#9650;</span>')
                    .appendTo(indicator);
            }

            $('<span class="sui-group-title">' + group.field + '</span>')
                .appendTo(indicator);

            if (self.options.grouping.allowDragToGroup) {
                closeButton = $('<span class="sui-group-close-button">&#10006;</span>')
                    .appendTo(indicator);
                closeButton.on(CLICK, self._closeButtonClicked = proxy(self._closeButtonClickedHandler, self));
            }
            sortButton.on(CLICK, proxy(self._sortButtonClickedHandler, self));
        },

        _sortButtonClickedHandler: function (e) {
            var self = this,
                target = $(e.currentTarget),
                field = target.parent().attr("data-field"),
                groups = self.dataSource.group;

            for (var i = 0; i < groups.length; i++) {
                if (groups[i].field == field) {
                    if (target.hasClass("sui-descending")) {
                        groups[i].order = "asc";
                    }
                    else {
                        groups[i].order = "desc";
                    }
                    self.dataSource.read();
                }
            }
        },

        _closeButtonClickedHandler: function (e) {
            var self = this,
                target = $(e.currentTarget),
                commandArgs,
                field = target.parent().attr("data-field");

            if (self.dataSource.group) {
                commandArgs = self.trigger(COMMAND, { commandName: UNGROUP, cancel: false, field: field });

                if (!commandArgs.cancel) {
                    self.ungroup(field);
                    self.trigger(UNGROUP, commandArgs);
                }
            }
        },

        _createHeaderTable: function () {
            var self = this,
                headerWrapper = self.headerWrapper,
                table = self.element;

            // when the grid is not initialized from table
            if (!table.is("table")) {
                table = headerWrapper.children("table");

                if (!table.length) {
                    table = $("<table/>").appendTo(headerWrapper);
                }
            }

            if (isIE7) {
                table.attr("cellspacing", 0);
            }

            table.addClass("sui-table");

            self.headerTable = table;

            self._createTbody(table, true);
            self._createThead(table);
            self._createFakeRow(table, self.columns.length);
        },

        _createContentTable: function () {
            var self = this,
                options = self.options,
                contentWrapper = self.contentWrapper,
                table = self.element;

            // when the grid is not initialized from table
            if (!table.is("table")) {
                table = contentWrapper.children("table");

                if (!table.length) {
                    table = $("<table/>").appendTo(contentWrapper);
                }
            }

            if (isIE7) {
                table.attr("cellspacing", 0);
            }

            table.addClass("sui-table");

            if (options.rowHover) {
                table.addClass("sui-hover");
            }

            if (self._hasDetailTemplate()) {
                if (self._canExpandCollapse()) {
                    table.addClass("sui-expandable");
                }

                // NOTE: find the proper cells - only those for the main grid (and not for nested ones)
                table.on(
                    CLICK + self._eventNS, 
                    "> tbody > tr > .sui-expand-cell, > tbody > tr > .sui-collapse-cell", 
                    proxy(self._expandCollapseDetailTemplate, self)
                );
            }

            self.contentTable = table;

            self._createTbody(self.contentTable, false);
        },

        _createTbody: function (table, isHeader) {
            var tbody = table.find("> tbody");

            if (!tbody.length) {
                tbody = $("<tbody/>").appendTo(table);
            }

            if (isHeader) {
                tbody.addClass("sui-hide");
            }

            table.tbody = tbody;
        },

        _createThead: function (table) {
            var self = this,
                options = self.options,
                columns = self.columns,
                idx,
                length,
                html = "",
                thead = table.find(">thead"),
                tr,
                th,
                text,
                focusable;

            if (!thead.length) {
                thead = $("<thead/>").insertBefore(table.tbody);
            }

            tr = table.find("tr:has(th):first");

            if (!tr.length) {
                tr = thead.children().first();
                if (!tr.length) {
                    tr = $('<tr/>').appendTo(thead);
                }
            }

            // ARIA
            tr.attr(ROLE, "row");

            // empty the tr
            tr.empty();

            // create the column th-s
            for (idx = 0, length = columns.length; idx < length; idx++) {
                th = columns[idx];
                text = th.headerTemplate || th.title || th.field || th;

                if (columns[idx].sortable) {
                    focusable = true;
                }
                else {
                    focusable = false;
                }

                html += '<th ' + normalizeAttributes(th.headerAttributes) + ' data-field="' + columns[idx].field + '" role="columnheader"' + 
                    (focusable ? ' tabindex="-1"' : '') + '>' + text + '</th>';
            }
            tr.html(html);

            tr.addClass("sui-columnheader");
            tr.find("th").addClass("sui-headercell");

            // prepend an indent cell when there is detail template.
            if (columns.length && self._hasDetailTemplate() && self._canExpandCollapse()) {
                var indentCell = $('<th class="sui-indent-cell"/>');
                if (isIE7) {
                    indentCell.html("&nbsp;");
                }
                indentCell.prependTo(tr);
            }

            table.thead = thead;
        },

        _createFakeRow: function (table, count) {
            var tbody = table.find(">tbody"),
                fakeRow,
                i;

            if (tbody.length) {
                fakeRow = $("<tr/>");

                for (i = 0; i < count; i++) {
                    $("<td/>").appendTo(fakeRow);
                }

                fakeRow.appendTo(tbody);
            }
        },

        _createColgroup: function (table) {
            var self = this,
                options = self.options,
                columns = self.columns,
                colgroup = table.find(">colgroup"),
                i,
                len,
                width;

            if (!colgroup.length) {
                colgroup = $("<colgroup/>")
                    .prependTo(table);
            }

            // empty the colgroup contents
            colgroup.html("");

            // Add indent cell when there is detail template.
            if (options.columns.length && self._hasDetailTemplate() && self._canExpandCollapse()) {
                $('<col class="sui-indent-col"/>').appendTo(colgroup);
            }

            for (i = 0, len = columns.length; i < len; i++) {
                width = columns[i].width;

                $((width && parseInt(width, 10) !== 0) ? shieldFormat('<col style="width:{0}"/>', isString(width) ? width : width + "px") : '<col/>')
                    .data(SUI_FIELDNAME, columns[i].field)
                    .appendTo(colgroup);
            }
        },

        scrollTop: function(value) {
            var self = this,
                options = self.options,
                scrolling = options.scrolling,
                virtual = self._hasVirtualScrolling(),
                contentWrapper = self.contentWrapper;

            if (scrolling) {
                if (isDefined(value)) {
                    // setter
                    if (virtual) {
                        // virtual scrolling
                        if (self.virtualizedContainer) {
                            self.virtualizedContainer.scrollTop(value);
                        }
                    }
                    else {
                        // normal scrolling
                        $(contentWrapper).scrollTop(value);
                    }
                }
                else {
                    // getter
                    if (virtual) {
                        // virtual scrolling
                        if (self.virtualizedContainer) {
                            return self.virtualizedContainer.scrollTop();
                        }
                    }
                    else {
                        // normal scrolling
                        return $(contentWrapper).scrollTop();
                    }
                }
            }
        },

        _scrolling: function () {
            var self = this,
                options = self.options,
                element = $(self.element),
                isRtl = support.isRtl(element),
                dataSource = self.dataSource,
                virtual = self._hasVirtualScrolling(),
                headerWrapper = self.headerWrapper,
                contentWrapper = self.contentWrapper,
                headerHeight = headerWrapper.outerHeight(),
                autoHeight = !virtual && (options.height === "auto" || !isDefined(options.height)),
                maxHeight = (!virtual && isDefined(options.maxHeight)) ? parseInt(options.maxHeight, 10) : UNDEFINED,
                elementHeight,
                wrapperHeight,
                pagerHeight = 0,
                toolbarsHeight = 0,
                groupingHeight = 0,
                scrollableWrapper;

            // do not over-initialize, if the scrolling containers have already been created
            if (!headerWrapper.parent().hasClass("sui-gridheader sui-scrolldiv")) {
                headerWrapper.addClass("sui-headercontent").removeClass("sui-gridheader");
                headerWrapper.wrap('<div class="sui-gridheader sui-scrolldiv"/>');

                contentWrapper.addClass("sui-content").removeClass("sui-gridcontent");
                contentWrapper.wrap('<div class="sui-gridcontent sui-scroller"/>');

                if (isIE7) {
                    self.headerTable.addClass("sui-table-ie7").removeClass("sui-table");
                    self.contentTable.addClass("sui-table-ie7").removeClass("sui-table");
                }

                scrollableWrapper = self.scrollableWrapper = virtual ? contentWrapper.parent() : contentWrapper;

                scrollableWrapper.on(SCROLL, proxy(self._onscroll, self));
            }
            else {
                headerHeight = headerWrapper.parent().outerHeight();
            }

            if (self.pagerWrapper) {
                pagerHeight = self.pagerWrapper.outerHeight();
            }

            if (self._toolbar) {
                var toolbars = element.find(".sui-toolbar"),
                    sum = 0,
                    i;

                for (i = 0; i < toolbars.length; i++) {
                    sum += $(toolbars[0]).outerHeight();
                }

                // + 1 because the toolbar has a border
                toolbarsHeight += sum + 1
            }

            var groupPanel = element.find(".sui-group-panel");
            if (groupPanel.length > 0) {
                groupingHeight += groupPanel.outerHeight();
            }

            // determine and set the height
            if (autoHeight) {
                wrapperHeight = "auto";
            }
            else {
                elementHeight = element.innerHeight();
                wrapperHeight = elementHeight - headerHeight - pagerHeight - toolbarsHeight - groupingHeight;
            }

            $(contentWrapper).add(contentWrapper.parent()).css(HEIGHT, wrapperHeight);

            // check and limit to max height
            if (maxHeight && maxHeight < element.innerHeight()) {
                wrapperHeight = maxHeight - headerHeight - pagerHeight - toolbarsHeight - groupingHeight;
                $(contentWrapper).add(contentWrapper.parent()).css(HEIGHT, wrapperHeight);
            }

            if (virtual) {
                self._ensureVirtualizedContainer();

                // NOTE: update the value of total at the virtualizedContainer side,
                // so that it updates the height of the virtualized and set proper scrolls
                self.virtualizedContainer.options.total = dataSource.total;

                // render the data
                self.virtualizedContainer.render();

                // adjust the header padding
                self._fixHeaderPadding(self.virtualizedContainer.wrapper.parent());
            }
            else {
                // adjust the header padding
                self._fixHeaderPadding(contentWrapper);

                // Fix for space under last row when there is only vertical scroll.
                if (!autoHeight && isIE && !isIE7 && !isIE8 && !support.hasScrollbarX(contentWrapper)) {
                    contentWrapper.css(HEIGHT, wrapperHeight + 1);
                }
            }
        },

        _fixHeaderPadding: function(scrollable) {
            var self = this,
                isRtl = support.isRtl(self.element),
                headerWrapper = self.headerWrapper,
                scrollableEl = $(scrollable).get(0);

            if (!scrollableEl) {
                // WARNING: this happening in virtualized mode
                return;
            }

            // add any header padding if vertical scrollbar
            // WARNING: cannot use support.hasScrollbarY because of a bug in FF (it does not add a 
            // scrollbar when scrollHeight - clientHeight = 1 !!!

            if (scrollableEl.scrollHeight - scrollableEl.clientHeight > 1) {
                headerWrapper.parent().css(isRtl ? "padding-left" : "padding-right", support.scrollbar() - 1);
                headerWrapper.removeClass("sui-no-y-scroll");
            }
            else {
                headerWrapper.parent().css(isRtl ? "padding-left" : "padding-right", 0);
                headerWrapper.addClass("sui-no-y-scroll");
            }
        },

        _ensureVirtualizedContainer: function() {
            var self = this,
                row,
                rowHeight;

            // return if already initialized
            if (self.virtualizedContainer) {
                return;
            }

            // construct and append the first row to the table body, 
            // so that we can take its height, and finally remove it;
            // NOTE: use an undefined data item so that the first row is comprised of a single line
            row = self._renderRow(0, self.contentTable.tbody, {});
            rowHeight = row.outerHeight();
            row.remove();

            // construct the virtualized container object
            self.virtualizedContainer = new shield.ui.VirtualizedContainer(self.scrollableWrapper, {
                itemHeight: rowHeight,
                total: self.dataSource.total,
                createContainer: function (wrapper) {
                    return wrapper
                        .addClass("sui-content")
                        .append(self.contentTable)
                        .find("tbody")
                        .empty();
                },
                getItems: proxy(self._loadVirtualRows, self),
                // do not call render in the constructor, 
                // we need to delay it in order to access the virtualizedContainer instance
                // from the getItems handler
                skipRender: true
            });

            self.contentWrapper = self.virtualizedContainer.element.children().eq(0);
        },

        _loadVirtualRows: function (start, end, done) {
            var self = this,
                dataSource = self.dataSource,
                skip = dataSource.skip != null ? dataSource.skip : 0,
                take = dataSource.take != null ? dataSource.take : dataSource.view.length,
                wait = 100,
                virtualizedContainerElement = self.virtualizedContainer.container;

            if (start < end) {
                // there are items to render

                // NOTE: the last group of conditions is tricky (changed last comparison from > to >= due to a bug)
                if (!self._sortingInProgress && dataSource.remote && (start < skip || end >= (skip + take))) {
                    clearTimeout(self._loadWaitTimeout);

                    self._loadWaitTimeout = setTimeout((function (start, end, done) {
                        return function () {
                            self._loadWaitTimeout = null;

                            dataSource.skip = start;
                            dataSource.take = end - start;

                            self._loadingVirtualRows = true;

                            // as widget-level events fire after the promise callbacks, and as we need the value 
                            // of _loadingVirtualRows in the widget-level CHANGE handler (_renderData), we register
                            // a one-time CHANGE event handler that will clear the property AFTER _renderData
                            dataSource.one(CHANGE + ".shieldGrid" + self.getInstanceId(), function () {
                                if (!self._loadWaitTimeout) {
                                    self._loadingVirtualRows = false;
                                }
                            });

                            dataSource.read().then(function () {
                                if (self._loadWaitTimeout) {
                                    // another timeout callback was registered
                                    return;
                                }

                                // in order to make code render cells first, we are doing what the VirtualizedContainer._renderItems() does
                                // and passing params to it not to do anything but just call the done() handler
                                virtualizedContainerElement.empty();

                                for (var i = start; i < end && i < dataSource.total; i++) {
                                    self._renderRow(i - start, virtualizedContainerElement, dataSource.view[i - start]);
                                }

                                self.loading(false);

                                done([], false);

                                self.trigger(VIRTUAL_ROWS_LOADED);
                            });
                        }
                    })(start, end, done), wait);
                }
                else {
                    // in order to make code render cells first, we are doing what the VirtualizedContainer._renderItems() does
                    // and passing params to it not to do anything but just call the done() handler
                    virtualizedContainerElement.empty();

                    for (var i = start; i < end && i < dataSource.total; i++) {
                        self._renderRow(i, virtualizedContainerElement, dataSource.view[i]);
                    }

                    done([], false);

                    self.trigger(VIRTUAL_ROWS_LOADED);
                }
            }
            else {
                // no items to render
                self._renderNoRecords();
            }

            // Check if the vertical scroll is shown and remove the top right gap if the scroll is hidden.
            self._checkIfVerticalScroll();

            // reinitialize selection
            self._initSelection();
        },

        _checkIfVerticalScroll: function () {
            var self = this,
                scrolledDiv = self.element.find(".sui-virtualized").get(0),
                parentDiv = self.element.get(0),
                hasVerticalScrollbar = scrolledDiv.scrollHeight > parentDiv.scrollHeight;

            if (hasVerticalScrollbar) {
                self.headerWrapper.parent().css("padding-right", "16px");
                self.headerWrapper.removeClass("sui-grid-no-gap");
            }
            else {
                self.headerWrapper.parent().css("padding-right", "0px");
                self.headerWrapper.addClass("sui-grid-no-gap");
            }
        },

        _onscroll: function (e) {
            var self = this,
                scrollableWrapper = self.scrollableWrapper,
                scrollableElement = scrollableWrapper.get(0),
                headerWrapper = self.headerWrapper,
                contentScrollLeft = scrollableWrapper.scrollLeft(),
                headerScrollLeft = headerWrapper.scrollLeft(),
                footer;

            // Bug in Chrome: https://code.google.com/p/chromium/issues/detail?id=81344
            if (support.isRtl(self.element) && isWebKit && scrollableElement.clientHeight < scrollableElement.scrollHeight) {
                contentScrollLeft = contentScrollLeft + (scrollableElement.offsetWidth - scrollableElement.clientWidth);
            }

            if (contentScrollLeft != headerScrollLeft) {
                headerWrapper.scrollLeft(contentScrollLeft);

                if (self._footer) {
                    footer = $(self._footer).find(".sui-footer-content");
                    if (footer.length > 0) {
                        footer.scrollLeft(contentScrollLeft);
                    }
                }
            }

            if (self.frozenHeaderWrapper) {
                var contentScrollTop = scrollableWrapper.scrollTop(),
                    frozenScrollTop = self.frozenContentWrapper.scrollTop();

                if (contentScrollTop != frozenScrollTop) {
                    self.frozenContentWrapper.scrollTop(contentScrollTop);
                }
            }
        },

        _sorting: function () {
            var self = this,
                sorting = self.options.sorting,
                element = self.element;

            if (sorting && self.columns.length) {
                if (self.sorting) {
                    self.sorting.destroy();
                }
                self.sorting = new Sorting(sorting, self);
            }
        },

        _renderData: function () {
            var self = this,
                data = self.dataSource.view,
                options = self.options,
                scrolling = options.scrolling,
                altRows = isUndefined(options.altRows) ? true : options.altRows,
                rowTemplate = options.rowTemplate,
                altRowTemplate = options.altRowTemplate,
                contentTable = self.contentTable,
                fields,
                evt;

            if (self._loadingVirtualRows) {
                return;
            }

            evt = self.trigger(COMMAND, { commandName: DATABOUND, cancel: false });
            if (evt.cancel) {
                return;
            }

            // this function is called on a DS.change event, so we can assume sorting is done 
            // so set _sortingInProgress to FALSE in order for the _renderRows() function
            // to work properly in both virtualized and normal mode
            self._sortingInProgress = false;

            // initialize the columns if not initialized
            if (!self.columns.length) {
                fields = [];

                if (data.length) {
                    each(data[0], function (i, n) {
                        fields.push(i);
                    });
                }

                options.columns = fields;
                self._resolveColumns(fields);
            }

            // reinitialize filtering
            self._filtering();

            // destroy the frozen containers
            self._destroyFrozenContainers();

            // recreate the thead of the header table;
            // the content table does not have a thead
            self._createThead(self.headerTable);

            // reinitialize colgroups
            self._createColgroup(self.headerTable);
            self._createColgroup(self.contentTable);

            // empty the content table rows
            self.contentTable.tbody.empty();

            // reinitialize sorting
            self._sorting();

            // render all rows
            self._renderRows();

            // render the footer
            self._renderFooter();

            

            // ensure the visibility of columns
            self._refreshColVisibility();

            // initialize frozen columns if there is any data
            if (data && data.length > 0) {
                self._initFrozenCols();
            }

            // reinitialize selection
            self._initSelection();

            // turn off the loading panel
            self.loading(false);

            

            self.trigger(DATABOUND);

            
        },

        _renderRows: function () {
            var self = this,
                options = self.options,
                dataSource = self.dataSource,
                data = dataSource.view,
                i,
                groups,
                key,
                count,
                headerTableColgroup,
                contentTableColgroup,
                headerTableThead,
                filteringEnabled = options.filtering && options.filtering.enabled,
                filterRow;

            // used in editing to keep all updated cells indexes. Used when markers are rendered into each cell.
            if (self._markedCells) {
                for (key in self._markedCells) {
                    if (self._markedCells.hasOwnProperty(key)) {
                        self._markedCells[key].length = 0;
                    }
                }
                self._markedCells = null;
            }

            if (!data || !data.length) {
                self._renderNoRecords();

                self._initScrolling();

                return;
            }

            //for regular scrolling or no-scrolling, render items in the usual way
            if (!self._hasVirtualScrolling() || self._sortingInProgress) {
                groups = dataSource.group;

                if (groups && groups.length > 0) {
                    count = 0;

                    self._renderGroupedData(data, count, 0);

                    headerTableColgroup = self.headerTable.find(">colgroup").first();
                    contentTableColgroup = self.contentTable.find(">colgroup").first();
                    headerTableThead = self.headerTable.thead.find(".sui-columnheader").first();

                    if (filteringEnabled) {
                        filterRow = self.headerTable.find(".sui-filter-row").first();
                    }

                    headerTableColgroup.find(".sui-indent-col").remove();
                    headerTableThead.find(".sui-columnheader > .sui-indent-cell").remove();
                    if (filterRow && filterRow.length > 0) {
                        filterRow.find(".sui-indent-cell").remove();
                    }

                    for (i = 0; i < groups.length; i++) {
                        $('<col class="sui-indent-col"/>').prependTo(headerTableColgroup);
                        $('<th class="sui-indent-cell"/>').prependTo(headerTableThead);
                        if (filterRow && filterRow.length > 0) {
                            $('<th class="sui-indent-cell"/>').prependTo(filterRow);
                        }

                        $('<col class="sui-indent-col"/>').prependTo(contentTableColgroup);
                    }

                    self._addAllIndentCells();
                    self.contentTable.addClass("sui-grouped-table");
                }
                else {
                    self._renderRowsAndDetails(data);
                }
            }

            self._createGroupPanel();

            self._initScrolling();
        },

        _getVisibleColumnCount: function() {
            var columns = this.columns || [],
                colLen = columns.length,
                i,
                count = 0;

            for (i=0; i<colLen; i++) {
                if (columns[i].visible) {
                    count++;
                }
            }

            return count;
        },

        _renderNoRecords: function() {
            var self = this,
                options = self.options,
                contentTable = self.contentTable;

            if (isUndefined(options.noRecordsTemplate)) {
                $('<tr><td class="sui-grid-norecords-cell" colspan="' + self._getVisibleColumnCount() + '" role="gridcell">' + (options.noRecordsText || "No records to display") + '</td></tr>').appendTo(contentTable.tbody);
            }
            else {
                $('<td class="sui-grid-norecords-cell" colspan="' + self._getVisibleColumnCount() + '" role="gridcell"/>').append(options.noRecordsTemplate).wrap('<tr/>').parent().appendTo(contentTable.tbody);
            }
        },

        _initScrolling: function () {
            var self = this;

            if (self.options.scrolling && !self._sortingInProgress) {
                self._scrolling();
            }
        },

        _initSelection: function() {
            this._selection();
        },

        _addAllIndentCells: function () {
            var self = this,
                rows = self.contentTable.get(0).rows,
                i,
                j,
                row,
                groupLevel;

            for (i = 0; i < rows.length; i++) {
                row = $(rows[i]);
                groupLevel = parseInt(row.attr("data-group-level"), 10);

                if (row.hasClass("sui-group-header")) {
                    if (groupLevel > 1) {
                        for (j = 0; j < groupLevel - 1; j++) {
                            $("<td class='sui-indent-cell'/>").prependTo(row);
                        }
                    }
                }
                else {
                    for (j = 0; j < groupLevel; j++) {
                        $("<td class='sui-indent-cell sui-group-intend-cell'/>").prependTo(row);
                    }
                }
            }
        },

        _renderGroupedData: function (data, count, level) {
            var self = this,
                i,
                item;

            // if the row has detail template it needs to be expanded by default and it needs to be non collapsible(otherwise the expand/collapse will conflict with groups expand collapse)
            self.options.detailExpandCollapse = false;

            for (i = 0; i < data.length; i++) {
                item = data[i];

                if (item.hasOwnProperty("field") && item.hasOwnProperty("items") && item.hasOwnProperty("value")) {
                    level++;
                    self._renderGroupHeader(item, level);
                    self._renderGroupedData(item.items, count, level);
                    self._renderGroupAggregates(item);
                    level--;
                }
                else {
                    self._renderDataItem(item, count, level);
                    count++;
                }
            }
        },

        _renderGroupAggregates: function (item) {
            if (item.aggregate) {
                var self = this,
                    columns = self.columns,
                    footerRow,
                    groupFooterTemplate,
                    dataItem = {},
                    field,
                    i,
                    aggregates = item.aggregate,
                    cell;

                for (i = 0; i < columns.length; i++) {
                    groupFooterTemplate = columns[i].groupFooterTemplate;
                    if (groupFooterTemplate) {
                        footerRow = $("<tr class='sui-group-footer' />").appendTo(self.contentTable.tbody);
                        break;
                    }
                }

                if (footerRow) {
                    for (i = 0; i < columns.length; i++) {
                        cell = $("<td class='sui-group-footer-cell' />").appendTo(footerRow);
                        groupFooterTemplate = columns[i].groupFooterTemplate;
                        if (groupFooterTemplate) {
                            field = columns[i].field;

                            for (var j = 0; j < aggregates.length; j++) {
                                if (aggregates[j].field == field) {
                                    if (isFunc(aggregates[j].aggregate)) {
                                        dataItem.custom = aggregates[j].value;
                                    }
                                    else {
                                        dataItem[aggregates[j].aggregate] = aggregates[j].value;
                                    }
                                }
                            }
                            if (isFunc(groupFooterTemplate)) {
                                var value = groupFooterTemplate.call(self, cell, dataItem);
                                if (isDefined(value) && !isNull(value) && value !== "") {
                                    cell.html(value);
                                }
                            }
                            else {
                                // groupFooterTemplate is a string - format it using the shield format
                                cell.html(shieldFormat.call(self, groupFooterTemplate, dataItem));
                            }
                        }
                    }
                    var indentCells = self.dataSource.group.length;
                    for (i = 0; i < indentCells; i++) {
                        footerRow.prepend($("<td class='sui-indent-cell' />"));
                    }
                }
            }
        },

        _renderGroupHeader: function (item, level) {
            var self = this,
                contentTable = self.contentTable,
                colspan = self._getVisibleColumnCount() + self.dataSource.group.length - level + 1,
                groupRow = $('<tr class="sui-group-header" data-group-level="' + level + '"/>').appendTo(contentTable),
                groupCell = $('<td class="sui-group-header-cell" colspan="' + colspan + '"/>').appendTo(groupRow),
                expandCollapseSpan = $('<span class="sui-collapse">&#9662;</span>').appendTo(groupCell);

            $('<span class="sui-group-header-text">' + item.field + ": " + item.value + "</span>").appendTo(groupCell);

            expandCollapseSpan.on(CLICK, proxy(self._expandCollapseHandler, self));
        },

        _expandCollapseHandler: function (e) {
            var self = this,
                args,
                span = $(e.currentTarget),
                row = span.parent().parent();

            if (span.hasClass("sui-collapse")) {
                args = self.trigger(COMMAND, { commandName: COLLAPSE, cancel: false, row: row });
                if (!args.cancel) {
                    self.collapseGroup(row);
                    span.html("&#9656;");
                    span.removeClass("sui-collapse").addClass("sui-expand");
                    self.trigger(COLLAPSE, { row: row });
                }
            }
            else {
                args = self.trigger(COMMAND, { commandName: EXPAND, cancel: false, row: row });
                if (!args.cancel) {
                    self.expandGroup(row);
                    span.html("&#9662;");
                    span.removeClass("sui-expand").addClass("sui-collapse");
                    self.trigger(EXPAND, { row: row });
                }
            }
        },

        _renderDataItem: function (item, index, level) {
            var self = this,
               contentTable = self.contentTable;

            self._renderRow(index, contentTable, item)
                .attr("data-group-level", level);
        },

        _renderRowsAndDetails: function (data) {
            var self = this,
                contentTable = self.contentTable,
                len,
                i;

            for (i = 0, len = data.length; i < len; i++) {
                // render a row and append it to the table body
                self._renderRow(i, contentTable.tbody, self.dataSource.view[i]);

                if (self._hasDetailTemplate() && !self._canExpandCollapse()) {
                    self._addDetailTemplate(data[i]);
                }
            }
        },

        // render a row, optionally appending it to a target;
        // returns the row
        _renderRow: function (index, target, dataItem) {
            var self = this,
                targetDefined = isDefined(target),
                options = self.options,
                altRows = isUndefined(options.altRows) ? true : options.altRows,
                rowTemplate = altRows && (index % 2) && options.altRowTemplate ? options.altRowTemplate : options.rowTemplate,
                columns = self.columns,
                expandCell,
                row,
                args,
                i;

            if (rowTemplate) {
                // if row template is a string, trim it
                if (isString(rowTemplate)) {
                    rowTemplate = rowTemplate.replace(/^\s+/, '').replace(/\s+$/, '');
                }

                // render the row with the template
                row = $(shieldFormat(rowTemplate, dataItem));

                // if target is defined, append the row to it right after being created
                if (targetDefined) {
                    target.append(row);
                }
            }
            else {
                row = $('<tr class="' + ((altRows && (index % 2)) ? "sui-alt-row" : "sui-row") + '"/>')
                    .data(SUI_VIEWINDEX, index);

                if (arguments.length > 3) {
                    // in edit mode we pass additional parameter which is the row index
                    var rowIndexInTable = arguments[3],
                        allRows = target.find("tr"),
                        nextRow = allRows.eq(rowIndexInTable);

                    if (allRows.length == rowIndexInTable) {
                        target.append(row);
                    }
                    else {
                        row.insertBefore(nextRow);
                    }
                }
                else if (targetDefined) {
                    // if target is defined, append the row to it right after being created
                    target.append(row);
                }

                // render the row cells
                for (i = 0; i < columns.length; i++) {
                    var column = columns[i],
                        columnTemplate = column.columnTemplate,
                        columnFormat = column.format,
                        columnField = column.field,
                        buttons = column.buttons,
                        value,
                        cell = $('<td ' + normalizeAttributes(column.attributes) + ' role="gridcell" tabindex="-1"/>')
                            .addClass('sui-cell')
                            .appendTo(row),
                        z;

                    // ARIA
                    cell
                        .attr(ROLE, "gridcell")
                        .attr(TABINDEX, "-1");
                    if (!column.editable) {
                        cell.attr(ARIA_READONLY, TRUE);
                    }

                    if (buttons) {
                        for (z = 0; z < buttons.length; z++) {
                            self._buildButton(buttons[z], cell, index);
                        }
                    }
                    else if (columnTemplate) {
                        // if columnTemplate is defined (string or function) - use it for the cell value, 
                        // otherwise use the format string or function.
                        // if neither is defined, use the raw field 
                        if (isFunc(columnTemplate)) {
                            // columnTemplate is a function - execute it passing the container and the dataItem;
                            // if the result is not null, undefined or an empty string, add it as a value
                            value = columnTemplate.call(self, cell, dataItem, index);
                            if (isDefined(value) && !isNull(value) && value !== "") {
                                cell.html(value);
                            }
                        }
                        else {
                            // columnTemplate is a string - format it using the shield format
                            cell.html(shieldFormat.call(self, columnTemplate, dataItem));
                        }
                    }
                    else if (columnFormat) {
                        // column.format is present
                        cell.html(shieldFormat.call(self, columnFormat, columnField ? get(dataItem, columnField) : dataItem));
                    }
                    else {
                        cell.html("" + get(dataItem, columnField));
                    }

                    if (!column.visible) {
                        cell.css(DISPLAY, NONE);
                    }
                }
            }

            // prepend an expand cell if needed
            if (self._hasDetailTemplate() && self._canExpandCollapse()) {
                args = self.trigger(COMMAND, { commandName: EXPANDBUTTONCREATE, cancel: false, item: dataItem });
                if (!args.cancel) {
                    expandCell = $('<td class="sui-cell sui-expand-cell"/>');
                    self._setExpandCollapseCellText(expandCell, options.detailExpandText, options.detailCollapseText);
                }
                else {
                    expandCell = $('<td class="sui-cell sui-expand-cell-disabled"/>');
                }
                expandCell.prependTo(row);
            }

            // ARIA
            row.attr(ROLE, "row");

            return row;
        },

        _renderFooter: function () {
            var self = this,
                options = self.options,
                columns = self.columns,
                footerContainer,
                footerRow,
                footerTemplate,
                dataItem = {},
                field,
                i,
                j,
                aggregates = self.dataSource.aggregates,
                cell;

            // remove any previously saved footer container
            if (self._footer) {
                $(self._footer).remove();
                self._footer = null;
            }

            for (i = 0; i < columns.length; i++) {
                footerTemplate = columns[i].footerTemplate;

                if (footerTemplate) {
                    if (options.scrolling && options.scrolling.virtual) {
                        var footerDiv = $('<div class="sui-footer" style="padding-right:16px;"/>').appendTo(self.element),
                            footerDivContent = $('<div class="sui-footer-content"/>').appendTo(footerDiv),
                            table = $('<table class="sui-table"/>').appendTo(footerDivContent),
                            parentColgroup = self.element.find(".sui-headercontent > table > colgroup > col"),
                            childColgroup = $("<colgroup/>").appendTo(table);

                        for (j = 0; j < parentColgroup.length; j++) {
                            $(parentColgroup[j].outerHTML).appendTo(childColgroup);
                        }

                        footerContainer = $("<tbody/>").appendTo(table);

                        // save the footer container to be removed later
                        self._footer = footerDiv;
                    }
                    else {
                        footerContainer = $("<tfoot/>").appendTo(self.contentTable);

                        // save the footer container to be removed later
                        self._footer = footerContainer;
                    }

                    footerRow = $('<tr class="sui-grid-footer"/>').appendTo(footerContainer);

                    break;
                }
            }

            if (footerRow) {
                for (i = 0; i < columns.length; i++) {
                    cell = $('<td class="sui-footer-cell" role="gridcell" tabindex="-1"/>')
                        .appendTo(footerRow);

                    footerTemplate = columns[i].footerTemplate;

                    if (footerTemplate) {
                        field = columns[i].field;
                        for (j = 0; j < aggregates.length; j++) {
                            if (aggregates[j].field == field) {
                                if (isFunc(aggregates[j].aggregate)) {
                                    dataItem.custom = aggregates[j].value;
                                }
                                else {
                                    dataItem[aggregates[j].aggregate] = aggregates[j].value;
                                }
                            }
                        }
                        if (isFunc(footerTemplate)) {
                            var value = footerTemplate.call(self, cell, dataItem);
                            if (isDefined(value) && !isNull(value) && value !== "") {
                                cell.html(value);
                            }
                        }
                        else {
                            // footerTemplate is a string - format it using the shield format
                            cell.html(shieldFormat.call(self, footerTemplate, dataItem));
                        }
                    }
                }

                var previousRow = footerRow.prev();
                if (previousRow.find(".sui-expand-cell").length > 0 ||
                    previousRow.find(".sui-expand-cell-disabled").length > 0 ||
                    previousRow.find(".sui-indent-cell").length > 0 ||
                    previousRow.find(".sui-collapse-cell").length > 0) {

                    footerRow.prepend($("<td/>"));
                }
            }
        },

        _buildButton: function (buttonOptions, cell, rowIndex) {
            var self = this,
                commandName = buttonOptions.commandName,
                commandHandler = buttonOptions.click,
                btn;

            if (shield.ui.Button) {
                var wrapperButton = $('<button type="button">' + buttonOptions.caption + '</button>')
                    .appendTo(cell);

                cell.addClass("sui-button-cell");

                // override the command handler if a commandName is set
                if (commandName === "delete") {
                    commandHandler = self._deleteButtonClicked;
                    if (isUndefined(buttonOptions.cls)) {
                        buttonOptions.cls = "sui-delete";
                    }
                    else {
                        buttonOptions.cls += " sui-delete";
                    }
                }
                else if (commandName === "edit") {
                    if (self._editing) {
                        self._editing.type = "row";
                    }
                    self._preventClosingEditors = true;
                    commandHandler = self._editButtonClicked;
                    if (isUndefined(buttonOptions.cls)) {
                        buttonOptions.cls = "sui-edit";
                    }
                    else {
                        buttonOptions.cls += " sui-edit";
                    }
                }

                // build the button with the given options
                btn = new shield.ui.Button(wrapperButton, {
                    cls: buttonOptions.cls,
                    events: {
                        click: proxy(commandHandler, self, rowIndex, cell)
                    }
                });

                if (commandName == "delete" || commandName == "edit") {
                    if (!self._buttons) {
                        self._buttons = [];
                    }

                    self._buttons.push({ index: rowIndex, button: btn });
                }
            }
        },

        // handle the click event of delete button
        _deleteButtonClicked: function (index, cell) {
            var self = this,
                ds = self.dataSource,
                editingOptions = self.options.editing,
                confirm = editingOptions ? editingOptions.confirmation : null,
                args;

            args = self.trigger(COMMAND, { commandName: DELETE, cancel: false, rowIndex: index });

            if (!args.cancel) {
                if (confirm && confirm["delete"] && confirm["delete"].enabled) {
                    if (!win.confirm(shieldFormat(confirm["delete"].template, ds.view[index]))) {
                        return;
                    }
                }

                // if here - confirm was ok or no confirmation was needed
                ds.removeAtView(index);
                if (editingOptions && !editingOptions.batch) {
                    // call save, passing false to suppress triggering the change event
                    ds.save(false);
                }

                self.trigger(DELETE, { rowIndex: index });
            }
        },

        // handle the click event of edit button
        _editButtonClicked: function (index, cell) {
            var self = this,
                editing = self._editing,
                ds = self.dataSource,
                row = $(cell).parent(),
                args = self.trigger(COMMAND, { commandName: EDIT, cancel: false, row: row, cell: cell, index: self._getRowIndex(row) });

            if (!args.cancel) {
                self._editingInProcess = true;

                if (ds.tracker && ds.tracker.changes && ds.tracker.changes.added && ds.tracker.changes.added.length > 0) {
                    ds.cancel();
                }
                else {
                    if (self.options.editing.mode != "popup") {
                        self._closeAllEditedRows();

                        if (editing && editing.options.enabled) {
                            editing._putRowInEditMode(row);
                        }

                        self._changeEditColumnButtons(index, cell);
                    }
                    else {
                        // Popup editing
                        if (shield.ui.Window) {
                            self._initializePopupForm(index);
                        }
                    }
                }

                self.trigger(EDIT, { row: $(cell).parent(), cell: cell, index: self._getRowIndex($(cell).parent()) });
            }
        },

        _initializePopupForm: function (index, isInserting) {
            var self = this,
                editing = self._editing,
                ds = self.dataSource,
                wrapperWindow,
                editFormContainer,
                columns,
                i,
                col;

            wrapperWindow = $('<div class="sui-modal-popup-edit-window"/>')
                .appendTo(doc.body);

            editFormContainer = $('<div class="sui-edit-form-container"/>');
            columns = self.options.columns;

            for (i = 0; i < columns.length; i++) {
                col = columns[i];

                if (col.editable === false) {
                    continue;
                }

                if (col.field) {
                    var columnType = isDefined(ds.schema.options.fields) ? ds.schema.options.fields[col.field].type : String,
                        dataItem = ds.editView(index).data,
                        value = get(dataItem, col.field);

                    self._windowEditingIndex = index;

                    $('<div class="sui-edit-form-label"><label for="' + col.field + '">' + (col.caption ? col.caption : col.field) + '</label></div>')
                        .appendTo(editFormContainer);

                    var editFieldDiv = $('<div class="sui-edit-field"></div>')
                        .appendTo(editFormContainer);

                    if (col.editor) {
                        editing._instantiateCustomEditor(col, editFieldDiv, dataItem, 0, false, col.field);
                    }
                    else {
                        switch (columnType) {
                            case Number:
                                editing._instantiateNumeric(editFieldDiv, value, false, col.field);
                                break;
                            case Date:
                                editing._instantiateDatePicker(editFieldDiv, value, false, col.field);
                                break;
                            case String:
                                editing._instantiateTextBox(editFieldDiv, value, false, col.field);
                                break;
                            case Boolean:
                                editing._instantiateCheckBox(editFieldDiv, value, false, col.field);
                                break;
                            default:
                                break;
                        }
                    }
                }
            }

            var editFieldButtons = $('<div class="sui-update-buttons sui-popup-buttons"></div>').appendTo(editFormContainer),
                wrapperButtonSave = $("<button type='button'>Save</button>").appendTo(editFieldButtons),
                wrapperButtonCancel = $("<button type='button'>Cancel</button>").appendTo(editFieldButtons);

            if (shield.ui.Button) {
                var btnSave = new shield.ui.Button(wrapperButtonSave, {
                    events: {
                        click: proxy(self._updateButtonClicked, self)
                    }
                });

                var btnCancel = new shield.ui.Button(wrapperButtonCancel, {
                    events: {
                        click: proxy(self._cancelButtonClicked, self)
                    }
                });

                self._buttons = [];
                self._buttons.push({ index: 10000, button: btnSave });
                self._buttons.push({ index: 10000, button: btnCancel });
            }

            editFormContainer.appendTo(doc.body);

            // build the window with the given options
            self.popupWindow = new shield.ui.Window(wrapperWindow, {
                title: isInserting ? "Insert" : "Edit",
                draggable: {
                    enabled: false
                },
                events: {
                    close: proxy(self._cancelButtonClicked, self)
                },
                height: $(".sui-edit-form-container").height() + 57,
                modal: true
            });

            self.popupWindow.content(editFormContainer);

            self.popupWindow.resize({ width: $(".sui-modal-popup-edit-window").width(), height: $(".sui-edit-form-container").height() + 66 });

            self.trigger(isInserting ? INSERTWINDOWOPEN : EDITWINDOWOPEN);
        },

        _changeEditColumnButtons: function (index, cell) {
            var self = this;

            self._removeButtons(cell, index);

            // create update button
            self._buildButton({ caption: "Update", click: self._updateButtonClicked, cls: "sui-update" }, cell, index);

            // create cancel button
            self._buildButton({ caption: "Cancel", click: self._cancelButtonClicked, cls: "sui-cancel" }, cell, index);

            cell.addClass("sui-update-buttons");
        },

        _removeButtons: function (cell, index) {
            var self = this,
                i,
                len = self._buttons.length;

            while (len--) {
                if (self._buttons[len].index == index) {
                    self._buttons[len].button.destroy();
                    self._buttons.splice(len, 1);
                }
            }

            cell.removeClass("sui-update-buttons")
                .empty();
        },

        // handle the click event of update button
        _updateButtonClicked: function (index, cell) {
            var self = this;

            if (!isUndefined(self._windowEditingIndex)) {
                index = self._windowEditingIndex;
            }

            self._updateItem(index, cell);

            if (self._editing._errorDuringEdit) {
                self._editing._errorDuringEdit = false;
                return;
            }

            self._putRowInViewMode(index, cell);

            if (self.options.editing.mode === "popup") {
                self._removePopupWindow();
            }
        },

        _updateItem: function (index, cell) {
            var self = this,
                ds = self.dataSource,
                pager = self.pager,
                model,
                updatedCellKyes = [],
                value,
                populateInsertedItem = true,
                args,
                key,
                rows,
                row,
                i;

            if (ds.group && ds.group.length > 0 && self.options.editing.mode != "popup") {
                rows = self.contentTable.find(".sui-row, .sui-alt-row");
                row = self.contentTable.find("tr").get(index);
                for (i = 0; i < rows.length; i++) {
                    if (rows[i] == row) {
                        index = i;
                        break;
                    }
                }
            }

            model = ds.editView(index);

            for (key in model.data) {
                if (model.data.hasOwnProperty(key)) {
                    if (model.data[key] != null) {
                        populateInsertedItem = false;
                    }
                    if (self._editing._editors[key]) {
                        if (self._editing._editors[key] == "custom") {
                            args = self.trigger("getCustomEditorValue", { field: key, value: null });
                            value = args.value;
                            self._editing._editors[key] = null;
                        }
                        else {
                            value = self._editing._editors[key].value ?
                                self._editing._editors[key].value() :
                                (self._editing._editors[key].checked ? self._editing._editors[key].checked() : UNDEFINED);
                        }

                        if (model.data[key] != value) {
                            updatedCellKyes.push(key);
                        }

                        if (isUndefined(value) || value == null) {
                            value = self._getDefaultValue(key);
                        }

                        model.set(key, value);
                    }
                }
            }

            if (self._editing._errorDuringEdit) {
                updatedCellKyes.length = 0;
                return;
            }

            if (!self._editing.options.batch) {
                args = self.trigger(COMMAND, { commandName: SAVE, cancel: false });

                if (!args.cancel) {
                    // call save, passing false to suppress triggering the change event
                    ds.save(false);
                    self.trigger(SAVE);
                }
            }

            self._populateInsertedItem = populateInsertedItem;

            return updatedCellKyes;
        },

        _getDefaultValue: function (field) {
            var self = this,
                schema = self.dataSource.schema,
                fields;

            if (schema && schema.options.fields) {
                fields = schema.options.fields;

                return shield.Model.def(
                    get(fields, field + ".type"),
                    get(fields, field + ".def"),
                    get(fields, field + ".nullable")
                );
            }

            return "";
        },

        _closeAllEditedRows: function () {
            var self = this,
                rowIndex,
                cell,
                editableCells = self.contentTable.find(".sui-editable-cell");

            if (editableCells.length > 0) {
                rowIndex = editableCells.get(0).parentNode.rowIndex;
                cell = self.contentTable.find(".sui-update-buttons").get(0);
                self._cancelButtonClicked(rowIndex, $(cell));
            }
        },

        // handle the click event of cancel button
        _cancelButtonClicked: function (index, cell) {
            var self = this,
                dataSource = self.dataSource,
                args = self.trigger(COMMAND, { commandName: CANCEL, cancel: false, rowIndex: index, cell: cell }),
                columns,
                i,
                colEditor;

            if (!args.cancel) {
                if (dataSource.tracker && dataSource.tracker.changes && dataSource.tracker.changes.added && dataSource.tracker.changes.added.length > 0) {
                    dataSource.cancel();
                    if (self.options.editing.mode === "popup") {
                        self._removePopupWindow();
                    }
                }
                else {
                    if (self.options.editing.mode != "popup") {
                        self._putRowInViewMode(index, cell);
                    }
                    else {
                        columns = self.options.columns;
                        for (i = 0; i < columns.length; i++) {
                            colEditor = self._editing._editors[columns[i].field];
                            if (colEditor) {
                                if (isFunc(colEditor.destroy)) {
                                    self._editing._editors[columns[i].field].destroy();
                                }
                                delete self._editing._editors[columns[i].field];
                            }
                        }

                        self._removePopupWindow();
                    }
                }

                self.trigger(CANCEL);
            }
        },

        _removePopupWindow: function () {
            var self = this;

            self._removeButtons($(".sui-window .sui-update-buttons"), 10000);

            self.popupWindow.destroy();

            $(".sui-modal-popup-edit-window").remove();
        },

        // returns the view index of the passed row; if not an item row, returns -1
        _getRowIndex: function(row) {
            var viewIndex = $(row).data(SUI_VIEWINDEX);
            return isDefined(viewIndex) ? viewIndex : -1;
        },

        _putRowInViewMode: function (index, cell) {
            var self = this,
                options = self.options,
                navigation = options.navigation,
                dataItem,
                row,
                rows,
                i,
                ds = self.dataSource,
                contentTable = self.contentTable,
                dataItemIndex = index,
                activeCellIndex = -1;

            if (ds.group && ds.group.length > 0 && options.editing.mode != "popup") {
                rows = contentTable.find(">tbody > tr.sui-row, >tbody > tr.sui-alt-row");
                row = contentTable.find(">tbody > tr").get(index);
                for (i = 0; i < rows.length; i++) {
                    if (rows[i] == row) {
                        dataItemIndex = i;
                        break;
                    }
                }
            }

            // NOTE: do not get the data item by using ds.edit() because
            // it will add it to the change tracker;
            // instead, take it from the data source view directly
            //dataItem = ds.editView(dataItemIndex).data;
            dataItem = ds.view[dataItemIndex];

            if (cell && options.editing.mode != "popup") {
                self._removeButtons(cell, index);
            }

            row = contentTable.find(">tbody > tr").get(index);
            var indentCellsCount = parseInt($(row).attr("data-group-level"), 10);

            // see if the currently active cell is part of this row
            if (navigation) {
                activeCellIndex = $(row).children('td').index(self._activeCell);
            }

            self._editing._destroyRow(index);
            row = self._renderRow(dataItemIndex, self.contentTable.tbody, dataItem, index);

            // if active cell was part of this row, reinitialize it
            if (navigation) {
                if (activeCellIndex > -1) {
                    self._activeCell = $(row).children('td').eq(activeCellIndex);
                    $(self._activeCell).focus();
                }
            }

            for (i = 0; i < indentCellsCount; i++) {
                $('<td class="sui-indent-cell sui-group-intend-cell"/>')
                    .prependTo(row);
            }

            if (indentCellsCount) {
                row.attr("data-group-level", indentCellsCount);
            }

            if (self._editing.options.batch) {
                var cells = row.children(".sui-cell");

                if (self._markedCells && self._markedCells[index]) {
                    var item = self._markedCells[index],
                        currentIndex,
                        html;

                    for (i = 0; i < item.length; i++) {
                        currentIndex = item[i];
                        html = $(cells[currentIndex]).html();
                        $(cells[currentIndex]).html('<span class="sui-updated-marker"/>' + html);
                    }
                }
            }
        },

        _renderUpdateMarkers: function (allUpdatedCellsKyes, rowIndex) {
            var self = this,
                columns = self.columns,
                cells = self.contentTable.find(">tbody > tr").eq(rowIndex).children(".sui-cell"),
                i,
                j,
                html;

            for (i = 0; i < allUpdatedCellsKyes.length; i++) {
                for (j = 0; j < columns.length; j++) {
                    if (columns[j].field === allUpdatedCellsKyes[i]) {
                        html = $(cells[j]).html();
                        $(cells[j]).html('<span class="sui-updated-marker"/>' + html);

                        if (!self._markedCells) {
                            self._markedCells = {};
                            self._markedCells[rowIndex] = [];
                            self._markedCells[rowIndex].push(j);
                        }
                        else {
                            if (!self._markedCells[rowIndex]) {
                                self._markedCells[rowIndex] = [];
                            }
                            self._markedCells[rowIndex].push(j);
                        }
                    }
                }
            }
        },

        _selection: function () {
            var self = this,
                options = self.options;

            if (options.selection) {
                // destroy selectable if set
                if (self._selectable) {
                    self._selectable.destroy();
                }
                self._selectable = new Selection(options.selection, self);
            }
        },

        _filtering: function () {
            var self = this,
                options = self.options;

            if (options.filtering && options.filtering.enabled) {
                if (self._filter) {
                    self._filter.destroy();
                }
                self._filter = new Filtering(self);
            }
        },

        _paging: function (paging) {
            var self = this,
                element = self.element,
                pagerWrapper;

            if (shield.ui.Pager && paging) {
                if (isObject(paging) && paging instanceof shield.ui.Pager) {
                    self.pager = paging;
                    self.pager.dataSource = self.dataSource;
                    self.pager.element.appendTo(element);
                }
                else {
                    pagerWrapper = $("<div/>").appendTo(element);
                    pagerWrapper.addClass("sui-pager");
                    self.pagerWrapper = pagerWrapper;

                    self.pager = new shield.ui.Pager(pagerWrapper.get(0), extend({}, paging, {
                        dataSource: self.dataSource
                    }));
                }
            }
        },

        _reorder: function () {
            var self = this,
                options = self.options;

            if (options.columnReorder) {
                self._columnReorder = new ColumnReorder(self);
            }
        },

        _expandCollapseDetailTemplate: function (e) {
            var self = this,
                parentRow = $(e.target).closest(".sui-row", self.contentTable);

            if (!parentRow.length) {
                parentRow = $(e.target).closest(".sui-alt-row", self.contentTable);
            }

            self._toggleDetailTemplate(parentRow);
        },

        _toggleDetailTemplate: function (parentRow) {
            var self = this,
                rows = self.contentTable.find("tr:first").parent().children().not(".sui-detail-row"),
                parentRowIndex = inArray(parentRow[0], rows),
                data = self.dataSource.view,
                detailRow = parentRow.next(),
                options = self.options,
                expandCollapseCell;

            if (detailRow && detailRow.hasClass("sui-detail-row")) {
                detailRow.toggle();
                expandCollapseCell = $(parentRow.get(0).cells[0]);
                self._toggleClasses(expandCollapseCell, "sui-expand-cell", "sui-collapse-cell");

                self._setExpandCollapseCellText(expandCollapseCell, options.detailExpandText, options.detailCollapseText);
            }
            else {
                self._addDetailTemplate(data[parentRowIndex], parentRow);
            }
        },

        _setExpandCollapseCellText: function (expandCollapseCell, detailExpandText, detailCollpsedText) {
            if (isUndefined(detailCollpsedText)) {
                detailCollpsedText = "-";
            }
            if (isUndefined(detailExpandText)) {
                detailExpandText = "+";
            }

            var collapseClass = this.options.detailCollapseCssClass;
            var expandClass = this.options.detailExpandCssClass;

            if (isUndefined(collapseClass)) {
                collapseClass = "";
            }
            else {
                collapseClass = " class = '" + collapseClass + "'";
            }

            if (isUndefined(expandClass)) {
                expandClass = "";
            }
            else {
                expandClass = " class = '" + expandClass + "'";
            }

            if (expandCollapseCell.hasClass("sui-collapse-cell")) {
                expandCollapseCell.html("<span" + collapseClass + ">" + detailCollpsedText + "</span>");
            }
            else if (expandCollapseCell.hasClass("sui-expand-cell")) {
                expandCollapseCell.html("<span" + expandClass + ">" + detailExpandText + "</span>");
            }
        },

        _addDetailTemplate: function (item, parentRow) {
            var self = this,
                options = self.options,
                row = $("<tr class='sui-detail-row'/>"),
                html = "",
                indentCell;

            if (self._canExpandCollapse()) {
                indentCell = $("<td class='sui-cell sui-indent-cell'/>");
                if (isIE7) {
                    indentCell.html("&nbsp;");
                }
                indentCell.appendTo(row);
            }

            var cell = $('<td class="sui-detail-cell" colspan="' + self._getVisibleColumnCount() + '"></td>'),
                args = self.trigger(COMMAND, { commandName: DETAILCREATED, cancel: false, detailCell: cell, item: item });

            if (!args.cancel) {
                cell.appendTo(row);
                if (options.detailTemplate) {
                    cell.html(shieldFormat(options.detailTemplate, item));
                }

                if (!parentRow) {
                    row.appendTo(self.contentTable.tbody);
                }
                else {
                    row.insertAfter(parentRow);
                }

                self.trigger(DETAILCREATED, { detailCell: cell, item: item });

                if (parentRow) {
                    var expandCollapseCell = $(parentRow.get(0).cells[0]);
                    self._toggleClasses(expandCollapseCell, "sui-expand-cell", "sui-collapse-cell");

                    self._setExpandCollapseCellText(expandCollapseCell, options.detailExpandText, options.detailCollapseText);
                }
            }
        },

        _toggleClasses: function (element, firstClass, secondClass) {
            if (element.hasClass(firstClass)) {
                element.removeClass(firstClass);
                element.addClass(secondClass);
            }
            else {
                element.removeClass(secondClass);
                element.addClass(firstClass);
            }
        },

        _resizing: function () {
            var self = this;

            // create resize component if both resizing and scrolling is enabled
            if (self.options.resizing && self.options.scrolling) {
                self._columnResizing = new ColumnResizing(self);
            }
        },

        _initToolbar: function () {
            var self = this,
                options = self.options;

            // create toolbar component
            if (options.toolbar) {
                self._toolbar = new Toolbar(options.toolbar, self);
            }
        },

        _initEditing: function () {
            var self = this,
                options = self.options;

            // initialize editing
            if (options.editing) {
                self._buttons = [];
                self._editing = new Editing(options.editing, self);
            }
        },

        _refreshOnSort: function () {
            this._sortingInProgress = true;
            this.dataSource.read();
        },

        _dsStartHandler: function () {
            this.loading(true);
        },

        _initNavigation: function() {
            var self = this,
                element = self.element,
                navEventNS = self._eventNS + "nav",
                focusableCellsSelector = ".sui-headercell[tabindex], .sui-filter-cell[tabindex], .sui-cell[tabindex], .sui-footer-cell[tabindex]";

            if (self.options.navigation) {
                // re-assign events
                element
                    .addClass('sui-grid-nav')
                    .off(navEventNS)
                    .on(FOCUS + navEventNS, focusableCellsSelector, function(e) {
                        $(self._activeCell)
                            .attr(TABINDEX, "-1");

                        self._activeCell = $(this);

                        $(self._activeCell)
                            .attr(TABINDEX, "0");
                    });

                // initialize the active cell
                self._initActiveCell();

                // make the first cell tabindex 0
                $(self._activeCell).attr(TABINDEX, "0");
            }
        },

        _initActiveCell: function() {
            var self = this;

            if ($(self._activeCell).length <= 0 || !$(self._activeCell).is(":visible")) {
                self._activeCell = $(self.element).find('.sui-cell[tabindex]').first();

                if ($(self._activeCell).length <= 0) {
                    self._activeCell = $(self.element).find('.sui-headercell[tabindex]').first();
                }
            }
        },

        // returns whether a cell is being edited
        _cellEditable: function(cell) {
            if ($(cell).attr(ARIA_READONLY) == TRUE) {
                return false;
            }

            if ($(cell).hasClass('sui-editable-cell')) {
                return true;
            }

            return false;
        },

        _keydown: function(event) {
            var self = this,
                element = self.element,
                code = event.keyCode,
                options = self.options,
                navigation = options.navigation,
                editing = options.editing,
                selection = options.selection,
                isCtrlPressed = event.ctrlKey,
                isShifPressed = event.shiftKey,
                pager = self.pager,
                prevent = false,
                activeCellEditable = self._cellEditable(self._activeCell),
                next;

            // if event target is a button and ENTER or SPACE was pressed, do not do anything - assume this is a button action
            if ($(event.target).prop("tagName").toLowerCase() === "button" && (code == keyCode.ENTER || code == keyCode.SPACE)) {
                return;
            }

            switch(code) {
                case keyCode.UP:
                    if (navigation) {
                        if (!activeCellEditable) {
                            next = self._getNextNavCell("up");
                            if (next) {
                                $(next).focus();
                                prevent = true;
                            }
                        }
                    }
                    break;
                case keyCode.DOWN:
                    if (navigation) {
                        if (!activeCellEditable) {
                            next = self._getNextNavCell("down");
                            if (next) {
                                $(next).focus();
                                prevent = true;
                            }
                        }
                    }
                    break;
                case keyCode.LEFT:
                    if (navigation) {
                        if (!activeCellEditable) {
                            next = self._getNextNavCell("left");
                            if (next) {
                                $(next).focus();
                                prevent = true;
                            }
                        }
                    }
                    break;
                case keyCode.RIGHT:
                    if (navigation) {
                        if (!activeCellEditable) {
                            next = self._getNextNavCell("right");
                            if (next) {
                                $(next).focus();
                                prevent = true;
                            }
                        }
                    }
                    break;
                case keyCode.HOME:
                    if (navigation) {
                        if (!activeCellEditable) {
                            if (isCtrlPressed) {
                                next = $(element).find('.sui-cell[tabindex], .sui-headercell[tabindex], .sui-footer-cell[tabindex]').first();
                            }
                            else {
                                next = self._getNextNavCell("first");
                            }
                            if (next) {
                                $(next).focus();
                                prevent = true;
                            }
                        }
                    }
                    break;
                case keyCode.END:
                    if (navigation) {
                        if (!activeCellEditable) {
                            if (isCtrlPressed) {
                                next = $(element).find('.sui-cell[tabindex], .sui-headercell[tabindex], .sui-footer-cell[tabindex]').last();
                            }
                            else {
                                next = self._getNextNavCell("last");
                            }
                            if (next) {
                                $(next).focus();
                                prevent = true;
                            }
                        }
                    }
                    break;
                case keyCode.ENTER:
                    if (navigation) {
                        if ($(self._activeCell).hasClass('sui-cell')) {
                            // data cell
                            if (editing) {
                                if (activeCellEditable) {
                                    self._updateButtonClicked($(self._activeCell).parent().get(0).rowIndex, $(self._activeCell));
                                }
                                else {
                                    self._editing._editingTriggered(event);
                                }
                                prevent = true;
                            }
                        }
                        else if ($(self._activeCell).hasClass('sui-headercell')) {
                            if ($(self._activeCell).children('.sui-link').length > 0) {
                                self.one(DATABOUND, proxy(self.focus, self));

                                // sort by that cell by simulating a click on the sort link
                                $(self._activeCell).children('.sui-link').first().click();
                            }
                            prevent = true;
                        }
                    }
                    break;
                case keyCode.PAGEUP:
                    if (navigation) {
                        if (pager && pager.hasPrev()) {
                            self.one(DATABOUND, proxy(self.focus, self));
                            self.pager.prev();
                        }
                        prevent = true;
                    }
                    break;
                case keyCode.PAGEDOWN:
                    if (navigation) {
                        if (pager && pager.hasNext()) {
                            self.one(DATABOUND, proxy(self.focus, self));
                            self.pager.next();
                        }
                        prevent = true;
                    }
                    break;
                case keyCode.ESC:
                    if (activeCellEditable) {
                        self.cancelEditing();
                        if (navigation) {
                            $(self._activeCell).focus();
                        }
                        prevent = true;
                    }
                    break;
                case keyCode.SPACE:
                    if (navigation && selection && self._selectable && !activeCellEditable) {
                        // WARNING: working with private members of the selectable

                        // get the selection elements
                        self._selectable.elements = getElementsFromEvent(event, self.contentTable, self.frozenContentTable);

                        if (self._selectable.elements) {
                            self._selectable._performAndProcessSelection(event);
                        }

                        prevent = true;
                    }
                    break;
                default:
                    break;
            }

            if (prevent) {
                event.preventDefault();
            }
        },

        _getNextNavCell: function(movement) {
            var self = this,
                element = self.element,
                activeCell = self._activeCell,
                row,
                result;

            if (!activeCell || $(activeCell).length <= 0) {
                activeCell = $(self.element).find('.sui-cell[tabindex="0"], .sui-headercell[tabindex="0"]').first();
            }

            if (movement == "left") {
                result = self.__findPrevFocusCell(activeCell);
            }
            else if (movement == "right") {
                result = self.__findNextFocusCell(activeCell);
            }
            else if (movement == "up") {
                result = self.__findAboveFocusCell(activeCell);
            }
            else if (movement == "down") {
                result = self.__findBelowFocusCell(activeCell);
            }
            else if (movement == "first") {
                result = self.__findFirstFocusCell(activeCell);
            }
            else if (movement == "last") {
                result = self.__findLastFocusCell(activeCell);
            }

            // TODO: handle frozen columns, nested grids, etc ???
            // inside these functions called above...

            return result && $(result).length > 0 ? $(result).get(0) : null;
        },

        __findFirstFocusCell: function(cell) {
            var self = this,
                prev = self.__findPrevFocusCell(cell),
                result;
            while (prev && prev.length > 0) {
                result = prev;
                prev = self.__findPrevFocusCell(prev);
            }
            return result;
        },

        __findLastFocusCell: function(cell) {
            var self = this,
                next = self.__findNextFocusCell(cell),
                result;
            while (next && next.length > 0) {
                result = next;
                next = self.__findNextFocusCell(next);
            }
            return result;
        },

        __findPrevFocusCell: function(cell) {
            var prev = $(cell).prev();
            while (prev && prev.length > 0) {
                if (hasAttribute(prev, TABINDEX)) {
                    return prev;
                }
                prev = $(cell).prev();
            }
            return UNDEFINED;
        },

        __findNextFocusCell: function(cell) {
            var next = $(cell).next();
            while (next && next.length > 0) {
                if (hasAttribute(next, TABINDEX)) {
                    return next;
                }
                next = $(cell).next();
            }
            return UNDEFINED;
        },

        __findAboveFocusCell: function(cell) {
            var self = this,
                row = $(cell).closest('tr'),
                cellIndex = $(cell).index(),
                rows = self.headerTable.find('>thead > tr')
                    .add(self.contentTable.find('>tbody > tr'))
                    .add(self.contentTable.find('>tfoot > tr')),
                rowIndex = $(rows).index(row),
                result;

            while (rowIndex > 0) {
                result = $($(rows)[rowIndex-1]).children().eq(cellIndex);
                if (hasAttribute(result, TABINDEX)) {
                    return result;
                }
                rowIndex--;
            }

            return UNDEFINED;
        },

        __findBelowFocusCell: function(cell) {
            var self = this,
                row = $(cell).closest('tr'),
                cellIndex = $(cell).index(),
                rows = self.headerTable.find('>thead > tr')
                    .add(self.contentTable.find('>tbody > tr'))
                    .add(self.contentTable.find('>tfoot > tr')),
                rowIndex = $(rows).index(row),
                result;

            while (rowIndex < rows.length - 1) {
                result = $($(rows)[rowIndex+1]).children().eq(cellIndex);
                if (hasAttribute(result, TABINDEX)) {
                    return result;
                }
                rowIndex++;
            }

            return UNDEFINED;
        },

        // focuses the first 
        focus: function() {
            var self = this;

            if (self.options.navigation) {
                self._initActiveCell();
                
                if ($(self._activeCell).length > 0) {
                    $(self._activeCell).focus();
                }
                else {
                    focusFirst(self.element);
                }
            }
            else {
                focusFirst(self.element);
            }
        },

        refresh: function (options) {
            var self = this,
                dataSourceOptions = options ? options.dataSource : null,
                eventNS = self._eventNS,
                i;

            options = shield.extend([Class], self.options, options);

            // explicitly override the options.dataSource if such a new option came,
            // instead of applying the change on the instance
            if (dataSourceOptions) {
                options.dataSource = dataSourceOptions;
            }

            var dataSource,
                element = self.element,
                scrolling = options.scrolling,
                paging = self.pager ? self.pager.options : options.paging,
                scrollLeft = 0;

            if (scrolling && self.contentWrapper) {
                scrollLeft = self.contentWrapper.get(0).scrollLeft;
            }

            self._destroyInternal();

            dataSource = self.dataSource = DataSource.create(options.dataSource);

            // ARIA
            element
                .attr(ROLE, "grid")
                .on(KEYDOWN + eventNS, proxy(self._keydown, self));
            // if not editable, add aria-readonly for the grid
            if (!options.editing) {
                element.attr(ARIA_READONLY, TRUE);
            }

            dataSource
                .on(CHANGE + eventNS, proxy(self._renderData, self))
                .on(START + eventNS, proxy(self._dsStartHandler, self));

            $(win).on(RESIZE + eventNS, proxy(self._resizeHandler, self));

            self._resolveColumns(options.columns);

            self._createWrappers();

            self._createHeaderTable();
            self._createContentTable();

            self._initToolbar();
            self._initEditing();

            self._filtering();

            self._paging(paging);

            self._resizing();
            self._reorder();

            self._initNavigation();

            if (!self.pager) {
                self.dataSource.read();
            }

            self._sorting();

            if (scrollLeft) {
                self.contentWrapper.get(0).scrollLeft = scrollLeft;
            }
        },

        loading: function (isLoading, showImmediately) {
            var self = this,
                showFunc = function() {
                    if (self.loadingPanel) {
                        self.loadingPanel.show();
                    }
                };

            if (shield.ui.LoadingPanel) {
                if (isLoading) {
                    if (!self.loadingPanel) {
                        self.loadingPanel = new shield.ui.LoadingPanel(self.element.get(0));
                    }

                    if (showImmediately) {
                        showFunc();
                    }
                    else {
                        self.loadingPanelTimeout = setTimeout(showFunc, 50);
                    }
                }
                else if (self.loadingPanel) {
                    clearTimeout(self.loadingPanelTimeout);
                    self.loadingPanelTimeout = null;
                    self.loadingPanel.hide();
                }
            }
        },

        select: function (items) {
            var self = this,
                selectable = self._selectable;

            if (isString(items)) {
                // if items is a string, treat is as a selector and find all rows inside the contentTable
                items = self.contentTable.find(items);
            }
            else {
                items = $(items);
            }

            if (items.length) {
                if (!selectable.multiple) {
                    selectable.clear();
                    items = items.first();
                }
                selectable.select(items);
                return;
            }

            return selectable.select();
        },

        // returns the indices of the selected rows as a dictionary, 
        // containing two lists - the view indices and data indices of the selected rows
        selectedRowIndices: function() {
            var self = this,
                viewIndices = [],
                dataIndices = [];

            self.contentTable.children('tbody').children(".sui-row, .sui-alt-row").each(function() {
                if ($(this).hasClass(SELECTED)) {
                    var viewIndex = self._getRowIndex($(this));
                    viewIndices.push(viewIndex);
                    dataIndices.push(viewIndex >= 0 ? self.dataSource.getDataIndex(viewIndex) : viewIndex);
                }
            });

            return {
                view: viewIndices,
                data: dataIndices
            };
        },

        clearSelection: function () {
            this._selectable.clear();
        },

        sort: function (fieldName, desc, unsort) {
            if (this.sorting) {
                this.sorting._sort(fieldName, desc, unsort);
            }
        },

        // gets the row by an index or a row
        _getItemRow: function (row) {
            if (isNumber(row)) {
                // row is an index, so find it in the details
                return $(this.contentTable.children('tbody').children(".sui-row, .sui-alt-row").get(row));
            }
            return $(row);
        },

        expandRow: function (row) {
            var self = this,
                expandRow = self._getItemRow(row),
                detailRow = expandRow.next();

            if (detailRow.hasClass("sui-detail-row")) {
                if (detailRow.css(DISPLAY) == NONE) {
                    self._toggleDetailTemplate(expandRow);
                }
            }
            else {
                self._toggleDetailTemplate(expandRow);
            }
        },

        collapseRow: function (row) {
            var self = this,
                collapseRow = self._getItemRow(row),
                detailRow = collapseRow.next();

            if (detailRow.hasClass("sui-detail-row")) {
                if (detailRow.css(DISPLAY) != NONE) {
                    self._toggleDetailTemplate(collapseRow);
                }
            }
            else {
                self._toggleDetailTemplate(collapseRow);
                collapseRow.next().toggle();
            }
        },

        reorderColumn: function (index, newIndex, force) {
            var self = this,
                element = self.element,
                columns = self.columns,
                columnOptions = self.options.columns || [],
                header = self.headerWrapper,
                method = "before",
                indent = header.find(".sui-columnheader").first().find(".sui-indent-cell").length,
                column;

            index = +index;
            newIndex = +newIndex;

            if (isNaN(index) || isNaN(newIndex) || index < 0 || newIndex < 0 || index > columns.length - 1 || newIndex > columns.length - 1) {
                throw new Error("Invalid index in column reorder.");
            }

            if (index === newIndex) {
                return;
            }

            if (newIndex > index) {
                method = "after";
            }

            // if the column is locked or invisible, do not do anything
            column = columns[index];
            if (!column.visible || (!force && column.locked)) {
                return;
            }

            // reorder the column in the columns list
            column = columns.splice(index, 1)[0];
            columns.splice(newIndex, 0, column);

            // reorder the column in the column options
            column = columnOptions.splice(index, 1)[0];
            columnOptions.splice(newIndex, 0, column);

            index += indent;
            newIndex += indent;

            element.find(".sui-gridheader col:nth-child(" + (index + 1) + ")")
                .add(element.find(".sui-gridheader .sui-columnheader th:nth-child(" + (index + 1) + ")"))
                .add(element.find(".sui-gridheader .sui-filter-row th:nth-child(" + (index + 1) + ")"))
                .add(element.find(".sui-gridcontent col:nth-child(" + (index + 1) + ")"))
                .add(element.find(".sui-gridcontent tr:not(.sui-detail-row) td:nth-child(" + (index + 1) + ")"))
                .each(function () {
                    $(this).parent().children().eq(newIndex)[method](this);
                });
        },

        // Add passed object or created new one with defaults to end of datasource
        addRow: function (obj) {
            return this.dataSource.add(isDefined(obj) ? obj : {});
        },

        // Add passed object or created new one with defaults to specified position in view
        insertRow: function (index, obj) {
            return this.dataSource.insertView(index, isDefined(obj) ? obj : {});
        },

        // Saves all unsaved changes in DataSource
        saveChanges: function () {
            // save the datasource, this will trigger a datasource change event
            this.dataSource.save();
        },

        // Reverts all changes from the DataSource
        revertChanges: function () {
            this.dataSource.cancel();
        },

        // returns the data item to which the row at passed index is bound
        dataItem: function (index) {
            return this.dataSource.view[index];
        },

        editCell: function (rowIndex, colIndex) {
            var self = this,
                cell = self.contentTable.find(">tbody > tr").eq(rowIndex).children("td").eq(colIndex).get(0);

            self._editingInProcess = true;
            self._editing._putCellInEditMode(cell, rowIndex);
        },

        editRow: function (rowIndex) {
            var self = this,
                row = self.contentTable.find(">tbody > tr").eq(rowIndex).get(0);

            self._editingInProcess = true;
            self._editing._putRowInEditMode($(row), 0);
        },

        editRowPopup: function(rowIndex) {
            var self = this;

            self._editingInProcess = true;

            if (shield.ui.Window) {
                self._initializePopupForm(rowIndex);
            }
        },

        cancelEditing: function () {
            var self = this,
                rowIndex,
                cell,
                editableCells = self.contentTable.find(".sui-editable-cell");

            if (editableCells.length > 0) {
                rowIndex = editableCells.get(0).parentNode.rowIndex;
                cell = self.contentTable.find(".sui-update-buttons").get(0);

                self._putRowInViewMode(rowIndex, $(cell));
            }

            self._editingInProcess = false;
        },

        // deletes a row / data item using the specified view index
        deleteRow: function (rowIndex) {
            this.dataSource.removeAtView(rowIndex);
        },

        filter: function () {
            var self = this,
                ds = self.dataSource,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                ds.filter = args[0];
                ds.read();
            }
            else {
                return ds.filter;
            }
        },

        group: function (dataField, index, order, aggregates) {
            var self = this,
                groups = self.dataSource.group;

            if (groups) {
                groups.splice(index, 0, { field: dataField, order: order, aggregates: aggregates });
            }
            else {
                self.dataSource.group = [];
                self.dataSource.group.push({ field: dataField, order: order, aggregates: aggregates });
            }
        },

        ungroup: function (dataField) {
            var self = this,
                groups = self.dataSource.group,
                i;

            self.headerTable.thead.find(".sui-columnheader > .sui-indent-cell").remove();

            for (i = 0; i < groups.length; i++) {
                if (groups[i].field == dataField) {
                    groups.splice(i, 1);
                    if (groups.length === 0) {
                        self.dataSource.group = null;
                    }
                    self.dataSource.read();
                }
            }
        },

        collapseGroup: function (row) {
            var self = this,
                shouldHideNextRow = true,
                groupLevel = parseInt(row.attr("data-group-level"), 10);

            while (shouldHideNextRow) {
                row = row.next().css(DISPLAY, NONE);

                if (row.next().length > 0) {
                    var nextRowGroupLevel = parseInt(row.next().attr("data-group-level"), 10);
                    if (nextRowGroupLevel <= groupLevel && row.next().hasClass("sui-group-header")) {
                        shouldHideNextRow = false;
                    }
                }
                else {
                    shouldHideNextRow = false;
                }
            }
        },

        expandGroup: function (row) {
            var self = this,
                shouldHideNextRow = true,
                groupLevel = parseInt(row.attr("data-group-level"), 10);

            while (shouldHideNextRow) {
                row = row.next().css(DISPLAY, "");
                if (row.hasClass("sui-group-header")) {
                    if (row.find(".sui-expand").length > 0) {
                        return;
                    }
                }
                if (row.next().length > 0) {
                    var nextRowGroupLevel = parseInt(row.next().attr("data-group-level"), 10);
                    if (nextRowGroupLevel <= groupLevel && row.next().hasClass("sui-group-header")) {
                        shouldHideNextRow = false;
                    }
                }
                else {
                    shouldHideNextRow = false;
                }
            }
        },

        _getColumnByField: function (fieldName) {
            var self = this,
                columns = self.columns || [],
                i;

            for (i = 0; i < columns.length; i++) {
                if (columns[i].field === fieldName) {
                    return columns[i];
                }
            }

            return UNDEFINED;
        },

        _refreshColVisibility: function() {
            var self = this,
                columns = self.columns,
                columnsLength = columns.length,
                i,
                hasHidden = false;

            // optimization - do this only if there is at least one hidden,
            // because the default state and rendering of the columns is visible
            for (i=0; i<columnsLength; i++) {
                if (!columns[i].visible) {
                    hasHidden = true;
                    break;
                }
            }

            if (!hasHidden) {
                return;
            }

            // make sure each column is shown or hidden
            for (i=0; i<columnsLength; i++) {
                if (columns[i].visible) {
                    self.showColumn(columns[i].field);
                }
                else {
                    self.hideColumn(columns[i].field);
                }
            }
        },

        _getNextVisibleColumnRealIndex: function (gridColumn) {
            // returns the index of the next-visible column, closest to the given one
            var self = this,
                columns = self.columns,
                i;

            for (i=gridColumn.index+1; i<columns.length; i++) {
                if (columns[i].visible) {
                    return i;
                }
            }

            return -1;
        },

        isHidden: function(fieldName) {
            var column = this._getColumnByField(fieldName);
            return column ? !column.visible : UNDEFINED;
        },

        hideColumn: function (fieldName) {
            var self = this,
                element = $(self.element),
                column = self._getColumnByField(fieldName);

            if (!column || column.locked) {
                return;
            }

            // make sure the respective header col is hidden
            $(self.headerTable).find('colgroup').first().find("col").each(function() {
                if ($(this).data(SUI_FIELDNAME) == fieldName) {
                    self._gridColumns[fieldName].headerCol = $(this);
                    $(this).detach();   // use .detach() instead of .remove() to preserve the .data()
                    return false;
                }
            });

            // make sure the respective content col is hidden
            $(self.contentTable).find('colgroup').first().find("col").each(function() {
                if ($(this).data(SUI_FIELDNAME) == fieldName) {
                    self._gridColumns[fieldName].contentCol = $(this);
                    $(this).detach();   // use .detach() instead of .remove() to preserve the .data()
                    return false;
                }
            });

            // hide the TDs
            self._changeColumnVisibility(fieldName, "hide");

            column.visible = false;

            self._afterColumnVisibilityChange();
        },

        showColumn: function (fieldName) {
            var self = this,
                element = $(self.element),
                column = self._getColumnByField(fieldName),
                headerColgroup = $(self.headerTable).find('colgroup'),
                contentColgroup = $(self.contentTable).find('colgroup'),
                gridColumn,
                headerCol,
                contentCol,
                position,
                nextVisibleColumnField;

            if (!column || column.locked) {
                return;
            }

            gridColumn = self._gridColumns[fieldName];
            headerCol = gridColumn.headerCol;
            contentCol = gridColumn.contentCol;

            // find the position to put the cols on
            position = self._getNextVisibleColumnRealIndex(gridColumn);

            // place the colgroups on the correct position
            if (position === -1) {
                headerColgroup.append(headerCol);
                contentColgroup.append(contentCol);
            }
            else {
                // get the field name of the next visible column by its real index
                nextVisibleColumnField = self.columns[position].field;

                // find the header col for the next visible one and insert the current before it
                headerColgroup.find('col').each(function() {
                    if ($(this).data(SUI_FIELDNAME) == nextVisibleColumnField) {
                        $(headerCol).insertBefore($(this));
                        return false;
                    }
                });

                // find the content col for the next visible one and insert the current before it
                contentColgroup.find('col').each(function() {
                    if ($(this).data(SUI_FIELDNAME) == nextVisibleColumnField) {
                        $(contentCol).insertBefore($(this));
                        return false;
                    }
                });
            }

            // show the TDs
            self._changeColumnVisibility(fieldName, "show");

            // reset some gridColumn properties that are only there for hidden columns
            gridColumn.headerCol = gridColumn.contentCol = UNDEFINED;

            column.visible = true;

            self._afterColumnVisibilityChange();
        },

        _changeColumnVisibility: function (fieldName, func) {
            var self = this,
                element = $(self.element),
                header = $(self.headerTable).find(".sui-columnheader").first(),
                headerFilter = $(self.headerTable).find(".sui-filter-row").first(),
                cellIndex = -1,
                rows,
				i;

            // find the cell index
            if (header.length) {
                $(header).children().each(function(index) {
                    if ($(this).attr('data-field') == fieldName) {
                        cellIndex = index;
                        return false;
                    }
                });
            }

            // do not proceed if col not found
            if (cellIndex < 0) {
                return;
            }

            // toggle the header cell
            $(header.find("th")[cellIndex])[func]();

            // toggle the header filter
            $(headerFilter.find("th")[cellIndex])[func]();

            // find and toggle the row cells
            rows = element.find("> .sui-gridcontent > table > tbody > tr");

            if (rows.length === 0) {
                rows = element.find("> .sui-gridcontent > .sui-virtualized > table > tbody > tr");
            }

            if (rows.length === 0) {
                rows = element.find("> .sui-gridcontent > .sui-content > table > tbody > tr");
            }

            for (i=0; i<rows.length; i++) {
                $(rows[i].cells[cellIndex])[func]();
            }
        },

        _afterColumnVisibilityChange: function() {
            var self = this,
                visibleColumnCount = self._getVisibleColumnCount(),
                dataSource = self.dataSource,
                dsGroupLength = dataSource.group ? dataSource.group.length : 0;

            // update the colspan of cells spanning to more than one column
            $(self.contentTable).find('.sui-grid-norecords-cell, .sui-detail-cell, .sui-group-header-cell').each(function() {
                if ($(this).hasClass('sui-group-header-cell')) {
                    $(this).attr('colspan', visibleColumnCount + dsGroupLength - toInt($(this).parent().attr('data-group-level')) + 1);
                }
                else {
                    $(this).attr('colspan', visibleColumnCount);
                }
            });
        },

        _getVisibleColumnFields: function() {
            var self = this,
                columns = self.columns || [],
                columnsLen = columns.length,
                fields = [],
                i;

            for (i=0; i<columnsLen; i++) {
                if (columns[i].visible) {
                    fields.push(columns[i].field);
                }
            }

            return fields;
        },

        // Frozen columns

        // NOTE: the method below should be called on a clean grid - 
        // it assumes that all cols are rendered as unlocked initially
        _initFrozenCols: function() {
            var self = this,
                columns = self.columns,
                columnsLength = columns.length,
                i,
                hasLocked = false;

            // optimization - do this only if there is at least one locked,
            // because the default state and rendering of the columns is unlocked
            for (i=0; i<columnsLength; i++) {
                if (columns[i].locked) {
                    hasLocked = true;
                    break;
                }
            }

            if (!hasLocked) {
                return;
            }

            // init the frozen containers
            self._initFrozenContainers();

            // make sure each locked column is locked
            for (i=0; i<columnsLength; i++) {
                if (columns[i].locked) {
                    self.lockColumn(columns[i].field);
                }
            }
        },

        _initFrozenContainers: function() {
            var self = this,
                options = self.options,
                scrolling = options.scrolling;

            if (!self.frozenHeaderWrapper) {
                self.frozenHeaderWrapper = $('<div class="sui-header-locked"/>')
                    .prependTo(scrolling ? self.headerWrapper.parent() : self.headerWrapper);

                self.frozenHeaderTable = $(
                    '<table class="sui-table sui-non-selectable"' + (isIE7 ? ' cellspacing="0"' : '') + '>' + 
                        '<colgroup/>' + 
                        '<thead>' + 
                            '<tr class="sui-columnheader"/>' + 
                            (options.filtering && options.filtering.enabled ? '<tr class="sui-filter-row"/>' : '') + 
                        '</thead>' + 
                        '<tbody class="sui-hide"/>' + 
                    '</table>'
                ).appendTo(self.frozenHeaderWrapper);
            }

            if (!self.frozenContentWrapper) {
                self.frozenContentWrapper = $('<div class="sui-content-locked"/>')
                    .prependTo(scrolling ? self.contentWrapper.parent() : self.contentWrapper);

                self.frozenContentWrapper.height(self.frozenContentWrapper.parent().find('.sui-content').first().height());

                self.frozenContentTable = $(
                    '<table class="sui-table' + (options.rowHover ? ' sui-hover' : '') + '"' + (isIE7 ? ' cellspacing="0"' : '') + '>' + 
                        '<colgroup/>' + 
                        '<tbody/>' + 
                        '<tfoot>' + // WARNING: that kind of rendering will work only for footers in non-virtual grids
                            '<tr class="sui-grid-footer"/>' + 
                        '</tfoot>' + 
                    '</table>'
                ).appendTo(self.frozenContentWrapper);

                if (self._hasDetailTemplate()) {
                    if (self._canExpandCollapse()) {
                        self.frozenContentTable.addClass("sui-expandable");
                    }

                    // NOTE: find the proper cells - only those for the main grid (and not for nested ones)
                    self.frozenContentTable.on(
                        CLICK + self._eventNS, 
                        "> tbody > tr > .sui-expand-cell, > tbody > tr > .sui-collapse-cell", 
                        proxy(self._expandCollapseDetailTemplate, self)
                    );
                }
            }
        },

        _destroyFrozenContainers: function() {
            var self = this;

            if (self.frozenHeaderWrapper) {
                $(self.frozenHeaderWrapper).remove();
                self.frozenHeaderWrapper = null;
            }

            if (self.frozenContentWrapper) {
                $(self.frozenContentWrapper).find('.sui-table').off(self._eventNS);
                $(self.frozenContentWrapper).remove();
                self.frozenContentWrapper = null;
            }
        },

        isLocked: function(fieldName) {
            var column = this._getColumnByField(fieldName);
            return column ? column.locked : UNDEFINED;
        },

        lockColumn: function(fieldName) {
            var self = this,
                element = $(self.element),
                filteringOptions = self.options.filtering,
                column = self._getColumnByField(fieldName),
                cellIndex = -1,
                footer = self._footer,
                rows,
                i;

            if (!column || !column.visible) {
                return;
            }

            // move the respective header col to the locked table
            $(self.headerTable).find('colgroup').first().find("col").each(function() {
                if ($(this).data(SUI_FIELDNAME) == fieldName) {
                    $(this).appendTo($(self.frozenHeaderTable).find('colgroup'));
                    return false;
                }
            });

            // move the respective content col to the locked table
            $(self.contentTable).find('colgroup').first().find("col").each(function() {
                if ($(this).data(SUI_FIELDNAME) == fieldName) {
                    $(this).appendTo($(self.frozenContentTable).find('colgroup'));
                    return false;
                }
            });

            // find the index of the cell by looking in the header row and move the TH
            $(self.headerTable).find(".sui-columnheader").children().each(function(index) {
                if ($(this).attr('data-field') == fieldName) {
                    cellIndex = index;
                    $(this).appendTo($(self.frozenHeaderTable).find('.sui-columnheader'));
                    return false;
                }
            });

            // find and move any filter
            if (filteringOptions && filteringOptions.enabled && cellIndex >= 0) {
                $(self.headerTable).find(".sui-filter-row").children().each(function(index) {
                    if ($(this).attr('data-field') == fieldName) {
                        $(this).appendTo($(self.frozenHeaderTable).find('.sui-filter-row'));
                        return false;
                    }
                });
            }

            // find any footer
            if (footer && cellIndex >= 0) {
                // NOTE: fix this for virtual grid
                var frozenFooterRow = $(self.frozenContentTable).find('> tfoot > .sui-grid-footer');

                $(footer).find('.sui-grid-footer td:eq(' + cellIndex + ')').appendTo(frozenFooterRow);
            }

            if (cellIndex >= 0) {
                // find the rows and move the TDs
                rows = element.find("> .sui-gridcontent > table > tbody > tr");

                if (rows.length === 0) {
                    rows = element.find("> .sui-gridcontent > .sui-virtualized > table > tbody > tr");
                }

                if (rows.length === 0) {
                    rows = element.find("> .sui-gridcontent > .sui-content > table > tbody > tr");
                }

                var frozenContentTableTbody = $(self.frozenContentTable).find('tbody'),
                    hasLockedRows = frozenContentTableTbody.children().length > 0;

                for (i=0; i<rows.length; i++) {
                    var targetRow = null;

                    if (!hasLockedRows) {
                        // no TRs have been created - 
                        targetRow = $(rows[i]).clone(true, false).empty().appendTo(frozenContentTableTbody);
                    }
                    else {
                        // TRs have been created - so find the correct one by index
                        //targetRow = $(frozenContentTableTbody).find('tr:eq(' + i + ')');
                        targetRow = $(frozenContentTableTbody).children()[i];
                    }

                    $(rows[i].cells[cellIndex]).appendTo(targetRow);
                }
            }

            column.locked = true;

            // adjust the main header and content widths
            self._adjustWidthsLocked();
            self._adjustHeightsLocked();
        },

        unlockColumn: function(fieldName) {
            var self = this,
                element = $(self.element),
                filteringOptions = self.options.filtering,
                columns = self.columns,
                footer = self._footer,
                column = self._getColumnByField(fieldName),
                lockedHeaderCol,
                lockedHeaderIndex = -1,
                lockedContentCol,
                lockedContentIndex = -1,
                nextUnlockedColumnField,
                i;

            if (!column || !column.visible) {
                return;
            }

            // find the colgroups
            $(self.frozenHeaderTable).find('colgroup').first().children().each(function() {
                if ($(this).data(SUI_FIELDNAME) == fieldName) {
                    lockedHeaderCol = $(this);
                    lockedHeaderIndex = $(this).index();
                    return false;
                }
            });

            $(self.frozenContentTable).find('colgroup').first().children().each(function() {
                if ($(this).data(SUI_FIELDNAME) == fieldName) {
                    lockedContentCol = $(this);
                    lockedContentIndex = $(this).index();
                    return false;
                }
            });

            for (i=0; i<columns.length; i++) {
                if (columns[i].field === fieldName) {
                    if (i <= columns.length - 2) {
                        nextUnlockedColumnField = columns[i+1].field;
                    }
                    break;
                }
            }

            // move the col-s
            if (nextUnlockedColumnField) {
                // find the header col
                $(self.headerTable).find('> colgroup col').each(function(index) {
                    if ($(this).data(SUI_FIELDNAME) === nextUnlockedColumnField) {
                        // move the col
                        $(lockedHeaderCol).insertBefore($(this));
                        
                        // move the TH
                        $(self.frozenHeaderTable).find('.sui-columnheader th:eq(' + lockedHeaderIndex + ')').insertBefore(
                            $(self.headerTable).find('.sui-columnheader th:eq(' + index + ')')
                        );

                        // move the filter
                        if (filteringOptions && filteringOptions.enabled) {
                            $(self.frozenHeaderTable).find('.sui-filter-row th:eq(' + lockedHeaderIndex + ')').insertBefore(
                                $(self.headerTable).find('.sui-filter-row th:eq(' + index + ')')
                            );
                        }

                        // move the footer
                        if (footer) {
                            // NOTE: fix this to work for virtual mode
                            var frozenFooterRow = $(self.frozenContentTable).find('> tfoot > .sui-grid-footer');

                            $(frozenFooterRow).find('td:eq(' + lockedHeaderIndex + ')').insertBefore(
                                $(footer).find('.sui-grid-footer td:eq(' + index + ')')
                            );
                        }

                        return false;
                    }
                });

                // find the content col
                $(self.contentTable).find('> colgroup col').each(function(index) {
                    if ($(this).data(SUI_FIELDNAME) === nextUnlockedColumnField) {
                        // move the col
                        $(lockedContentCol).insertBefore($(this));

                        // move the TDs
                        var contentTableRows = $(self.contentTable).find('>tbody').first().children();

                        $(self.frozenContentTable).find('>tbody > tr').each(function(rowIndex) {
                            $(this).find('td:eq(' + lockedContentIndex + ')').insertBefore(
                                $(contentTableRows[rowIndex]).find('td:eq(' + index + ')')
                            );
                        });

                        return false;
                    }
                });
            }
            else {
                // append the locked col to the 
                $(self.headerTable).find('colgroup').append(lockedHeaderCol);
                $(self.contentTable).find('colgroup').append(lockedContentCol);

                // move the TH
                $(self.frozenHeaderTable).find('.sui-columnheader th:eq(' + lockedHeaderIndex + ')').appendTo(
                    $(self.headerTable).find('.sui-columnheader')
                );

                // move the filter
                if (filteringOptions && filteringOptions.enabled) {
                    $(self.frozenHeaderTable).find('.sui-filter-row th:eq(' + lockedHeaderIndex + ')').appendTo(
                        $(self.headerTable).find('.sui-filter-row')
                    );
                }

                // move the footer
                if (footer) {
                    // NOTE: fix this to work for virtual mode
                    var frozenFooterRow = $(self.frozenContentTable).find('> tfoot > .sui-grid-footer');

                    $(frozenFooterRow).find('td:eq(' + lockedHeaderIndex + ')').appendTo(
                        $(footer).find('.sui-grid-footer')
                    );
                }

                // move the TDs
                var contentTableRows = $(self.contentTable).find('>tbody').first().children();

                $(self.frozenContentTable).find('>tbody > tr').each(function(rowIndex) {
                    $(this).find('td:eq(' + lockedContentIndex + ')').appendTo(
                        $(contentTableRows[rowIndex])
                    );
                });
            }

            column.locked = false;

            // adjust the main header and content widths
            self._adjustWidthsLocked();
            self._adjustHeightsLocked();
        },

        _adjustWidthsLocked: function() {
            var self = this;

            if (self.frozenHeaderWrapper) {
                // clear the padding from the header added by scrolling
                $(self.headerWrapper).parent().css((support.isRtl(self.element) ? "padding-left" : "padding-right"), 0);

                $(self.headerWrapper).outerWidth($(self.headerWrapper).parent().innerWidth() - $(self.frozenHeaderWrapper).outerWidth() - support.scrollbar());
                $(self.contentWrapper).outerWidth($(self.contentWrapper).parent().innerWidth() - $(self.frozenContentWrapper).outerWidth() - 1);
            }
        },

        _adjustHeightsLocked: function(reinitScrolling) {
            var self = this,
                filterOptions = self.options.filtering,
                footer = self._footer,
                frozenRows,
                frozenRowHeight,
                rows,
                rowHeight,
                frozenHeaderRow,
                frozenHeaderHeight,
                headerRow,
                headerHeight,
                filterHeaderRow,
                filterHeaderHeight,
                filterRow,
                filterHeight,
                i;

            if (self.frozenHeaderWrapper) {
                // sync header row heights - choose the maximum of the two
                frozenHeaderRow = $(self.frozenHeaderTable).find("tr").first();
                frozenHeaderRow.height("auto"); // reset the height to auto-size
                frozenHeaderHeight = toInt(frozenHeaderRow.height());
                headerRow = $(self.headerTable).find("tr").first();
                headerRow.height("auto"); // reset the height to auto-size
                headerHeight = toInt(headerRow.height());

                if (frozenHeaderHeight > headerHeight) {
                    frozenHeaderRow.height(frozenHeaderHeight);
                    headerRow.height(frozenHeaderHeight);
                }
                else if (frozenHeaderHeight < headerHeight) {
                    frozenHeaderRow.height(headerHeight);
                    headerRow.height(headerHeight);
                }

                // sync filter row height
                if (filterOptions && filterOptions.enabled) {
                    filterHeaderRow = $(self.frozenHeaderTable).find("tr.sui-filter-row").first();
                    filterHeaderRow.height("auto");
                    filterHeaderHeight = toInt(filterHeaderRow.height());

                    filterRow = $(self.headerTable).find("tr.sui-filter-row").first();
                    filterRow.height("auto"); // reset the height to auto-size
                    filterHeight = toInt(filterRow.height());
                    
                    if (filterHeaderHeight > filterHeight) {
                        filterHeaderRow.height(filterHeaderHeight);
                        filterRow.height(filterHeaderHeight);
                    }
                    else if (filterHeaderHeight < filterHeight) {
                        filterHeaderRow.height(filterHeight);
                        filterRow.height(filterHeight);
                    }
                }

                // sync all rows heights - choosing the maximum of the two
                frozenRows = $(self.frozenContentTable).find('tbody').first().children();
                rows = $(self.contentTable).find('> tbody').children();
                for (i=0; i<rows.length; i++) {
                    $(frozenRows[i]).height("auto"); // reset the height to auto-size
                    frozenRowHeight = toInt($(frozenRows[i]).height());

                    $(rows[i]).height("auto"); // reset the height to auto-size
                    rowHeight = toInt($(rows[i]).height());

                    if (frozenRowHeight > rowHeight) {
                        $(frozenRows[i]).height(frozenRowHeight);
                        $(rows[i]).height(frozenRowHeight);
                    }
                    else if (frozenRowHeight < rowHeight) {
                        $(frozenRows[i]).height(rowHeight);
                        $(rows[i]).height(rowHeight);
                    }
                }

                // sync the footer heights - choose the maximum of the two
                if (footer) {
                    // NOTE: fix this to work with virtualized mode
                    var frozenFooterRow = $(self.frozenContentTable).find('> tfoot > .sui-grid-footer'),
                        footerRow = $(footer).find('.sui-grid-footer').first(),
                        frozenFooterRowHeight,
                        footerRowHeight;

                    frozenFooterRow.height("auto");
                    frozenFooterRowHeight = toInt(frozenFooterRow.height());
                    footerRow.height("auto");
                    footerRowHeight = toInt(footerRow.height());

                    if (frozenFooterRowHeight > footerRowHeight) {
                        frozenFooterRow.height(frozenFooterRowHeight);
                        footerRow.height(frozenFooterRowHeight);
                    }
                    else if (frozenFooterRowHeight < footerRowHeight) {
                        frozenFooterRow.height(footerRowHeight);
                        footerRow.height(footerRowHeight);
                    }
                }

                if (reinitScrolling) {
                    self._initScrolling();
                }
            }
        }
        
    });

    Grid.defaults = defaults;
    shield.ui.plugin("Grid", Grid);

})(jQuery, shield, this);