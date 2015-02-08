highcharts-axis-labels-shorten
==============================

This is a plugin for Highcharts to shorten labels on x axis and skip some
labels if there are too many of them. When skipping and shortening labels,
the plugin respects font family and font size settings.

**Disclaimer**: This plugin works only for svg rendering.

Usage
=====

Configure x axis to shorten labels. Recommended
to set tick mark placement to 'on' to avoid confusion.

```javascript

xAxis: {
    shortenLabels: true,
    tickmarkPlacement: 'on'
}

```

See `example.html` and `example-many-categories.html` for more details.

Examples
========

![Example with many labels](https://github.com/xbenes/highcharts-axis-labels-shorten/raw/master/screenshots-examples/example-many-labels.png "Example with many labels")
![Example with rotated labels](https://github.com/xbenes/highcharts-axis-labels-shorten/raw/master/screenshots-examples/example-rotated-labels.png "Example with rotated labels")

