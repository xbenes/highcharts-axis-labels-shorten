/**
 * Highcharts plugin for shortening labels on x axis
 *
 * Author: Petr Benes
 * Email: xbenes@centrum.cz
 *
 * Usage: Set shortenLabels:true in the xAxis options
 * to enable shortening and skipping of axis labels
 *
 * Default: false
 */

/* global Highcharts */

(function (H) {
    'use strict';

    /**
     * Split a string by the first occurence of given character
     * Example:
     * splitByFirst('abc.def', '.') returns { prefix: 'abc', suffix: 'def' }
     *
     * @param string string to be split
     * @param chart splitting char
     * @return object with prefix and suffix keys
     */
    var splitByFirst = function(string, char) {
        var index = string.indexOf(char);
        var prefix = string, suffix = '';

        if (index !== -1) {
            prefix = string.substring(0, index);
            suffix = string.substring(index + 1);
        }

        return ({
            prefix: prefix,
            suffix: suffix
        });
    };

    /**
     * Get path specified by string, computed from given object
     * @param object object from which the path is to be extracted
     * @param path path to be extracted
     * @return object at given path or undefined
     */
    var getPath = function(object, path) {
        if (object === undefined) {
            return undefined;
        }

        if (path.length === 0) {
            return object;
        }

        var split = splitByFirst(path, '.');
        return getPath(object[split.prefix], split.suffix);
    };

    var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

   /**
    * Create svg elements, with proper namespace
    * @param tag svg tag to be created, e.g. svg, text, ...
    * @param attrs optional attributes to set
    * @return created element
    */
    var makeSVG = function(tag, attrs) {
        var el = document.createElementNS(SVG_NAMESPACE, tag);
        for (var k in attrs) {
            if (attrs.hasOwnProperty(k)) {
                el.setAttribute(k, attrs[k]);
            }
        }
        return el;
    };

   /**
    * Measure text width/height with given className, in svg
    * @param text text to be measured
    * @param style style string to be applied directly to the element
    * @param className className to apply to use for example correct font
    * @return width and height of the text
    */
    var measureText = function(text, style, className) {
        if (!text || text.length === 0) {
            return {
                height: 0,
                width: 0
            };
        }

        var container = makeSVG('svg');
        document.body.appendChild(container);

        if (className) {
            container.setAttribute('class', className);
        }

        var textSVG = makeSVG('text', {
            x: -1000,
            y: -1000,
            //fill: 'red', // debug
            style: style
        });

        var textNode = document.createTextNode(text);
        textSVG.appendChild(textNode);
        container.appendChild(textSVG);

        var bbox = container.getBBox();
        document.body.removeChild(container);

        return {
            height: bbox.height,
            width: bbox.width
        };
    };

   /**
    * Get shortened text for given width with the measure fn provided
    * and optional className provided
    * @param text text to be shortened
    * @param width width to which the shortened text should fit
    * @param measureFunction function used to measure text
    * @param style style string to be applied directly to the element
    * @param className class name to be assigned for example for specifying font
    * @return text shortened
    */
    var getShortened = function(text, width, measureFunction, style, className) {
        var w,
            short = text,
            shortened = false;

        do {
            w = measureFunction.call(this, short, style, className).width;
            if (w < width) {
                break;
            }

            shortened = true;
            var oneLetterApprox = w/short.length;
            var overlap = w - width;

            var keepChars = Math.max(0,
                    short.length - Math.ceil(overlap / oneLetterApprox) - 3);
            if (keepChars < 1) {
                return '.';
            }

            short = short.substring(0, keepChars);
        } while (true);

        return short + (shortened ? '...' : '');
    };

   /**
    * TextShortener
    * Utility class using the methods to shorten text and use cache in order
    * for not to measure texts again and use cache instead.
    *
    * @see
    * comments of getShortened and measureText for details on particular methods
    */
    var TextShortener = function() {
        this._cache = {};
    };

    TextShortener.prototype = {
        getShortened: function(text, width, style, className) {
            return getShortened.call(this, text, width, this.measureText, style, className);
        },

        measureText: function(text, style, className) {
            var cacheKey = style + '|' + className;

            var classCache = this._cache[cacheKey] =
                this._cache[cacheKey] || {};

            if (classCache[text]) {
                return classCache[text];
            }

            classCache[text] = measureText.call(this, text, style, className);
            return classCache[text];
        }
    };

    var ts = new TextShortener();

    /**
     * Wrap Highcharts Axis inititalization
     */
    H.wrap(H.Axis.prototype, 'init', function(proceed, chart, options) {

        // constants
        var MAX_X_AXIS_HEIGHT = 200,
            LABEL_EXPECTED_WIDTH = 80;

        // treat shortening differently when labels are rotated
        var labelsRotated = options.labels && options.labels.rotation;

        if (!options.isX || !options.shortenLabels) {
            proceed.apply(this, [chart, options]);
            return;
        }

        var customOptions = {};

        options.labels = options.labels || {};
        options.labels.maxStaggerLines = 1;
        options.labels.overflow = false;
        options.labels.formatter = function() {
            // shorten; compute first how many pixels are available to one tick,
            // provided that we have skipped some ticks
            var pixelWidth = labelsRotated ? MAX_X_AXIS_HEIGHT :
                Math.round(this.chart.plotWidth / this.axis.tickPositions.length);

            // shortent text to pixel width using custom helpers
            // Note: this is only svg-compliant, don't care about vml
            return ts.getShortened(this.value, pixelWidth, customOptions.style);
        };
        options.categories = options.categories.map(function(category) {
            return category.replace(/ /g, '\u00A0');
        });

        // run original axis initialize to find what's the font size of labels
        // to be able to correctly configure tick positioner
        proceed.apply(this, [chart, options]);

        // labels can be set in font: '15px Arial' form
        var labelsFontString = getPath(this.options, 'labels.style.font');
        var parsedFont = {};
        if (labelsFontString) {
            var split = splitByFirst(labelsFontString, ' ');
            parsedFont.fontSize = split.prefix;
            parsedFont.fontFamily = split.suffix;
        }

        // extract font family and size for further use
        var fontFamily = parsedFont.fontFamily ||
            getPath(this.options, 'labels.style.fontFamily') ||
            getPath(this.chart, 'userOptions.chart.style.fontFamily') ||
            '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif';

        var fontSize = parsedFont.fontSize ||
            getPath(this.options, 'labels.style.fontSize') || '11px';

        customOptions.style = 'font-size:' + fontSize + ';font-family:' + fontFamily;

        var axisFontSize = parseFloat(fontSize);

        this.options.tickPositioner = function() {
            // label size in pixels
            var perTickWidth = labelsRotated ? 2*axisFontSize : LABEL_EXPECTED_WIDTH,
                ticks = Math.floor(this.chart.plotWidth / perTickWidth);

            // how many ticks we skip to keep them non-overlapping with
            // reasonable label size
            var skip = Math.ceil(this.categories.length / ticks);
            var indices = this.categories.map(function(category, index) {
                return index;
            }).filter(function(idx) {
                return idx % skip === 0;
            });
            return indices;
        };

    });

}(Highcharts));

