(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		shieldConstants = shield.Constants,
		Class = shield.Class,
		doc = document,

		SVG_NS = shieldConstants.SVG_NS,
		HAS_SVG = !!doc.createElementNS && !!doc.createElementNS(SVG_NS, "svg").createSVGRect,

		map = $.map,
		toInt = shield.to["int"],
		error = shield.error,

		// some utility functions
		decimalToBinary = function(value) {
		    return toInt(value, 10).toString(2);
		},
		binaryToDecimal = function(value) {
		    return toInt(value, 2);
		},
		padLeft = function(value, length) {
		    value += "";
		    while (value.length < length) {
		        value = "0" + value;
		    }
		    return value;
		},
		padRight = function(value, length) {
		    value += "";
		    while (value.length < length) {
		        value += "0";
		    }
		    return value;
		},

		// the types of encodings
		MODE_BYTE = "byte",
		MODE_NUMERIC = "numeric",
		MODE_ALPHANUMERIC = "alphanumeric";

    /////////////////////////////////////////////////////////////////////
    // QRCODE ENCODER CLASSES
    /////////////////////////////////////////////////////////////////////

    // qrcode encoder class factory
    // a static class
    var QRCodeEncoderFactory = {
        modes: [],
        addMode: function (modeClass) {
            this.modes[modeClass.prototype.mode] = modeClass;
        },
        byMode: function (mode) {
            return this.modes[mode] ? new this.modes[mode]() : null;
        }
    };

    // a base qrcode encoder class
    var BaseQRCodeEncoder = Class.extend({
        // properties
        mode: null,		// the qrcode mode
        codeMode: null,	// the code of the mode
        validateRegex: null,	// a string regular expression; if existing, will be used to test the value

        // the maximum length for a string in a given version-errorLevel combination
        _verErrLenTable: {
            "1L": 152, "1M": 128, "1Q": 104, "1H": 72,
            "2L": 272, "2M": 224, "2Q": 176, "2H": 128,
            "3L": 440, "3M": 352, "3Q": 272, "3H": 208,
            "4L": 640, "4M": 512, "4Q": 384, "4H": 288,
            "5L": 864, "5M": 688, "5Q": 496, "5H": 368,
            "6L": 1088, "6M": 864, "6Q": 608, "6H": 480,
            "7L": 1248, "7M": 992, "7Q": 704, "7H": 528,
            "8L": 1552, "8M": 1232, "8Q": 880, "8H": 688,
            "9L": 1856, "9M": 1456, "9Q": 1056, "9H": 800,
            "10L": 2192, "10M": 1728, "10Q": 1232, "10H": 976,
            "11L": 2592, "11M": 2032, "11Q": 1440, "11H": 1120,
            "12L": 2960, "12M": 2320, "12Q": 1648, "12H": 1264,
            "13L": 3424, "13M": 2672, "13Q": 1952, "13H": 1440,
            "14L": 3688, "14M": 2920, "14Q": 2088, "14H": 1576,
            "15L": 4184, "15M": 3320, "15Q": 2360, "15H": 1784,
            "16L": 4712, "16M": 3624, "16Q": 2600, "16H": 2024,
            "17L": 5176, "17M": 4056, "17Q": 2936, "17H": 2264,
            "18L": 5768, "18M": 4504, "18Q": 3176, "18H": 2504,
            "19L": 6360, "19M": 5016, "19Q": 3560, "19H": 2728,
            "20L": 6888, "20M": 5352, "20Q": 3880, "20H": 3080,
            "21L": 7456, "21M": 5712, "21Q": 4096, "21H": 3248,
            "22L": 8048, "22M": 6256, "22Q": 4544, "22H": 3536,
            "23L": 8752, "23M": 6880, "23Q": 4912, "23H": 3712,
            "24L": 9392, "24M": 7312, "24Q": 5312, "24H": 4112,
            "25L": 10208, "25M": 8000, "25Q": 5744, "25H": 4304,
            "26L": 10960, "26M": 8496, "26Q": 6032, "26H": 4768,
            "27L": 11744, "27M": 9024, "27Q": 6464, "27H": 5024,
            "28L": 12248, "28M": 9544, "28Q": 6968, "28H": 5288,
            "29L": 13048, "29M": 10136, "29Q": 7288, "29H": 5608,
            "30L": 13880, "30M": 10984, "30Q": 7880, "30H": 5960,
            "31L": 14744, "31M": 11640, "31Q": 8264, "31H": 6344,
            "32L": 15640, "32M": 12328, "32Q": 8920, "32H": 6760,
            "33L": 16568, "33M": 13048, "33Q": 9368, "33H": 7208,
            "34L": 17528, "34M": 13800, "34Q": 9848, "34H": 7688,
            "35L": 18448, "35M": 14496, "35Q": 10288, "35H": 7888,
            "36L": 19472, "36M": 15312, "36Q": 10832, "36H": 8432,
            "37L": 20528, "37M": 15936, "37Q": 11408, "37H": 8768,
            "38L": 21616, "38M": 16816, "38Q": 12016, "38H": 9136,
            "39L": 22496, "39M": 17728, "39Q": 12656, "39H": 9776,
            "40L": 23648, "40M": 18672, "40Q": 13328, "40H": 10208
        },
		_errorCorrectionToMask: {
			"L": "01",
			"M": "00",
			"Q": "11",
			"H": "10"
		},
		_formatInformation: {
			"00000": "101010000010010",
			"00001": "101000100100101",
			"00010": "101111001111100",
			"00011": "101101101001011",
			"00100": "100010111111001",
			"00101": "100000011001110",
			"00110": "100111110010111",
			"00111": "100101010100000",
			"01000": "111011111000100",
			"01001": "111001011110011",
			"01010": "111110110101010",
			"01011": "111100010011101",
			"01100": "110011000101111",
			"01101": "110001100011000",
			"01110": "110110001000001",
			"01111": "110100101110110",
			"10000": "001011010001001",
			"10001": "001001110111110",
			"10010": "001110011100111",
			"10011": "001100111010000",
			"10100": "000011101100010",
			"10101": "000001001010101",
			"10110": "000110100001100",
			"10111": "000100000111011",
			"11000": "011010101011111",
			"11001": "011000001101000",
			"11010": "011111100110001",
			"11011": "011101000000110",
			"11100": "010010010110100",
			"11101": "010000110000011",
			"11110": "010111011011010",
			"11111": "010101111101101"
		},

        // @proto bool validate(value)
        // Returns whether the value is valid for this mode or not
        validate: function (value) {
            if (this.validateRegex) {
                return new RegExp(this.validateRegex).test(value);
            }
            return true;
        },

        // @proto array encode(value, errorLevel)
        // Returns a matrix representing the encoded qrcode data
        encode: function (value, errorLevel) {
            
            var self = this,
				version = self._getVersion(value, errorLevel),
				quietZone = 4,
				sizeOfData = 21 + ((version - 1) * 4),
				sizeOfMatrix = sizeOfData + (quietZone * 2),
				versionKey = version + errorLevel,
				formatData = self._getFormatData(value, errorLevel),
				encodedValue = self.encodeValue(value),
				dataLength = self._getDataLength(value, errorLevel),
                paddingLength = dataLength - (formatData.length + encodedValue.length) > 4 ? 4 : dataLength - (formatData.length + encodedValue.length),
				binaryValues,
				intValues,
				intValuesNoEC,
				binaryMatrix;

            // pad the encoded value
            encodedValue = padRight(encodedValue, encodedValue.length + paddingLength);

            // get the binary values for the format and encoded
            binaryValues = self._getBinaryValues(formatData + encodedValue);

            // update the encoded value to the binary values
            encodedValue = binaryValues.join("");

            // pad the encoded value to the total data length
            encodedValue = self._padEncodedToLength(encodedValue, dataLength);

            // get the new binary values
            binaryValues = self._getBinaryValues(encodedValue);

            // init the integer values from the binary values
            intValuesNoEC = self._getIntegerValues(binaryValues);

            // add error correction
            encodedValue = self._getEC(versionKey, intValues, intValuesNoEC);

			// form the binary matrix
			binaryMatrix = self._getBinaryMatrix(encodedValue, version, sizeOfData, sizeOfMatrix, errorLevel);

			return binaryMatrix;
        },

        // @proto string encodeValue(value)
        // Returns the encoded value
        encodeValue: null,


        // private methods

		// form the binary matrix
		_getBinaryMatrix: function(encodedValue, version, sizeOfData, sizeOfMatrix, errorLevel) {
			var self = this,
				maskCodes = ["000", "001", "010", "011", "100", "101", "110", "111"],
				rulesPenalties = [],
				binaryMatrix = [],
				filledValuesMatrix = [],
				penalty,
				smallestPenaltyIndex,
				matrix,
				matrixIndex,
				i,
				j,
				posAdjustments = self._getPositionAdjustmentsTable(),
				row,
				col;

			// initialize the binary matrix with false values
			for (i=0; i<sizeOfMatrix; i++) {
				binaryMatrix[i] = [];
				for (j=0; j<sizeOfMatrix; j++) {
					binaryMatrix[i][j] = 0;
				}
			}

			// init the filledValuesMatrix 
			for (i=0; i<sizeOfData; i++) {
				filledValuesMatrix.push(new Array(sizeOfData));
			}

			// fill some finder patterns stuff
			self._fullFinderPattern(binaryMatrix, 4, 4);
			self._fillFinderPatternFilledValues(filledValuesMatrix, 0, 0);
			self._fullFinderPattern(binaryMatrix, 4, sizeOfMatrix - 11);
			self._fillFinderPatternFilledValues(filledValuesMatrix, 0, sizeOfData - 8);
			self._fullFinderPattern(binaryMatrix, sizeOfMatrix - 11, 4);
			self._fillFinderPatternFilledValues(filledValuesMatrix, sizeOfData - 8, 0);

			// add timing pattern to binary matrix and filled values
			self._fillTimingPattern(binaryMatrix, filledValuesMatrix, sizeOfData);

			// set a single pixel 
			binaryMatrix[sizeOfMatrix - 12][12] = 1;
            filledValuesMatrix[sizeOfMatrix - 16][8] = 1;

			// if versions > 1, fill position adjustment
			if (version > 1) {
			    for (i = 0; i < posAdjustments[version].length; i++) {
			        for (j = 0; j < posAdjustments[version].length; j++) {
			            row = posAdjustments[version][i] + 4;
			            col = posAdjustments[version][j] + 4;

						if (!(row == 10 && col == 10) && !(row == 10 && col == sizeOfMatrix - 11) && !(row == sizeOfMatrix - 11 && col == 10)) {
							binaryMatrix[row - 2][col - 2] = 1;
							filledValuesMatrix[row - 6][col - 6] = 1;
							binaryMatrix[row - 2][col - 1] = 1;
							filledValuesMatrix[row - 6][col - 5] = 1;
							binaryMatrix[row - 2][col] = 1;
							filledValuesMatrix[row - 6][col - 4] = 1;
							binaryMatrix[row - 2][col + 1] = 1;
							filledValuesMatrix[row - 6][col - 3] = 1;
							binaryMatrix[row - 2][col + 2] = 1;
							filledValuesMatrix[row - 6][col - 2] = 1;

							binaryMatrix[row - 1][col - 2] = 1;
							filledValuesMatrix[row - 5][col - 6] = 1;
							binaryMatrix[row - 1][col - 1] = 0;
							filledValuesMatrix[row - 5][col - 5] = 1;
							binaryMatrix[row - 1][col] = 0;
							filledValuesMatrix[row - 5][col - 4] = 1;
							binaryMatrix[row - 1][col + 1] = 0;
							filledValuesMatrix[row - 5][col - 3] = 1;
							binaryMatrix[row - 1][col + 2] = 1;
							filledValuesMatrix[row - 5][col - 2] = 1;

							binaryMatrix[row][col - 2] = 1;
							filledValuesMatrix[row - 4][col - 6] = 1;
							binaryMatrix[row][col - 1] = 0;
							filledValuesMatrix[row - 4][col - 5] = 1;
							binaryMatrix[row][col] = 1;
							filledValuesMatrix[row - 4][col - 4] = 1;
							binaryMatrix[row][col + 1] = 0;
							filledValuesMatrix[row - 4][col - 3] = 1;
							binaryMatrix[row][col + 2] = 1;
							filledValuesMatrix[row - 4][col - 2] = 1;

							binaryMatrix[row + 1][col - 2] = 1;
							filledValuesMatrix[row - 3][col - 6] = 1;
							binaryMatrix[row + 1][col - 1] = 0;
							filledValuesMatrix[row - 3][col - 5] = 1;
							binaryMatrix[row + 1][col] = 0;
							filledValuesMatrix[row - 3][col - 4] = 1;
							binaryMatrix[row + 1][col + 1] = 0;
							filledValuesMatrix[row - 3][col - 3] = 1;
							binaryMatrix[row + 1][col + 2] = 1;
							filledValuesMatrix[row - 3][col - 2] = 1;

							binaryMatrix[row + 2][col - 2] = 1;
							filledValuesMatrix[row - 2][col - 6] = 1;
							binaryMatrix[row + 2][col - 1] = 1;
							filledValuesMatrix[row - 2][col - 5] = 1;
							binaryMatrix[row + 2][col] = 1;
							filledValuesMatrix[row - 2][col - 4] = 1;
							binaryMatrix[row + 2][col + 1] = 1;
							filledValuesMatrix[row - 2][col - 3] = 1;
							binaryMatrix[row + 2][col + 2] = 1;
							filledValuesMatrix[row - 2][col - 2] = 1;
						}
					}
				}
			}

			// if version >= 7, fill version data
			if (version >= 7) {
			    self._fillHigherVersionData(binaryMatrix, filledValuesMatrix, version, sizeOfData, sizeOfMatrix);				
			}

			for (matrixIndex = 0; matrixIndex < 8; matrixIndex++) {
				penalty = 0;

				matrix = [];
				for (i=0; i<binaryMatrix.length; i++) {
					matrix.push(binaryMatrix[i].slice(0));
				}

				// fill some format data in binary and filled values matrices
				self._fillFormatData(binaryMatrix, filledValuesMatrix, sizeOfData, sizeOfMatrix, maskCodes[matrixIndex], errorLevel);

				// fill some data in the matrix
				self._fillMatrix(filledValuesMatrix, matrix, maskCodes[matrixIndex], sizeOfData, encodedValue);

				// calculate the penalty
				penalty += self._calcPenalty1(matrix, sizeOfData);
				penalty += self._calcPenalty2(matrix, sizeOfData);
				penalty += self._calcPenalty3(matrix, sizeOfData);
				penalty += self._calcPenalty4(matrix, sizeOfData);

				rulesPenalties.push(penalty);
			}

			// get the smallest penalty index
			smallestPenaltyIndex = self._getSmallestPenaltyIndex(rulesPenalties);

			// fill some format data
			self._fillFormatData(binaryMatrix, filledValuesMatrix, sizeOfData, sizeOfMatrix, maskCodes[smallestPenaltyIndex], errorLevel);

			// fill some data in the binary matrix
			self._fillMatrix(filledValuesMatrix, binaryMatrix, maskCodes[smallestPenaltyIndex], sizeOfData, encodedValue);

			return binaryMatrix;
		},

		_fillHigherVersionData: function(binaryMatrix, filledValuesMatrix, version, sizeOfData, sizeOfMatrix) {
			var self = this,
				positionValues = {
					7: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
					8: [0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
					9: [1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0],
					10: [1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
					11: [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0],
					12: [0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0],
					13: [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0],
					14: [1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0],
					15: [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0],
					16: [0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0],
					17: [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
					18: [1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
					19: [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0],
					20: [0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
					21: [1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
					22: [1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0],
					23: [0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0],
					24: [0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0],
					25: [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
					26: [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0],
					27: [0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0],
					28: [0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0],
					29: [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0],
					30: [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0],
					31: [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0],
					32: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
					33: [0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1],
					34: [0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
					35: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1],
					36: [1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1],
					37: [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
					38: [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1],
					39: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1],
					40: [1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1]
				},
				values = positionValues[version];

		    self._fillUpperVersionInformation(binaryMatrix, filledValuesMatrix, values, sizeOfData, sizeOfMatrix);
		    self._fillLowerVersionInformation(binaryMatrix, filledValuesMatrix, values, sizeOfData, sizeOfMatrix);
		},

		_fillUpperVersionInformation: function(binaryMatrix, filledValuesMatrix, values, sizeOfData, sizeOfMatrix) {
		    var columnIndexMatrix = sizeOfMatrix - 15,
				columnIndexData = sizeOfData - 11,
				actualIndex = 0,
				row;

		    for (row = 4; row < 10; row++) {		        
		        binaryMatrix[row][columnIndexMatrix] = values[actualIndex];
		        filledValuesMatrix[row - 4][columnIndexData] = 1;
		        actualIndex++;

		        binaryMatrix[row][columnIndexMatrix + 1] = values[actualIndex];
		        filledValuesMatrix[row - 4][columnIndexData + 1] = 1;
		        actualIndex++;

		        binaryMatrix[row][columnIndexMatrix + 2] = values[actualIndex];
		        filledValuesMatrix[row - 4][columnIndexData + 2] = 1;
		        actualIndex++;
		    }
		},

		_fillLowerVersionInformation: function (binaryMatrix, filledValuesMatrix, values, sizeOfData, sizeOfMatrix) {
		    var rowIndexMatrix = sizeOfMatrix - 13,
				rowIndexData = sizeOfData - 9,
				actualIndex = 0,
				column;

		    for (column = 4; column < 10; column++) {
		        binaryMatrix[rowIndexMatrix][column] = values[actualIndex];
		        filledValuesMatrix[rowIndexData][column - 4] = 1;
		        actualIndex++;

		        binaryMatrix[rowIndexMatrix - 1][column] = values[actualIndex];
		        filledValuesMatrix[rowIndexData - 1][column - 4] = 1;
		        actualIndex++;

		        binaryMatrix[rowIndexMatrix - 2][column] = values[actualIndex];
		        filledValuesMatrix[rowIndexData - 2][column - 4] = 1;
		        actualIndex++;
		    }
		},

		_getSmallestPenaltyIndex: function(rulesPenalties) {
			var smallestPenalty = rulesPenalties[0],
				smallestIndex = 0,
				i;

			for (i = 0; i < rulesPenalties.length; i++) {
                if (rulesPenalties[i] < smallestPenalty) {
                    smallestIndex = i;
				}
            }

			return smallestIndex;
		},

		_calcPenalty1: function(matrix, sizeOfData) {
			var penalty = 0,
				currentValue,
				row,
				col,
				c;

			for (row = 0; row < sizeOfData; row++) {
				c = 1;
				for (col = 1; col < sizeOfData; col++) {
					currentValue = matrix[row + 4][col + 4];

					if (currentValue === matrix[row + 4][col + 3]) {
						c++;

						if (c == 5) {
							penalty += 3;
						}
						else if (c > 5) {
							penalty++;
						}
					}
					else {
						c = 1;
					}
				}
			}

			for (col = 0; col < sizeOfData; col++) {
				c = 1;
				for (row = 1; row < sizeOfData; row++) {
					currentValue = matrix[row + 4][col + 4];

					if (currentValue === matrix[row + 3][col + 4]) {
						c++;

						if (c === 5) {
							penalty += 3;
						}
						else if (c > 5) {
							penalty++;
						}
					}
					else {
						c = 1;
					}
				}
			}

			return penalty;
		},

		_calcPenalty2: function(matrix, sizeOfData) {
			var penalty = 0,
				currentValue,
				row,
				col;

			for (row = 0; row < sizeOfData - 1; row++) {
				for (col = 0; col < sizeOfData - 1; col++) {
					currentValue = matrix[row + 4][col + 4];

					if (currentValue == matrix[row + 4][col + 5] && currentValue == matrix[row + 5][col + 4] && currentValue == matrix[row + 5][col + 5]) {
						penalty += 3;
					}
				}
			}

            return penalty;
		},

		_calcPenalty3: function(matrix, sizeOfData) {
			var penalty = 0,
				row,
				col;

			for (row = 0; row < sizeOfData; row++) {
				for (col = 0; col <= sizeOfData - 7; col++) {
					if (matrix[row + 4][col + 4] && !matrix[row + 4][col + 5] && matrix[row + 4][col + 6] && matrix[row + 4][col + 7] &&
						matrix[row + 4][col + 8] && !matrix[row + 4][col + 9] && matrix[row + 4][col + 10]
					) { 
						penalty += 40;
					}
				}
			}

			for (col = 0; col < sizeOfData; col++) {
				for (row = 0; row <= sizeOfData - 7; row++) {
					if (matrix[row + 4][col + 4] && !matrix[row + 5][col + 4] && matrix[row + 6][col + 4] && matrix[row + 7][col + 4] &&
						matrix[row + 8][col + 4] && !matrix[row + 9][col + 4] && matrix[row + 10][col + 4]
					) {
						penalty += 40;
					}
				}
			}

            return penalty;
		},

		_calcPenalty4: function(matrix, sizeOfData) {
			var penalty = 0,
				row,
				col,
				black = 0,
				white = 0;

			for (row = 0; row < sizeOfData; row++) {
				for (col = 0; col < sizeOfData; col++) {
					if (matrix[row + 4][col + 4]) {
						black++;
					}
					else {
						white++;
					}
				}
			}

			penalty = toInt((((black / (black + white)) * 100) - 50) * 2);

			return penalty;
		},

		_fillFormatData: function(binaryMatrix, filledValuesMatrix, sizeOfData, sizeOfMatrix, maskCode, errorLevel) {
			var self = this,
				currentMask = self._errorCorrectionToMask[errorLevel] + maskCode,
				currentMaskInformation = self._formatInformation[currentMask],
				lastRow = sizeOfMatrix - 5,
				lastCol = sizeOfMatrix - 5;

			// fill the beginning of the binary matrix
			binaryMatrix[12][4] = toInt(currentMaskInformation.charAt(0));
			binaryMatrix[12][5] = toInt(currentMaskInformation.charAt(1));
			binaryMatrix[12][6] = toInt(currentMaskInformation.charAt(2));
			binaryMatrix[12][7] = toInt(currentMaskInformation.charAt(3));
			binaryMatrix[12][8] = toInt(currentMaskInformation.charAt(4));
			binaryMatrix[12][9] = toInt(currentMaskInformation.charAt(5));
			binaryMatrix[12][11] = toInt(currentMaskInformation.charAt(6));
			binaryMatrix[12][12] = toInt(currentMaskInformation.charAt(7));
			binaryMatrix[11][12] = toInt(currentMaskInformation.charAt(8));
			binaryMatrix[9][12] = toInt(currentMaskInformation.charAt(9));
			binaryMatrix[8][12] = toInt(currentMaskInformation.charAt(10));
			binaryMatrix[7][12] = toInt(currentMaskInformation.charAt(11));
			binaryMatrix[6][12] = toInt(currentMaskInformation.charAt(12));
			binaryMatrix[5][12] = toInt(currentMaskInformation.charAt(13));
			binaryMatrix[4][12] = toInt(currentMaskInformation.charAt(14));

			// fill the end of the binary matrix
			binaryMatrix[lastRow][12] = toInt(currentMaskInformation.charAt(0));
			binaryMatrix[lastRow - 1][12] = toInt(currentMaskInformation.charAt(1));
			binaryMatrix[lastRow - 2][12] = toInt(currentMaskInformation.charAt(2));
			binaryMatrix[lastRow - 3][12] = toInt(currentMaskInformation.charAt(3));
			binaryMatrix[lastRow - 4][12] = toInt(currentMaskInformation.charAt(4));
			binaryMatrix[lastRow - 5][12] = toInt(currentMaskInformation.charAt(5));
			binaryMatrix[lastRow - 6][12] = toInt(currentMaskInformation.charAt(6));
			binaryMatrix[12][lastCol - 7] = toInt(currentMaskInformation.charAt(7));
			binaryMatrix[12][lastCol - 6] = toInt(currentMaskInformation.charAt(8));
			binaryMatrix[12][lastCol - 5] = toInt(currentMaskInformation.charAt(9));
			binaryMatrix[12][lastCol - 4] = toInt(currentMaskInformation.charAt(10));
			binaryMatrix[12][lastCol - 3] = toInt(currentMaskInformation.charAt(11));
			binaryMatrix[12][lastCol - 2] = toInt(currentMaskInformation.charAt(12));
			binaryMatrix[12][lastCol - 1] = toInt(currentMaskInformation.charAt(13));
			binaryMatrix[12][lastCol] = toInt(currentMaskInformation.charAt(14));

			// populate the filled values matrix
			filledValuesMatrix[8][0] = 1;
			filledValuesMatrix[8][1] = 1;
			filledValuesMatrix[8][2] = 1;
			filledValuesMatrix[8][3] = 1;
			filledValuesMatrix[8][4] = 1;
			filledValuesMatrix[8][5] = 1;
			filledValuesMatrix[8][7] = 1;
			filledValuesMatrix[8][8] = 1;
			filledValuesMatrix[7][8] = 1;
			filledValuesMatrix[5][8] = 1;
			filledValuesMatrix[4][8] = 1;
			filledValuesMatrix[3][8] = 1;
			filledValuesMatrix[2][8] = 1;
			filledValuesMatrix[1][8] = 1;
			filledValuesMatrix[0][8] = 1;
			filledValuesMatrix[sizeOfData - 1][8] = 1;
			filledValuesMatrix[sizeOfData - 2][8] = 1;
			filledValuesMatrix[sizeOfData - 3][8] = 1;
			filledValuesMatrix[sizeOfData - 4][8] = 1;
			filledValuesMatrix[sizeOfData - 5][8] = 1;
			filledValuesMatrix[sizeOfData - 6][8] = 1;
			filledValuesMatrix[sizeOfData - 7][8] = 1;
			filledValuesMatrix[8][sizeOfData - 8] = 1;
			filledValuesMatrix[8][sizeOfData - 7] = 1;
			filledValuesMatrix[8][sizeOfData - 6] = 1;
			filledValuesMatrix[8][sizeOfData - 5] = 1;
			filledValuesMatrix[8][sizeOfData - 4] = 1;
			filledValuesMatrix[8][sizeOfData - 3] = 1;
			filledValuesMatrix[8][sizeOfData - 2] = 1;
			filledValuesMatrix[8][sizeOfData - 1] = 1;
		},

		_fillMatrix: function(filledValuesMatrix, matrix, maskCode, sizeOfData, encodedValue) {
			var self = this,
				binaryIndex = 0,
				bottomToTop = true,
				col,
				row;

			for (col = sizeOfData - 1; col >= 0; col -= 2) {
				if (col == 6) {
					col--;
				}

				if (bottomToTop) {
					for (row = sizeOfData - 1; row >= 0; row--) {
						if (!filledValuesMatrix[row][col]) {
							self._fillModule(row, col, binaryIndex, matrix, maskCode, encodedValue);
							binaryIndex++;
						}

						if (col - 1 >= 0 && !filledValuesMatrix[row][col - 1]) {
							self._fillModule(row, col - 1, binaryIndex, matrix, maskCode, encodedValue);
							binaryIndex++;
						}
					}
					bottomToTop = !bottomToTop;
				}
				else {
					for (row = 0; row < sizeOfData; row++) {
						if (!filledValuesMatrix[row][col]) {
							self._fillModule(row, col, binaryIndex, matrix, maskCode, encodedValue);
							binaryIndex++;
						}

						if (col - 1 >= 0 && !filledValuesMatrix[row][col - 1]) {
							self._fillModule(row, col - 1, binaryIndex, matrix, maskCode, encodedValue);
							binaryIndex++;
						}
					}
					bottomToTop = !bottomToTop;
				}
			}
		},

		_fillModule: function(row, col, index, matrix, maskCode, encodedValue) {
			var self = this;

			if (index < encodedValue.length) {
				self._fillCharacter(row, col, encodedValue.charAt(index), matrix, maskCode);
			}
			else {
				self._fillCharacter(row, col, '0', matrix, maskCode);
			}
		},

		_fillCharacter: function(row, col, value, matrix, maskCode) {
			var invert,
				newValue;

			switch (maskCode) {
				case "000":
					invert = (row + col) % 2 === 0;
					break;
				case "001":
					invert = row % 2 === 0;
					break;
				case "010":
					invert = col % 3 === 0;
					break;
				case "011":
					invert = (row + col) % 3 === 0;
					break;
				case "100":
					invert = ((row / 2) + (col / 3)) % 2 === 0;
					break;
				case "101":
					invert = ((row * col) % 2) + ((row * col) % 3) === 0;
					break;
				case "110":
					invert = (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
					break;
				case "111":
					invert = (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
					break;
				default:
					invert = ((row + col) % 2) === 0;
					break;
			}

			if (invert) {
				newValue = value == '0' ? 1 : 0;
			}
			else {
				newValue = value == '0' ? 0 : 1;
			}

			matrix[row + 4][col + 4] = newValue;
		},

		// fills timing pattern to binary matrix and filled values
		_fillTimingPattern: function(binaryMatrix, filledValuesMatrix, sizeOfData) {
			var row = 10,
				col = 12,
				add = true;

			while (col < sizeOfData - 4) {
				if (add) {
					binaryMatrix[row][col] = 1;
				}

				filledValuesMatrix[row - 4][col - 4] = 1;
				add = !add;
				col++;
			}

			col = 10;
			row = 12;
			add = true;

			while (row < sizeOfData - 4) {
				if (add) {
					binaryMatrix[row][col] = 1;
				}

				filledValuesMatrix[row - 4][col - 4] = 1;
				add = !add;
				row++;
			}
		},

		// fills finder pattern starting from a certain position
		_fullFinderPattern: function(binaryMatrix, row, col) {
			var i;

			for (i = 0; i < 7; i++) {
				binaryMatrix[row + i][col] = 1;
				binaryMatrix[row][col + i] = 1;
				binaryMatrix[row + i][col + 6] = 1;
				binaryMatrix[row + 6][col + i] = 1;
			}

			row += 2;
			col += 2;

			for (i = 0; i < 3; i++) {
				binaryMatrix[row + i][col] = 1;
				binaryMatrix[row + i][col + 1] = 1;
				binaryMatrix[row + i][col + 2] = 1;
			}
		},

		// fills finder patterns for filled values
		_fillFinderPatternFilledValues: function(filledValuesMatrix, row, col) {
			var maxrow, 
				maxcol,
				i,
				j;

			if (row === 0 && col === 0) {
				maxrow = maxcol = 8;
			}
			else if (row === 0 && col > 0) {
				maxrow = 8;
                maxcol = col + 8;
			}
			else {
				maxrow = row + 8;
                maxcol = 8;
			}

			for (i = row; i < maxrow; i++) {
                for (j = col; j < maxcol; j++) {
                    filledValuesMatrix[i][j] = 1;
                }
            }
		},

		// generate error correction 
		_getEC: function (versionKey, intValues, intValuesNoEC) {
			var self = this,
				currentInfoVersion = self._getCodewordsLengthTable(),
				currentInfo = currentInfoVersion[versionKey],
				dataCounter = 0,
				firstBlockCodewordsStack = [],
				secondBlockCodewordsStack = [],
				mergedCodewordsStack = [],
				mergedCodewordsECStack = [],
				firstBlockECStack = [],
				secondBlockECStack = [],
				totalItems = [],
				totalItemsEC = [],
				firstBlockCount = currentInfo.firstBlockCount,
				secondBlockCount = currentInfo.secondBlockCount,
                firstBlock = [],
                secondBlock = [],
				firstWordsCount,
				secondWordsCount;

			for (; firstBlockCount > 0; firstBlockCount--) {
			    firstBlock = [];
				for (firstWordsCount = 0; firstWordsCount < currentInfo.firstDataCodeWords; firstWordsCount++) {
					firstBlock[firstBlock.length] = intValuesNoEC[dataCounter];
					dataCounter++;
				}
				firstBlockCodewordsStack[firstBlockCodewordsStack.length] = firstBlock;
				firstBlockECStack[firstBlockECStack.length] = self._getErrorCorrectionForBlock(firstBlock, currentInfo);
			}

			for (; secondBlockCount > 0; secondBlockCount--) {
			    secondBlock = [];
				for (secondWordsCount = 0; secondWordsCount < currentInfo.secondBlockCodeWords; secondWordsCount++) {
					secondBlock[secondBlock.length] = intValuesNoEC[dataCounter];
					dataCounter++;
				}
				secondBlockCodewordsStack[secondBlockCodewordsStack.length] = secondBlock;
				secondBlockECStack[secondBlockECStack.length] = self._getErrorCorrectionForBlock(secondBlock, currentInfo);
			}

			var totalDataWords = (currentInfo.firstDataCodeWords * currentInfo.firstBlockCount) + (currentInfo.secondBlockCodeWords * currentInfo.secondBlockCount),
				totalECWords = (currentInfo.codewordsPerBlock * currentInfo.firstBlockCount) + (currentInfo.codewordsPerBlock * currentInfo.secondBlockCount),
				pointer = 0,
				totalBlocks = firstBlockCodewordsStack.length + secondBlockCodewordsStack.length,
				counter;

			for (counter = 0; counter < totalBlocks; counter++) {
				if (pointer === 0) {
					if (firstBlockCodewordsStack.length > 0) {
						mergedCodewordsStack[mergedCodewordsStack.length] = firstBlockCodewordsStack[0];
						firstBlockCodewordsStack.splice(0, 1);
					}
					else {
						mergedCodewordsStack[mergedCodewordsStack.length] = secondBlockCodewordsStack[0];
						pointer++;
						secondBlockCodewordsStack.splice(0, 1);
					}
				}
				else if (pointer === 1) {
					if (secondBlockCodewordsStack.length > 0) {
						mergedCodewordsStack[mergedCodewordsStack.length] = secondBlockCodewordsStack[0];
						secondBlockCodewordsStack.splice(0, 1);
					}
				}
			}

			pointer = 0;
			totalBlocks = firstBlockECStack.length + secondBlockECStack.length;

			for (counter = 0; counter < totalBlocks; counter++) {
				if (pointer === 0) {
					if (firstBlockECStack.length > 0) {
						mergedCodewordsECStack[mergedCodewordsECStack.length] = firstBlockECStack[0];
						firstBlockECStack.splice(0, 1);
					}
					else {
						mergedCodewordsECStack[mergedCodewordsECStack.length] = secondBlockECStack[0];
						pointer++;
						secondBlockECStack.splice(0, 1);
					}
				}
				else if (pointer === 1) {
					if (secondBlockECStack.length > 0) {
						mergedCodewordsECStack[mergedCodewordsECStack.length] = secondBlockECStack[0];
						secondBlockECStack.splice(0, 1);
					}
				}
			}

			var dataPointerLimit = mergedCodewordsStack.length,
				erorCorrectionPointerLimit = mergedCodewordsECStack.length,
				index,
				finalDataBinaryString = "";

			pointer = 0;
			for (index = 0; index < totalDataWords; index++) {
				if (pointer === dataPointerLimit) {
					pointer = 0;
				}

				if (mergedCodewordsStack[pointer].length > 0) {
					totalItems[totalItems.length] = mergedCodewordsStack[pointer][0];
					mergedCodewordsStack[pointer].splice(0, 1);
					pointer++;
				}
				else {
					pointer++;
					index--;
				}
			}

			pointer = 0;
			for (index = 0; index < totalECWords; index++) {
				if (pointer === erorCorrectionPointerLimit) {
					pointer = 0;
				}

				if (mergedCodewordsECStack[pointer].length > 0) {
					totalItemsEC[totalItemsEC.length] = mergedCodewordsECStack[pointer][0];
					mergedCodewordsECStack[pointer].splice(0, 1);
					pointer++;
				}
				else {
					pointer++;
					index--;
				}
			}

			for (index = 0; index < totalItems.length; index++) {
				finalDataBinaryString += padLeft(decimalToBinary(totalItems[index]), 8);
			}
			
			for (index = 0; index < totalItemsEC.length; index++) {
				finalDataBinaryString += padLeft(decimalToBinary(totalItemsEC[index]), 8)
			}

			return finalDataBinaryString;
        },

		// calculates the error correction words for a single block
		// this function is called repeatedly for each set of data words
		_getErrorCorrectionForBlock: function(dataList, localInfo) {
			var numberOfEC = localInfo.codewordsPerBlock,
				generatorValues = [],
				workingList = [],
				workingListIndex = 0,
				generatorExponentsOfAlpha = {
					7: [87, 229, 146, 149, 238, 102, 21],
					10: [251, 67, 46, 61, 118, 70, 64, 94, 32, 45],
					13: [74, 152, 176, 100, 86, 100, 106, 104, 130, 218, 206, 140, 78],
					15: [8, 183, 61, 91, 202, 37, 51, 58, 58, 237, 140, 124, 5, 99, 105],
					16: [120, 104, 107, 109, 102, 161, 76, 3, 91, 191, 147, 169, 182, 194, 225, 120],
					17: [43, 139, 206, 78, 43, 239, 123, 206, 214, 147, 24, 99, 150, 39, 243, 163, 136],
					18: [215, 234, 158, 94, 184, 97, 118, 170, 79, 187, 152, 148, 252, 179, 5, 98, 96, 153],
					20: [17, 60, 79, 50, 61, 163, 26, 187, 202, 180, 221, 225, 83, 239, 156, 164, 212, 212, 188, 190],
					22: [210, 171, 247, 242, 93, 230, 14, 109, 221, 53, 200, 74, 8, 172, 98, 80, 219, 134, 160, 105, 165, 231],
					24: [229, 121, 135, 48, 211, 117, 251, 126, 159, 180, 169, 152, 192, 226, 228, 218, 111, 0, 117, 232, 87, 96, 227, 21],
					26: [173, 125, 158, 2, 103, 182, 118, 17, 145, 201, 111, 28, 165, 53, 161, 21, 245, 142, 13, 102, 48, 227, 153, 145, 218, 70],
					28: [168, 223, 200, 104, 224, 234, 108, 180, 110, 190, 195, 147, 205, 27, 232, 201, 21, 43, 245, 87, 42, 195, 212, 119, 242, 37, 9, 123],
					30: [41, 173, 145, 152, 216, 31, 179, 182, 50, 48, 110, 86, 239, 96, 222, 125, 42, 173, 226, 193, 224, 130, 156, 37, 251, 216, 238, 40, 192, 180]
				},
				exponentsOfAlphaToValues = [1, 2, 4, 8, 16, 32, 64, 128, 29, 58, 116, 232, 205, 135, 19, 38, 76, 152, 45, 90, 180, 117, 234, 201, 143,
					3, 6, 12, 24, 48, 96, 192, 157, 39, 78, 156, 37, 74, 148, 53, 106, 212, 181, 119, 238, 193, 159, 35, 70, 140, 5, 10, 20, 40, 80, 160, 93,
					186, 105, 210, 185, 111, 222, 161, 95, 190, 97, 194, 153, 47, 94, 188, 101, 202, 137, 15, 30, 60, 120, 240, 253, 231, 211, 187, 107, 214,
					177, 127, 254, 225, 223, 163, 91, 182, 113, 226, 217, 175, 67, 134, 17, 34, 68, 136, 13, 26, 52, 104, 208, 189, 103, 206, 129, 31, 62, 124,
					248, 237, 199, 147, 59, 118, 236, 197, 151, 51, 102, 204, 133, 23, 46, 92, 184, 109, 218, 169, 79, 158, 33, 66, 132, 21, 42, 84, 168, 77, 154,
					41, 82, 164, 85, 170, 73, 146, 57, 114, 228, 213, 183, 115, 230, 209, 191, 99, 198, 145, 63, 126, 252, 229, 215, 179, 123, 246, 241, 255, 227,
					219, 171, 75, 150, 49, 98, 196, 149, 55, 110, 220, 165, 87, 174, 65, 130, 25, 50, 100, 200, 141, 7, 14, 28, 56, 112, 224, 221, 167, 83, 166,
					81, 162, 89, 178, 121, 242, 249, 239, 195, 155, 43, 86, 172, 69, 138, 9, 18, 36, 72, 144, 61, 122, 244, 245, 247, 243, 251, 235, 203, 139, 11,
					22, 44, 88, 176, 125, 250, 233, 207, 131, 27, 54, 108, 216, 173, 71, 142, 1],
				valuesToExponentsOfAlpha = [-1, 0, 1, 25, 2, 50, 26, 198, 3, 223, 51, 238, 27, 104, 199, 75, 4, 100, 224, 14, 52, 141, 239, 129, 28,
					193, 105, 248, 200, 8, 76, 113, 5, 138, 101, 47, 225, 36, 15, 33, 53, 147, 142, 218, 240, 18, 130, 69, 29, 181, 194, 125, 106, 39, 249, 185,
					201, 154, 9, 120, 77, 228, 114, 166, 6, 191, 139, 98, 102, 221, 48, 253, 226, 152, 37, 179, 16, 145, 34, 136, 54, 208, 148, 206, 143, 150,
					219, 189, 241, 210, 19, 92, 131, 56, 70, 64, 30, 66, 182, 163, 195, 72, 126, 110, 107, 58, 40, 84, 250, 133, 186, 61, 202, 94, 155, 159, 10,
					21, 121, 43, 78, 212, 229, 172, 115, 243, 167, 87, 7, 112, 192, 247, 140, 128, 99, 13, 103, 74, 222, 237, 49, 197, 254, 24, 227, 165, 153,
					119, 38, 184, 180, 124, 17, 68, 146, 217, 35, 32, 137, 46, 55, 63, 209, 91, 149, 188, 207, 205, 144, 135, 151, 178, 220, 252, 190, 97, 242,
					86, 211, 171, 20, 42, 93, 158, 132, 60, 57, 83, 71, 109, 65, 162, 31, 45, 67, 216, 183, 123, 164, 118, 196, 23, 73, 236, 127, 12, 111, 246,
					108, 161, 59, 82, 41, 157, 85, 170, 251, 96, 134, 177, 187, 204, 62, 90, 203, 89, 95, 176, 156, 169, 160, 81, 11, 245, 22, 235, 122, 117, 44,
					215, 79, 174, 213, 233, 230, 231, 173, 232, 116, 214, 244, 234, 168, 80, 88, 175],
				i,
				innerIndex,
				firstValue,
				addedValue;

			for (i = 0; i < dataList.length + numberOfEC; i++) {
				workingList[workingListIndex++] = i < dataList.length ? dataList[i] : 0;
			}

			for (i = 0; i < dataList.length; i++) {
				firstValue = workingList[0];

				workingList.splice(0, 1);

				if (firstValue !== 0) {
					generatorValues = generatorExponentsOfAlpha[numberOfEC].slice(0);

					firstValue = valuesToExponentsOfAlpha[firstValue];

					for (innerIndex = 0; innerIndex < generatorValues.length; innerIndex++) {
						addedValue = firstValue + generatorValues[innerIndex];
						if (addedValue > 255) {
							addedValue = addedValue % 255;
						}
						generatorValues[innerIndex] = addedValue;
					}

					// convert generatorValues to exponents
					for (innerIndex = 0; innerIndex < generatorValues.length; innerIndex++) {
						generatorValues[innerIndex] = exponentsOfAlphaToValues[generatorValues[innerIndex]];
					}

					// XOR workingList with generatorValues
					for (innerIndex = 0; innerIndex < generatorValues.length; innerIndex++) {
						workingList[innerIndex] = workingList[innerIndex] ^ generatorValues[innerIndex];
					}
				}
			}

			return workingList;
		},

        // get integer values from the binary ones
        _getIntegerValues: function (binaryValues) {
            return map(binaryValues, function (item) {
                return binaryToDecimal(item);
            });
        },

        // get the binary representation of the encoded string
        _getBinaryValues: function (value) {
            var binaryValues = [],
				i;

            for (i = 0; i < value.length; i += 8) {
                if (i + 8 <= value.length) {
                    binaryValues.push(value.substr(i, 8));
                }
                else {
                    binaryValues.push(padRight(value.substring(i), 8));
                }
            }

            return binaryValues;
        },

        // a special padding function for the encoded string
        _padEncodedToLength: function (value, length) {
            if (value.length >= length) {
                return value.substr(0, length);
            }
            else {
                var result = value,
					padding1 = "11101100",
					padding2 = "00010001",
					oddPosition = true;

                while (result.length < length) {
                    if (oddPosition) {
                        result += padding1;
                    }
                    else {
                        result += padding2;
                    }
                    oddPosition = !oddPosition;
                }

                return result;
            }
        },

        // calculates the version based on the value of the text and the errorLevel
        _getVersion: function (value, errorLevel) {
            var length = value.length,
				i;

            // determine the optimal version for this value's length, error level and mode
            for (i = 1; i < 39; i++) {
                if ((this._verErrLenTable[i + "" + errorLevel] / 8) >= length) {
                    break;
                }
            }

            return i + 1;
        },

        // calculates the total data length
        _getDataLength: function (value, errorLevel) {
            var self = this;
            return self._verErrLenTable[self._getVersion(value, errorLevel) + "" + errorLevel];
        },

        // constructs the format data string
        _getFormatData: function (value, errorLevel) {
            // return the code mode data and padded length binary string
            return this.codeMode + padLeft(decimalToBinary(value.length), this._getFormatLengthTotal(value, errorLevel));
        },

        // calculates how long the length binary string (part of format data) must be
        _getFormatLengthTotal: function (value, errorLevel) {
            var self = this,
				mode = self.mode,
				version = self._getVersion(value, errorLevel);

            if (version >= 1 && version <= 9) {
                if (mode == MODE_NUMERIC) {
                    return 10;
                }
                else if (mode == MODE_ALPHANUMERIC) {
                    return 9;
                }
                else {
                    return 8;
                }
            }
            else if (version >= 10 && version <= 26) {
                if (mode == MODE_NUMERIC) {
                    return 12;
                }
                else if (mode == MODE_ALPHANUMERIC) {
                    return 11;
                }
                else if (mode == MODE_BYTE) {
                    return 16;
                }
                else {
                    return 10;
                }
            }
            else {
                if (mode == MODE_NUMERIC) {
                    return 14;
                }
                else if (mode == MODE_ALPHANUMERIC) {
                    return 13;
                }
                else if (mode == MODE_BYTE) {
                    return 16;
                }
                else {
                    return 12;
                }
            }
        },

        // calculates (once) and returns the codewords length table
        _getCodewordsLengthTable: function () {
            var self = this;

            if (self._clt) {
                return self._clt;
            }

            var valuesTable = [7, 1, 19, 0, 0, 10, 1, 16, 0, 0, 13, 1, 13, 0, 0, 17, 1, 9, 0, 0, 10, 1, 34, 0, 0, 16, 1, 28, 0, 0, 22, 1, 22, 0, 0,
                28, 1, 16, 0, 0, 15, 1, 55, 0, 0, 26, 1, 44, 0, 0, 18, 2, 17, 0, 0, 22, 2, 13, 0, 0, 20, 1, 80, 0, 0, 18, 2, 32, 0, 0, 26, 2, 24, 0, 0, 16, 4,
                9, 0, 0, 26, 1, 108, 0, 0, 24, 2, 43, 0, 0, 18, 2, 15, 2, 16, 22, 2, 11, 2, 12, 18, 2, 68, 0, 0, 16, 4, 27, 0, 0, 24, 4, 19, 0, 0, 28, 4, 15,
                0, 0, 20, 2, 78, 0, 0, 18, 4, 31, 0, 0, 18, 2, 14, 4, 15, 26, 4, 13, 1, 14, 24, 2, 97, 0, 0, 22, 2, 38, 2, 39, 22, 4, 18, 2, 19, 26, 4, 14, 2,
                15, 30, 2, 116, 0, 0, 22, 3, 36, 2, 37, 20, 4, 16, 4, 17, 24, 4, 12, 4, 13, 18, 2, 68, 2, 69, 26, 4, 43, 1, 44, 24, 6, 19, 2, 20, 28, 6, 15,
                2, 16, 20, 4, 81, 0, 0, 30, 1, 50, 4, 51, 28, 4, 22, 4, 23, 24, 3, 12, 8, 13, 24, 2, 92, 2, 93, 22, 6, 36, 2, 37, 26, 4, 20, 6, 21, 28, 7, 14,
                4, 15, 26, 4, 107, 0, 0, 22, 8, 37, 1, 38, 24, 8, 20, 4, 21, 22, 12, 11, 4, 12, 30, 3, 115, 1, 116, 24, 4, 40, 5, 41, 20, 11, 16, 5, 17, 24,
                11, 12, 5, 13, 22, 5, 87, 1, 88, 24, 5, 41, 5, 42, 30, 5, 24, 7, 25, 24, 11, 12, 7, 13, 24, 5, 98, 1, 99, 28, 7, 45, 3, 46, 24, 15, 19, 2, 20,
                30, 3, 15, 13, 16, 28, 1, 107, 5, 108, 28, 10, 46, 1, 47, 28, 1, 22, 15, 23, 28, 2, 14, 17, 15, 30, 5, 120, 1, 121, 26, 9, 43, 4, 44, 28, 17,
                22, 1, 23, 28, 2, 14, 19, 15, 28, 3, 113, 4, 114, 26, 3, 44, 11, 45, 26, 17, 21, 4, 22, 26, 9, 13, 16, 14, 28, 3, 107, 5, 108, 26, 3, 41, 13,
                42, 30, 15, 24, 5, 25, 28, 15, 15, 10, 16, 28, 4, 116, 4, 117, 26, 17, 42, 0, 0, 28, 17, 22, 6, 23, 30, 19, 16, 6, 17, 28, 2, 111, 7, 112, 28,
                17, 46, 0, 0, 30, 7, 24, 16, 25, 24, 34, 13, 0, 0, 30, 4, 121, 5, 122, 28, 4, 47, 14, 48, 30, 11, 24, 14, 25, 30, 16, 15, 14, 16, 30, 6, 117,
                4, 118, 28, 6, 45, 14, 46, 30, 11, 24, 16, 25, 30, 30, 16, 2, 17, 26, 8, 106, 4, 107, 28, 8, 47, 13, 48, 30, 7, 24, 22, 25, 30, 22, 15, 13,
                16, 28, 10, 114, 2, 115, 28, 19, 46, 4, 47, 28, 28, 22, 6, 23, 30, 33, 16, 4, 17, 30, 8, 122, 4, 123, 28, 22, 45, 3, 46, 30, 8, 23, 26, 24,
                30, 12, 15, 28, 16, 30, 3, 117, 10, 118, 28, 3, 45, 23, 46, 30, 4, 24, 31, 25, 30, 11, 15, 31, 16, 30, 7, 116, 7, 117, 28, 21, 45, 7, 46, 30,
                1, 23, 37, 24, 30, 19, 15, 26, 16, 30, 5, 115, 10, 116, 28, 19, 47, 10, 48, 30, 15, 24, 25, 25, 30, 23, 15, 25, 16, 30, 13, 115, 3, 116, 28,
                2, 46, 29, 47, 30, 42, 24, 1, 25, 30, 23, 15, 28, 16, 30, 17, 115, 0, 0, 28, 10, 46, 23, 47, 30, 10, 24, 35, 25, 30, 19, 15, 35, 16, 30, 17,
                115, 1, 116, 28, 14, 46, 21, 47, 30, 29, 24, 19, 25, 30, 11, 15, 46, 16, 30, 13, 115, 6, 116, 28, 14, 46, 23, 47, 30, 44, 24, 7, 25, 30, 59,
                16, 1, 17, 30, 12, 121, 7, 122, 28, 12, 47, 26, 48, 30, 39, 24, 14, 25, 30, 22, 15, 41, 16, 30, 6, 121, 14, 122, 28, 6, 47, 34, 48, 30, 46,
                24, 10, 25, 30, 2, 15, 64, 16, 30, 17, 122, 4, 123, 28, 29, 46, 14, 47, 30, 49, 24, 10, 25, 30, 24, 15, 46, 16, 30, 4, 122, 18, 123, 28, 13,
                46, 32, 47, 30, 48, 24, 14, 25, 30, 42, 15, 32, 16, 30, 20, 117, 4, 118, 28, 40, 47, 7, 48, 30, 43, 24, 22, 25, 30, 10, 15, 67, 16, 30, 19,
                118, 6, 119, 28, 18, 47, 31, 48, 30, 34, 24, 34, 25, 30, 20, 15, 61, 16],
				errorModes = ["L", "M", "Q", "H"],
				index = 0,
				outer,
				inner;

            self._clt = {};

            for (outer = 1; outer <= 40; outer++) {
                for (inner = 0; inner < errorModes.length; inner++) {
                    self._clt[outer + "" + errorModes[inner]] = {
                        "codewordsPerBlock": valuesTable[index],
                        "firstBlockCount": valuesTable[index + 1],
                        "firstDataCodeWords": valuesTable[index + 2],
                        "secondBlockCount": valuesTable[index + 3],
                        "secondBlockCodeWords": valuesTable[index + 4]
                    };
                    index += 5;
                }
            }

            return self._clt;
        },

		_getPositionAdjustmentsTable: function() {
			var positionAdjustmentPatternCoordinates = [],
				index = 2;

			positionAdjustmentPatternCoordinates[index++] = [6, 18];
			positionAdjustmentPatternCoordinates[index++] = [6, 22];
			positionAdjustmentPatternCoordinates[index++] = [6, 26];
			positionAdjustmentPatternCoordinates[index++] = [6, 30];
			positionAdjustmentPatternCoordinates[index++] = [6, 34];
			positionAdjustmentPatternCoordinates[index++] = [6, 22, 38];
			positionAdjustmentPatternCoordinates[index++] = [6, 24, 42];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 46];
			positionAdjustmentPatternCoordinates[index++] = [6, 28, 50];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 54];
			positionAdjustmentPatternCoordinates[index++] = [6, 32, 58];
			positionAdjustmentPatternCoordinates[index++] = [6, 34, 62];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 46, 66];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 48, 70];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 50, 74];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 54, 78];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 56, 82];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 58, 86];
			positionAdjustmentPatternCoordinates[index++] = [6, 34, 62, 90];
			positionAdjustmentPatternCoordinates[index++] = [6, 28, 50, 72, 94];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 50, 74, 98];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 54, 78, 102];
			positionAdjustmentPatternCoordinates[index++] = [6, 28, 54, 80, 106];
			positionAdjustmentPatternCoordinates[index++] = [6, 32, 58, 84, 110];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 58, 86, 114];
			positionAdjustmentPatternCoordinates[index++] = [6, 34, 62, 90, 118];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 50, 74, 98, 122];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 54, 78, 102, 126];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 52, 78, 104, 130];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 56, 82, 108, 134];
			positionAdjustmentPatternCoordinates[index++] = [6, 34, 60, 86, 112, 138];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 58, 86, 114, 142];
			positionAdjustmentPatternCoordinates[index++] = [6, 34, 62, 90, 118, 146];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 54, 78, 102, 126, 150];
			positionAdjustmentPatternCoordinates[index++] = [6, 24, 50, 76, 102, 128, 154];
			positionAdjustmentPatternCoordinates[index++] = [6, 28, 54, 80, 106, 132, 158];
			positionAdjustmentPatternCoordinates[index++] = [6, 32, 58, 84, 110, 136, 162];
			positionAdjustmentPatternCoordinates[index++] = [6, 26, 54, 82, 110, 138, 166];
			positionAdjustmentPatternCoordinates[index++] = [6, 30, 58, 86, 114, 142, 170];

			return positionAdjustmentPatternCoordinates;
		}
    });

    var NumericQRCodeEncoder = BaseQRCodeEncoder.extend({
        mode: MODE_NUMERIC,
        codeMode: "0001",
        validateRegex: "^\\d+$",

        encodeValue: function (value) {
            var res = [];

            while (value.length > 0) {
                if (value.length > 2) {	// >= 3
                    res.push(padLeft(decimalToBinary(toInt(value.substr(0, 3))), 10));
                    value = value.substr(3);
                }
                else if (value.length === 2) {
                    res.push(padLeft(decimalToBinary(toInt(value)), 7));
                    value = "";
                }
                else {	// === 1
                    res.push(padLeft(decimalToBinary(toInt(value)), 4));
                    value = "";
                }
            }

            if (res.length === 0) {
                res.push(padLeft(decimalToBinary(0), 4));
            }

            return res.join("");
        }
    });
    QRCodeEncoderFactory.addMode(NumericQRCodeEncoder);

    // byte code mode
    var ByteQRCodeEncoder = BaseQRCodeEncoder.extend({
        mode: MODE_BYTE,
        codeMode: "0100",

        validateRegex: "^[0-9A-Za-z'\\\r\\\n\\ \\!\\\"\\#\\$\\%\\&\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\¥\\]\\^\\_\\`\\{\\|\\}\\¯\\｡\\｢\\｣\\､\\･\\ｦ\\ｧ\\ｨ\\ｩ\\ｪ\\ｫ\\ｬ\\ｭ\\ｮ\\ｯ\\ｰ\\ｱ\\ｲ\\ｳ\\ｴ\\ｵ\\ｶ\\ｷ\\ｸ\\ｹ\\ｺ\\ｻ\\ｼ\\ｽ\\ｾ\\ｿ\\ﾀ\\ﾁ\\ﾂ\\ﾃ\\ﾄ\\ﾅ\\ﾆ\\ﾇ\\ﾈ\\ﾉ\\ﾊ\\ﾋ\\ﾌ\\ﾍ\\ﾎ\\ﾏ\\ﾐ\\ﾑ\\ﾒ\\ﾓ\\ﾔ\\ﾕ\\ﾖ\\ﾗ\\ﾘ\\ﾙ\\ﾚ\\ﾛ\\ﾜ\\ﾝ\\ﾞ\\ﾟ]+$",

        encodingTable: {
            '\r': "13",
            '\n': "10",
            ' ': "32",
            '!': "33",
            '"': "34",
            '#': "35",
            '$': "36",
            '%': "37",
            '&': "38",
            '\'': "39",
            '(': "40",
            ')': "41",
            '*': "42",
            '+': "43",
            ',': "44",
            '-': "45",
            '.': "46",
            '/': "47",
            '0': "48",
            '1': "49",
            '2': "50",
            '3': "51",
            '4': "52",
            '5': "53",
            '6': "54",
            '7': "55",
            '8': "56",
            '9': "57",
            ':': "58",
            ';': "59",
            '<': "60",
            '=': "61",
            '>': "62",
            '?': "63",
            '@': "64",
            'A': "65",
            'B': "66",
            'C': "67",
            'D': "68",
            'E': "69",
            'F': "70",
            'G': "71",
            'H': "72",
            'I': "73",
            'J': "74",
            'K': "75",
            'L': "76",
            'M': "77",
            'N': "78",
            'O': "79",
            'P': "80",
            'Q': "81",
            'R': "82",
            'S': "83",
            'T': "84",
            'U': "85",
            'V': "86",
            'W': "87",
            'X': "88",
            'Y': "89",
            'Z': "90",
            '[': "91",
            '¥': "92",
            ']': "93",
            '^': "94",
            '_': "95",
            '`': "96",
            'a': "97",
            'b': "98",
            'c': "99",
            'd': "100",
            'e': "101",
            'f': "102",
            'g': "103",
            'h': "104",
            'i': "105",
            'j': "106",
            'k': "107",
            'l': "108",
            'm': "109",
            'n': "110",
            'o': "111",
            'p': "112",
            'q': "113",
            'r': "114",
            's': "115",
            't': "116",
            'u': "117",
            'v': "118",
            'w': "119",
            'x': "120",
            'y': "121",
            'z': "122",
            '{': "123",
            '|': "124",
            '}': "125",
            '¯': "126",
            '｡': "161",
            '｢': "162",
            '｣': "163",
            '､': "164",
            '･': "165",
            'ｦ': "166",
            'ｧ': "167",
            'ｨ': "168",
            'ｩ': "169",
            'ｪ': "170",
            'ｫ': "171",
            'ｬ': "172",
            'ｭ': "173",
            'ｮ': "174",
            'ｯ': "175",
            'ｰ': "176",
            'ｱ': "177",
            'ｲ': "178",
            'ｳ': "179",
            'ｴ': "180",
            'ｵ': "181",
            'ｶ': "182",
            'ｷ': "183",
            'ｸ': "184",
            'ｹ': "185",
            'ｺ': "186",
            'ｻ': "187",
            'ｼ': "188",
            'ｽ': "189",
            'ｾ': "190",
            'ｿ': "191",
            'ﾀ': "192",
            'ﾁ': "193",
            'ﾂ': "194",
            'ﾃ': "195",
            'ﾄ': "196",
            'ﾅ': "197",
            'ﾆ': "198",
            'ﾇ': "199",
            'ﾈ': "200",
            'ﾉ': "201",
            'ﾊ': "202",
            'ﾋ': "203",
            'ﾌ': "204",
            'ﾍ': "205",
            'ﾎ': "206",
            'ﾏ': "207",
            'ﾐ': "208",
            'ﾑ': "209",
            'ﾒ': "210",
            'ﾓ': "211",
            'ﾔ': "212",
            'ﾕ': "213",
            'ﾖ': "214",
            'ﾗ': "215",
            'ﾘ': "216",
            'ﾙ': "217",
            'ﾚ': "218",
            'ﾛ': "219",
            'ﾜ': "220",
            'ﾝ': "221",
            'ﾞ': "222",
            'ﾟ': "223"
        },

        encodeValue: function(value) {
			var self = this,
				res = [],
				i;

            for (i = 0; i < value.length; i++) {
                res.push(padLeft(decimalToBinary(toInt(self.encodingTable[value.charAt(i)])), 8));
            }

            return res.join("");
        }
    });
    QRCodeEncoderFactory.addMode(ByteQRCodeEncoder);
    // end of byte code mode

    // alphanumeric code mode
    var AlphaNumericQRCodeEncoder = BaseQRCodeEncoder.extend({
        mode: MODE_ALPHANUMERIC,
        codeMode: "0010",

        validateRegex: "^[0-9A-Z \\$\\%\\*\\+\\-\\.\\/\\:]+$",

        encodingTable : {
            "0": "0",
            "1": "1",
            "2": "2",
            "3": "3",
            "4": "4",
            "5": "5",
            "6": "6",
            "7": "7",
            "8": "8",
            "9": "9",
            "A": "10",
            "B": "11",
            "C": "12",
            "D": "13",
            "E": "14",
            "F": "15",
            "G": "16",
            "H": "17",
            "I": "18",
            "J": "19",
            "K": "20",
            "L": "21",
            "M": "22",
            "N": "23",
            "O": "24",
            "P": "25",
            "Q": "26",
            "R": "27",
            "S": "28",
            "T": "29",
            "U": "30",
            "V": "31",
            "W": "32",
            "X": "33",
            "Y": "34",
            "Z": "35",
            " ": "36",
            "$": "37",
            "%": "38",
            "*": "39",
            "+": "40",
            "-": "41",
            ".": "42",
            "/": "43",
            ":": "44"
        },

        encodeValue: function (value) {
			var self = this,
				isSequenceOdd = value.length % 2 !== 0, 
				key, 
				matchedValues = [], 
				multipliedValues = [], 
				res = [], 
				multipliedValuesCounter = 0,
				i,
				firstValue,
				secondValue,
				entry;

			for (i = 0; i < value.length; i++) {
				key = value.charAt(i);
				matchedValues[i] = self.encodingTable[key];
			}

			for (i = 0; i < matchedValues.length; i += 2) {
				firstValue = matchedValues[i];

				if ((i + 1) <= matchedValues.length - 1) {
					secondValue = matchedValues[i + 1];
					multipliedValues[multipliedValuesCounter] = toInt(45 * firstValue) + toInt(secondValue);
				}
				else {
					multipliedValues[multipliedValuesCounter] = firstValue;
				}

				multipliedValuesCounter++;
			}

			for (i = 0; i < multipliedValues.length; i++) {
				entry = decimalToBinary(multipliedValues[i]);
				if (isSequenceOdd && i === multipliedValues.length - 1) {
					entry = padLeft(entry, 6);
					res[i] = entry;
				}
				else {
					entry = padLeft(entry, 11);
					res[i] = entry;
				}
			}

			return res.join("");
        }
    });
    QRCodeEncoderFactory.addMode(AlphaNumericQRCodeEncoder);
    // end of alphanumeric code mode


	/////////////////////////////////////////////////////////////////////
	// RENDERING FUNCTIONALITY
	/////////////////////////////////////////////////////////////////////

	// qrcode renderer class
	var QRCodeRenderer = Class.extend({
		
		init: function(options) {
			var self = this,
				style = options.style;

			self.options = options;
			self.size = options.size - style.padding * 2;

			// init the VML stuff if no SVG
			if (!HAS_SVG) {
                if (!doc.namespaces.sqrv) {
					doc.namespaces.add("sqrv", "urn:schemas-microsoft-com:vml", "#default#VML");

					// setup default css
                    doc.createStyleSheet().cssText =
						'sqrv\\:fill, sqrv\\:path, sqrv\\:shape, sqrv\\:stroke' +
						'{ behavior:url(#default#VML); display: inline-block; } ';
                }
			}
		},

		// @proto string all(binaryMatrix)
		// Returns SVG or VML markup for the qrcode
		all: function(binaryMatrix) {
			var self = this,
				size = self.size,
				options = self.options,
				style = options.style,
				pixelWidth = size / binaryMatrix.length,
				customStyle = "",
				rects = [],
				row,
				col
				
				;

			// if any padding in style, add it as margin of the svg element
			if (style.padding) {
				customStyle += "margin:" + style.padding + "px;";
			}

			// form the rects
			for (row = 0; row < binaryMatrix.length; row++) {
				for (col = 0; col < binaryMatrix[row].length; col++) {
					if (binaryMatrix[row][col]) {
						rects.push(
							{
								x: col * pixelWidth,
								y: row * pixelWidth
							}
						);
					}
				}
			}

			

            

			

			// build markup for rendering the matrix
			if (HAS_SVG) {
				return '<svg xmlns="' + SVG_NS + '" version="1.1" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"' + 
					(customStyle ? ' style="' + customStyle + '" ' : '') + '>' + 
					
					'<path d="' + 
						map(rects, function(rect) {
							return "M" + rect.x + " " + rect.y + 
								" L" + (rect.x + pixelWidth) + " " + rect.y + 
								" L" + (rect.x + pixelWidth) + " " + (rect.y + pixelWidth) + 
								" L" + rect.x + " " + (rect.y + pixelWidth) + " z";
						}).join(" ") + 
						'" fill="' + style.color + '" stroke="' + style.color + '" stroke-width="0" />' + 
					'</svg>';
			}
			else {
				// convert the rects to a VML path
				var scale = 10000 / size,
					scaledPixelWidth = toInt(pixelWidth * scale),
					path = map(rects, function(rect) {
						var x = toInt(rect.x * scale),
							y = toInt(rect.y * scale);

						return "m" + x + "," + y + 
							" l" + (x + scaledPixelWidth) + "," + y + "," + 
							(x + scaledPixelWidth) + "," + (y + scaledPixelWidth) + "," + 
							x + "," + (y + scaledPixelWidth);
					}).join(" ") + " e";

				return '<sqrv:shape style="z-index:200; position:absolute; width:' + size + 'px; height:' + size + 'px; display:block; ' + customStyle + '" ' + 
					'coordsize="10000,10000" path="' + path + '" filled="t" fillcolor="' + style.color + '" stroked="f" strokecolor="' + style.color + '" strokeweight="0">' + 
					
					'</sqrv:shape>';
			}
		}
	});

    /////////////////////////////////////////////////////////////////////
    // QRCODE PLUGIN FUNCTIONALITY
    /////////////////////////////////////////////////////////////////////

    // the default configuration options for the qrcode
    var defaults = {
        value: "",			// value to be encoded
        mode: "byte",		// encoding mode - byte, numeric, alphanumeric
        errorLevel: "L",	// L, M, Q, H
        size: 300,			// size of square container element
        style: {
            background: null,	// background style of the container element
            borderColor: null,	// border color style
            borderStyle: null,	// border style
            borderWidth: 0,		// border width
            color: "#000000",	// qrcode color
            padding: 5			// padding 
        }
    };

    // the QRcode class encapsulating the main widget logic
    var QRcode = Widget.extend({
        // initialization method, called by the framework
        init: function (element, userOptions) {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				options = self.options,
				style = options.style,
				value = options.value,
				mode = (options.mode + "").toLowerCase(),
				errorLevel = options.errorLevel,
				dieOnError = options.dieOnError,

				// init the encoder
				matrix,
				encoder = QRCodeEncoderFactory.byMode(mode),

				// init the renderer
				renderer = new QRCodeRenderer(options);

			// style the container element
			$(self.element).css({
				background: style.background,
				borderColor: style.borderColor,
				borderStyle: style.borderStyle,
				borderWidth: style.borderWidth,
				width: options.size,
				height: options.size
			});

            if (!encoder) {
                // error loading qrcode encoder
                error("Invalid qrcode mode: " + mode, dieOnError);
                return;
            }

            // validate the value
            if (!encoder.validate(value)) {
                // invalid value
                error("Invalid qrcode value: " + value, dieOnError);
                return;
            }

            // validate the error level
            if (errorLevel != "L" && errorLevel != "M" && errorLevel != "Q" && errorLevel != "H") {
                // invalid errorLevel
                error("Invalid errorLevel: " + errorLevel, dieOnError);
                return;
            }

            // encode the value and get the binary matrix
            matrix = encoder.encode(value, errorLevel);

            // render the matrix
			$(self.element).html(renderer.all(matrix));
        },

        // destructor
        destroy: function () {
            // clear the contents of the container element
            this.element.empty();
            Widget.fn.destroy.call(this);
        }
    });

    // Set the default options to the QRcode class
    QRcode.defaults = defaults;

    // register the shieldQRcode jQuery plugin
    shield.ui.plugin("QRcode", QRcode);

})(jQuery, shield, this);