"use strict";

// Graph dimensions
const width = 500;
const height = 300;
const margin = {
    top: 30,
    right: 50,
    bottom: 30,
    left: 50
}

// Element references
const svgTime = d3.select("#time_chart");
const svgTot = d3.select("#line_total");
const btnStart = d3.select("button");

// create Time graph elements
const axisContainer = svgTime.append("g");
const xAxis = axisContainer.append("g");
const yAxis = axisContainer.append("g");
const pathContainer = axisContainer.append("g");

// Data variables
let dataJaarinkomen;
let dataInkomsten;
let dataUitgaven;
let data = [
    /*
    {
        profiel: "profile name",
        data: [
            {
                leeftijd: 18,
                total: 
            }
        ]
        // inkomsten: {},
        // uitgaven: {},
    }
    */
];

// Visualisation influencing variables
const startLeeftijd = 18;
const eindLeeftijd = 67
const speed = 2000;
let tickInterval = null;
const colors = ["#ff595e","#ffca3a","#8ac926","#1982c4","#6a4c93"];

// Scales
let xScale = getLinearScale(startLeeftijd, startLeeftijd+1, 0, width - margin.left - margin.right);
let yScale = getLinearScale(1000, 0, 0, height - margin.top - margin.bottom); // min and max of yScale are inverted because the lowest value should appear at the bottom
const lineValues = d3.line()
    .x((d, i) => { return xScale(d.leeftijd /*i + startLeeftijd*/); })
    .y((d) => { return yScale(d.total); });


// retrieve data
(async function () {
    dataJaarinkomen = await d3.csv("data/gemiddeld-persoonlijk-jaarinkomen-per-1000-euro-2017.csv");
    let dataInUit = await d3.json("data/inkomsten-en-uitgaven.json");
    dataInkomsten = dataInUit.inkomsten;
    dataUitgaven = dataInUit.uitgaven;
    btnStart.attr("disabled", null);

    console.log(dataJaarinkomen);
    console.log(dataInkomsten);
    console.log(dataUitgaven);

    // set graph attributes
    initializeGraph();
})();


function initializeGraph() {
    svgTime.attr("viewBox", `0 0 ${width} ${height}`);

    axisContainer.attr("transform", `translate(${margin.left}, ${margin.top})`)
        .style("color", "darkblue");

    xAxis.attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    yAxis.call(d3.axisLeft(yScale));

    //let tempData = getRandomData(getNum(startLeeftijd+1, eindLeeftijd-startLeeftijd), 10000, 150000);
    let tempData = [1000]
    data.push({
        profiel: "testData",
        data: [{
            leeftijd: 18,
            total: 1000
        }]
        //[...tempData]
    })
    data.push({
        profiel: "testData2",
        data: [{
            leeftijd: 18,
            total: 1000
        }]
    })
    data.push({
        profiel: "testData3",
        data: [{
            leeftijd: 18,
            total: 1000
        }]
    })
}


function startVis() {
    if (tickInterval != null) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
    else {
        tick();
        tickInterval = setInterval(tick, speed);
    }
}

let yMin = 0;
let yMax = 0;
function tick() {    

    for (let i = 0; i < data.length; i++) {
        let values = {
            leeftijd: data[i].data[data[i].data.length-1].leeftijd + 1,
            total: getNum(1000, 1000 * (data[i].data.length + 1)),
        }
        data[i].data.push(values)
        yMax = values.total > yMax ? values.total : yMax;
    }
    console.log(data)

    let tempData = data[0].data;

    xAxis.transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .call(d3.axisBottom(xScale.domain([startLeeftijd, tempData.length + startLeeftijd-1])));

    yAxis.transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .call(d3.axisLeft(yScale.domain([yMax, yMin])));

    
    let paths = pathContainer.selectAll("path").data(data);

    let update = paths.transition()
        .duration(speed)
        .ease(d3.easeLinear)
        .attrTween("d", function(d) {
            return pathTween(lineValues(d.data), 1, this)()
        });
    
    let enter = paths.enter()
        .append("path")
            .attr("id", (d) => {return `${d.profiel}`})
            .classed("line", true)
            .attr("d", `M${xScale(0)},${yScale(0)}`)
            .style("stroke", (d, i) => {return colors[i];})
            .transition()
            .duration(speed)
            .ease(d3.easeLinear)
            .attrTween("d", function(d) {
                return pathTween(lineValues(d.data), 1, this)()
            });
}


function getLinearScale(minData, maxData, minRange, maxRange) {
    let scale = d3.scaleLinear()
        .domain([minData, maxData])
        .range([minRange, maxRange]);
    return scale;
}


// Source https://bl.ocks.org/mbostock/3916621, https://stackoverflow.com/questions/47363028/can-the-enter-selection-for-a-line-graph-be-animated
function pathTween(d1, precision, self) {
    return function () {
        let path0 = self,
            path1 = path0.cloneNode(),
            n0 = path0.getTotalLength(),
            n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

        // Uniform sampling of distance based on specified precision.
        let distances = [0],
            i = 0,
            dt = precision / Math.max(n0, n1);
        while ((i += dt) < 1) distances.push(i);
        distances.push(1);

        // Compute point-interpolators at each distance.
        let points = distances.map(function (t) {
            let p0 = path0.getPointAtLength(t * n0),
                p1 = path1.getPointAtLength(t * n1);
            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
        });

        return function (t) {
            return t < 1 ? "M" + points.map(function (p) {
                return p(t);
            }).join("L") : d1;
        };
    };
}


// returns an array with numbers within the given boundaries
function getRandomData(size, minValue, maxValue) {
    let dataArray = [];
    for (let i = 0; i < size; i++) {
        dataArray.push(getNum(minValue, maxValue));
    }
    return dataArray;
}

// returns a random number between and including the min and max values
// used for generating random data for testing or random factors like share increases.
function getNum(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}