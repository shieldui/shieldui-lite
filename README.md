# Shield UI Lite

## Introduction

[**Shield UI**](http://www.shieldui.com) specializes in the design and production of specialized highly functional and flexible UI components for pure JavaScript development, 
as well as development for ASP.NET, ASP.NET MVC and JAVA Wicket. The Shield UI component Suite consists of more than 70 widget types. 

The Shield UI Lite bundle offers a fully functional set of web development jQuery components, ranging from smaller input controls to large components such as the Shield UI jQuery Grid. 

The widgets included in the present Suite are listed below.

### Included Widgets

* [AutoComplete](https://demos.shieldui.com/web/autocomplete/basic-usage)
* [Button](https://demos.shieldui.com/web/button/basic-usage)
* [Calendar](https://demos.shieldui.com/web/calendar/basic-usage)
* [CheckBox](https://demos.shieldui.com/web/checkbox/basic-usage)
* [ComboBox](https://demos.shieldui.com/web/combobox/basic-usage)
* [DataSource](http://www.shieldui.com/documentation/datasource)
* [DatePicker](https://demos.shieldui.com/web/datepicker/basic-usage)
* [DateTimePicker](https://demos.shieldui.com/web/datetimepicker/api)
* [DropDown](https://demos.shieldui.com/web/dropdown/basic-usage)
* [Grid](https://demos.shieldui.com/web/grid-general/basic-usage)
* [ListBox](https://demos.shieldui.com/web/listbox/basic-usage)
* [LoadingPanel](https://demos.shieldui.com/web/loadingpanel/template)
* [MaskedTextBox](https://demos.shieldui.com/web/maskedtextbox/basic-usage)
* [MonthYearPicker](https://demos.shieldui.com/web/monthyearpicker/basic-usage)
* [NumericTextBox](https://demos.shieldui.com/web/numerictextbox/basic-usage)
* [Pager](https://demos.shieldui.com/web/pager/basic-usage)
* [QRCode](https://demos.shieldui.com/web/qrcode/basic-usage)
* [RadioButton](https://demos.shieldui.com/web/radiobutton/basic-usage)
* [Switch](https://demos.shieldui.com/web/switch/preferences)
* [TextBox](https://demos.shieldui.com/web/textbox/basic-usage)
* [TimePicker](https://demos.shieldui.com/web/timepicker/basic-usage)

## Requirements and Dependencies

Shield UI Lite depends on the following external JavaScript libraries:

* jQuery 1.9.1+. Shield UI has also been tested with jQuery 2+
* Globalize 0.1.0+

Additionally, the build process will download the following testing libraries, but they will not be needed for the library's execution:

* QUnit
* Sinon.JS

## Building Shield UI Lite

In order to use the Shield UI Lite library, you must build it from source.

Alternatively, you can download and use the Trial version of Shield UI, available [here](https://www.shieldui.com/download).

### Prerequisites

To build Shield UI Lite from the source code, you will need [NodeJS](https://nodejs.org/), [Git](http://git-scm.com/) and [Grunt](http://gruntjs.com/).

#### Install NodeJS
Download and install NodeJS from [their website](https://nodejs.org/).

#### Install Git
Download and install Git from [their website](http://gruntjs.com/). 

NOTE: You will need to install Git with the "Run Git from the Windows Command Prompt" option in order to be used by Bower, as it is shown below:
> [ ] Use Git bash only
>
> [x] Run Git from the Windows Command Prompt
>
> [ ] Run Git and included Unix tools from the Windows Command Prompt

#### Install Grunt
Install Grunt globally with the following console command:

```bash
npm install -g grunt-cli
```

### Build Process

To build the Shield UI Lite library, go to your shieldui-lite directory and use the following commands:

```bash
npm install

grunt build
```

If the build is successful, you should see the following message:
```bash
Done, without errors.
```

At this point the compiled Shield UI Lite JavaScript and CSS resources should be located in the `dist` directory.
The dependencies such as jQuery and Gloablize should be in `external`.

### Documentation and Usage

The widgets present in the ShieldUI Lite Suite are fully documented. 

To see more information on how to get started using them, please refer to the following [documentation page](http://www.shieldui.com/documentation). 

To see the specific information for a particular widget, simply navigate to the widget that you interested in. There is a separate documentation section for each widget. 

If you are new to the widget, the most important section to start from is the **Getting Started** topic. For example, to see how to use the ShieldUI jQuery Grid component, simply navigate to the getting started topic in its section, located [here](http://www.shieldui.com/documentation/grid/javascript/getting.started). 

## Changelog

For details about changes and release notes, see the [Shield UI Changelog](http://www.shieldui.com/changelog).

## ShieldUI Lite and ShieldUI Standard bundles

The table below summarizes the components included in the two versions of the ShieldUI jQuery Suites - the Lite and Standard versions. For a complete list of components, please visit the online [demos]( https://demos.shieldui.com) section. 

| Component       | ShieldUI Lite | ShieldUI Standard |
|-----------------|:---------------:|:-------------:|
| [AutoComplete](https://demos.shieldui.com/web/autocomplete/basic-usage)    |      Yes      |      Yes     |
| [Button](https://demos.shieldui.com/web/button/basic-usage)          |      Yes      |      Yes     |
| [Calendar](https://demos.shieldui.com/web/calendar/basic-usage)        |      Yes      |      Yes     |
| [CheckBox](https://demos.shieldui.com/web/checkbox/basic-usage)        |      Yes      |      Yes     |
| [ComboBox](https://demos.shieldui.com/web/combobox/basic-usage)        |      Yes      |      Yes     |
| [DataSource](http://www.shieldui.com/documentation/datasource)      |      Yes      |      Yes     |
| [DatePicker](https://demos.shieldui.com/web/datepicker/basic-usage)      |      Yes      |      Yes     |
| [DateTimePicker](https://demos.shieldui.com/web/datetimepicker/api)  |      Yes      |      Yes     |
| [DropDown](https://demos.shieldui.com/web/dropdown/basic-usage)        |      Yes      |      Yes     |
| [Grid](https://demos.shieldui.com/web/grid-general/basic-usage)            |      Yes      |      Yes     |
| [ListBox](https://demos.shieldui.com/web/listbox/basic-usage)         |      Yes      |      Yes     |
| [LoadingPanel](https://demos.shieldui.com/web/loadingpanel/template)    |      Yes      |      Yes     |
| [MaskedTextBox](https://demos.shieldui.com/web/maskedtextbox/basic-usage)   |      Yes      |      Yes     |
| [MonthYearPicker](https://demos.shieldui.com/web/monthyearpicker/basic-usage) |      Yes      |      Yes     |
| [NumericTextBox](https://demos.shieldui.com/web/numerictextbox/basic-usage)  |      Yes      |      Yes     |
| [Pager](https://demos.shieldui.com/web/pager/basic-usage)           |      Yes      |      Yes     |
| [QRCode](https://demos.shieldui.com/web/qrcode/basic-usage)          |      Yes      |      Yes     |
| [RadioButton](https://demos.shieldui.com/web/radiobutton/basic-usage)     |      Yes      |      Yes     |
| [Switch](https://demos.shieldui.com/web/switch/preferences)          |      Yes      |      Yes     |
| [TextBox](https://demos.shieldui.com/web/textbox/basic-usage)         |      Yes      |      Yes     |
| [TimePicker](https://demos.shieldui.com/web/timepicker/basic-usage)      |      Yes      |      Yes     |
| [Chart](https://demos.shieldui.com/web/area-chart/axis-marker)           |       No      |      Yes     |
| [Editor](https://demos.shieldui.com/web/editor/basic-usage)           |       No      |      Yes     |
| [Barcode Suite](https://demos.shieldui.com/web/barcode/basic-usage)   |       No      |      Yes     |
| [Accordion](https://demos.shieldui.com/web/accordion/basic-usage)       |       No      |      Yes     |
| [ColorPicker](https://demos.shieldui.com/web/colorpicker/basic-usage)     |       No      |      Yes     |
| [ProgressBar](https://demos.shieldui.com/web/progressbar/basic-usage)    |       No      |      Yes     |
| [Rating](https://demos.shieldui.com/web/rating/evaluation)          |       No      |      Yes     |
| [Slider](https://demos.shieldui.com/web/slider/basic-usage)          |       No      |      Yes     |
| [Splitter](https://demos.shieldui.com/web/splitter/basic-usage)        |       No      |      Yes     |
| [Timeline](https://demos.shieldui.com/web/timeline/basic-usage)         |       No      |      Yes     |
| [Tooltip](https://demos.shieldui.com/web/tooltip/basic-usage)         |       No      |      Yes     |
| [TreeMap](https://demos.shieldui.com/web/treemap/basic-usage)         |       No      |      Yes     |
| [TreeView](https://demos.shieldui.com/web/treeview/basic-usage)         |       No      |      Yes     |
| [Upload](https://demos.shieldui.com/web/upload/basic-usage)         |       No      |      Yes     |
| [Window](https://demos.shieldui.com/web/window/basic-functionality)          |       No      |      Yes     |

## License Information

The Shield UI Lite library is licensed under the MIT license, details of which can be found in the [LICENSE.txt](LICENSE.txt) file located in this folder.
The license applies ONLY to the source code of this repository and does not extend to any other Shield UI distribution or variant, or a third-party library used. 

For more details about Shield UI licensing, see the [Shield UI License Agreement](https://www.shieldui.com/eula) page at [www.shieldui.com](https://www.shieldui.com).
Shield UI Commercial support information can be found on [this page](https://www.shieldui.com/support.options).
